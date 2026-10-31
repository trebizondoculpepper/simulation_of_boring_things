import { Group, Vector2 } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import { touchPoint } from '../../controls/input/touch-point';
import { createAqualisCabinet } from '../../components/plant/views/aqualis-cabinet';
import {
  createTrioPainter,
  driveCabinet,
} from '../../components/plant/views/aqualis-painter';
import type { CabinetDriver } from '../../components/plant/views/aqualis-painter';
import { CABINET } from '../../components/plant/logic/aqualis-cabinet';
import {
  displayModel,
  hitDisplay,
  newDisplay,
  pressDisplay,
  tickDisplay,
} from '../../components/plant/logic/aqualis-display';
import type {
  DisplayInputs,
  DisplayState,
} from '../../components/plant/logic/aqualis-display';
import {
  bootFrame as bootFrameOf,
  bootStepAt,
} from '../../components/core/logic/boot-sequence';
import type { PiezoOneShot } from '../../components/sound/logic/piezo-beeps';
import { advise } from '../../../game/plant/aqualis-advisor';
import {
  firstAidSettings,
  withFirstAid,
} from '../../../game/plant/aqualis-first-aid';
import {
  osAdvice,
  osRunning,
  watchdogTripped,
} from '../../../game/plant/aqualis-os';
import { trioAlarms, trioBootScript } from '../../../game/plant/aqualis-world';
import type {
  TrioAction,
  TrioPool,
  TrioState,
} from '../../../game/plant/aqualis-world';
import {
  LOUNGE_TRIO_SITE,
  OLYMPIC_TRIO_SITE,
  TRIO_UNLINKED_PORTS,
  trioCabinetValve,
} from '../../../game/plant/aqualis-schematic';
import type { World } from '../../../game/world';
import type { WorldStore } from '../../save/world-store';
import type { LiveExhibit } from '../rooms/plant/exhibit';

/**
 * A plant room's Dr Aqualis Trio (mission 114), its cabinet bound to its
 * Trio in the world (`world.aqualis`, `aqualis-world.ts`): its screen and
 * display model, Dr Aqualis on his overlay, its knob, power switch and
 * lamps, its sample inlet valve (the world's PLn-CP2-IV1), its sample
 * pump, its piezo and boot beeps, and its crash screens, all as the world
 * has them; its touches and turns dispatched as world actions (`aqualis`,
 * and `plant/valve` for its valve). The pages it shows are its own (view
 * state, started afresh at each boot); everything it is, the world's.
 * Driven each frame as dev58's cabinet is (`driveCabinet`), its screen
 * painted by the same painter, redrawn only when its key changes.
 */

const SITES = { pool_01: LOUNGE_TRIO_SITE, pool_02: OLYMPIC_TRIO_SITE };

/** What a world-bound cabinet reads and sends: its world, and a dispatch. */
export interface TrioWorldPort {
  world(): World;
  dispatch(action: Parameters<WorldStore['dispatch']>[0]): void;
}

export interface TrioWorldHost extends CabinetDriver {
  /** Step its screen's own time (its pages, its boot's beeps) `realDt` real seconds on. */
  step(realDt: number): void;
  screenTouch(x: number, y: number): void;
  screenAimed(x: number, y: number): boolean;
  setSelector(s: TrioState['selector']): void;
  setMainSwitch(on: boolean): void;
  setSampleValve(open: boolean): void;
  trio(): TrioState;
}

/** A Trio's host on the world: what its cabinet shows, worked out once per world step. */
export function createTrioWorldHost(
  pool: TrioPool,
  port: TrioWorldPort,
): TrioWorldHost {
  const valve = trioCabinetValve(SITES[pool]);
  const act = (action: TrioAction) =>
    port.dispatch({ type: 'aqualis', pool, action });
  const trio = () => port.world().aqualis[pool];
  const painter = createTrioPainter();
  let display: DisplayState = newDisplay();
  let clock = 0;
  let beeps: PiezoOneShot[] = [];
  let seenStep = { n: -1, step: '' };
  /** The session its software is in: a new boot, a new session. */
  let session = -1;
  let wasRunning = osRunning(trio().os);

  // What its software shows, from one world step's Trio: worked out once.
  let cachedFor: TrioState | null = null;
  let cached: DisplayInputs | null = null;
  const inputs = (): DisplayInputs => {
    const t = trio();
    if (t === cachedFor && cached) return cached;
    const working = firstAidSettings(t.firstAid, t.settings);
    cachedFor = t;
    cached = {
      readings: t.readings,
      sample: t.sample,
      selector: t.selector,
      channels: t.channels,
      inhibit: t.inhibit,
      // Its advice on its readings alone: it knows the pool only by them.
      advice: osAdvice(
        t.os,
        withFirstAid(advise(t.readings, working, t.channels), {
          state: t.firstAid,
          incident: null,
          ended: null,
        }),
      ),
      alarms: trioAlarms(t),
      settings: t.settings,
      hand: t.hand,
      firstAid: t.firstAid,
    };
    return cached;
  };
  const model = () => displayModel(display, inputs());
  const running = () => osRunning(trio().os);

  return {
    trio,
    step(realDt) {
      clock += realDt;
      const os = trio().os;
      // Its software starts afresh at each boot: its pages, its painter.
      if (os.boots !== session) {
        session = os.boots;
        display = newDisplay();
        painter.reset();
      }
      // Its piezo: a short beep as POST begins, its jingle as its
      // application comes up.
      if (os.boot) {
        const script = trioBootScript(pool, os);
        const step = script ? bootStepAt(script, os.boot.t) : '';
        const before =
          seenStep.n === os.boot.n
            ? seenStep.step
            : os.boot.t <= realDt + 1e-9
              ? ''
              : step;
        if (step === 'post' && before !== 'post') beeps.push('ready');
        seenStep = { n: os.boot.n, step };
      }
      const now = osRunning(os);
      if (now && !wasRunning && seenStep.n >= 0) {
        beeps.push('startup');
        display = newDisplay();
        painter.reset();
      }
      wasRunning = now;
      if (now) display = tickDisplay(display, realDt);
    },
    takeBeeps() {
      const out = beeps;
      beeps = [];
      return out;
    },
    selector: () => trio().selector,
    leds() {
      const t = trio();
      const on = osRunning(t.os);
      return {
        power: t.os.powered,
        dosing:
          t.os.powered &&
          Object.values(t.channels).some((c) => c.delivering > 0),
        alarm:
          (on &&
            (trioAlarms(t).length > 0 ||
              !(port.world().installedValves[valve] ?? true))) ||
          watchdogTripped(t.os),
      };
    },
    powered: () => trio().os.powered,
    booting: () => trio().os.phase === 'booting',
    sampleLh: () => trio().sample.flowLh,
    crashed: () => trio().os.phase === 'crashed',
    os: () => trio().os,
    mainSwitchOn: () => trio().mainSwitch,
    sampleValveOpen: () => port.world().installedValves[valve] ?? true,
    drawScreen: (c) =>
      painter.draw(c, {
        os: trio().os,
        boot: trioBootScript(pool, trio().os),
        model,
        clock,
      }),
    bootFrame() {
      const os = trio().os;
      const script = trioBootScript(pool, os);
      return os.boot && script ? bootFrameOf(script, os.boot.t) : null;
    },
    doctorShown: () => running() && model().page === 'doctor',
    drawDoctor: (c, w, h) => painter.drawDoctor(c, w, h, model(), clock),
    screenTouch(x, y) {
      // Off, booting or crashed, its software takes no touches.
      if (!running()) return;
      act({ act: 'touch' });
      const ins = inputs();
      const id = hitDisplay(display, ins, x, y);
      if (!id) return;
      const r = pressDisplay(display, ins, id);
      display = r.state;
      const e = r.effect;
      if (e?.kind === 'settings')
        act({ act: 'settings', settings: e.settings });
      if (e?.kind === 'hand')
        act({ act: 'hand', channel: e.channel, demand: e.demand });
      if (e?.kind === 'first-aid-start')
        act({ act: 'firstAid', programme: e.id });
      if (e?.kind === 'first-aid-stop')
        act({ act: 'firstAid', programme: null });
      if (e?.kind === 'restart') act({ act: 'restart' });
    },
    screenAimed: (x, y) =>
      running() && hitDisplay(display, inputs(), x, y) !== null,
    setSelector: (s) => act({ act: 'selector', selector: s }),
    setMainSwitch: (on) => act({ act: 'mainSwitch', on }),
    setSampleValve: (open) =>
      port.dispatch({ type: 'plant/valve', id: valve, open }),
  };
}

/**
 * A plant room's Trio as a live exhibit: its cabinet, its back's middle
 * on the item's back (the item's frame is its footprint's middle), bound
 * to its Trio in the world. Its touchables are its uses; a touch on its
 * screen finds where it landed (`touchPoint`).
 */
export function createRoomTrio(
  kit: PanelKit,
  pool: TrioPool,
  port: TrioWorldPort | null,
): LiveExhibit {
  const host = port ? createTrioWorldHost(pool, port) : null;
  const cabinet = createAqualisCabinet(
    kit,
    {
      screenTouch: (x, y) => host?.screenTouch(x, y),
      screenAimed: (x, y) => host?.screenAimed(x, y) ?? false,
      selector: (s) => host?.setSelector(s),
      sampleValve: (open) => host?.setSampleValve(open),
      power: (on) => host?.setMainSwitch(on),
    },
    'trio',
    undefined,
    // Its CO₂ gland blanked until CO₂ dosing exists.
    { blanked: [...TRIO_UNLINKED_PORTS] as 'co2'[] },
  );
  const holder = new Group();
  cabinet.group.position.z = -CABINET.d / 2;
  holder.add(cabinet.group);
  const parts = createPartSet();
  const touch = (o: Object3D) => (direction?: number) => {
    const tp = touchPoint(o);
    cabinet.touch(
      o,
      tp && Number.isFinite(tp.u) ? new Vector2(tp.u, tp.v) : undefined,
      direction ?? 1,
    );
  };
  cabinet.setDoorOpen(true);
  for (const t of cabinet.touchables)
    t.traverse((o) => parts.uses.set(o, touch(o)));
  cabinet.setDoorOpen(false);
  if (host) cabinet.setSelector(host.selector());
  let beeperCrash: unknown = null;
  return {
    object: holder,
    parts,
    update(delta) {
      if (!host) return;
      host.step(delta);
      beeperCrash = driveCabinet(cabinet, host, beeperCrash);
      cabinet.update(delta);
    },
    status() {
      if (!host) return '';
      const t = host.trio();
      const phase =
        t.os.phase === 'running'
          ? t.selector.toUpperCase()
          : t.os.phase.toUpperCase();
      return t.os.powered ? phase : 'OFF';
    },
    dispose() {
      cabinet.dispose();
    },
  };
}

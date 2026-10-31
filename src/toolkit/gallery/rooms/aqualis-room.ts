import {
  RIG_SCENARIOS,
  RIG_SCENARIO_IDS,
  newRig,
  resetWater,
  rigFlow,
  rigPorts,
  rigSample,
  setDeviceMode,
  setSampleFlow,
  stepRig,
  RIG_POOL,
} from '../../../game/plant/aqualis-rig';
import type {
  DeviceMode,
  Rig,
  RigScenarioId,
} from '../../../game/plant/aqualis-rig';
import { DEFAULT_TARGETS, SCREEN } from '../../../game/plant/aqualis-types';
import {
  defectsAt,
  defectsKey,
} from '../../components/plant/logic/lcd-defects';
import { drawDefects } from '../../components/plant/views/lcd-defects';
import type {
  Advice,
  Alarm,
  AqualisReadings,
  AqualisSettings,
  ChannelFeedback,
  ChannelId,
  SampleStatus,
  Selector,
} from '../../../game/plant/aqualis-types';
import { newSampler, stepSampler } from '../../../game/plant/aqualis-sampler';
import type { SamplerState } from '../../../game/plant/aqualis-sampler';
import {
  newController,
  stepController,
} from '../../../game/plant/aqualis-controller';
import type {
  ControllerOutput,
  ControllerState,
} from '../../../game/plant/aqualis-controller';
import { advise, alarms } from '../../../game/plant/aqualis-advisor';
import type { LedState } from '../../components/plant/logic/aqualis-cabinet';
import {
  DOCTOR,
  TRIO_BOOT_APP,
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
import { drAqualisPose } from '../../components/plant/logic/dr-aqualis';
import type { DrAqualisFrame } from '../../components/plant/logic/dr-aqualis';
import {
  drawAqualisScreen,
  drawTrioMark,
} from '../../components/plant/views/aqualis-screens';
import {
  bootFrame,
  bootScript,
} from '../../components/core/logic/boot-sequence';
import type {
  BootFrame,
  BootScript,
} from '../../components/core/logic/boot-sequence';
import { drawBootPicture } from '../../components/core/views/boot-screens';
import type { BootDrawOptions } from '../../components/core/views/boot-screens';
import {
  drawDrAqualis,
  drawSpeechBubble,
} from '../../components/plant/views/dr-aqualis';
import {
  crashOs,
  newOs,
  osAdvice,
  osAlarms,
  osOutputs,
  osRunning,
  powerOs,
  restartOs,
  stepOs,
  touchOs,
  watchdogTripped,
} from '../../../game/plant/aqualis-os';
import type {
  CrashKind,
  OsState,
  Outputs,
} from '../../../game/plant/aqualis-os';
import {
  stopKey,
  stopMoment,
  stopScreen,
} from '../../components/core/logic/stop-screen';
import type {
  StopOutcome,
  StopScreen,
} from '../../components/core/logic/stop-screen';
import { drawStopScreen } from '../../components/core/views/stop-screen';
import {
  glitchMoment,
  glitchPlan,
} from '../../components/core/logic/lcd-glitch';
import { drawLcdGlitch } from '../../components/core/views/lcd-glitch';
import { OVERLAY } from '../../components/plant/logic/aqualis-cabinet';

/**
 * Dev58's host (mission 114): everything the room shows and works, behind
 * one object, so the room is only layout and touches. It runs the test rig
 * (`aqualis-rig.ts`) and the Dr Aqualis Trio on it: the sampler reads the
 * rig's water, the controller drives the rig's devices through their ports
 * on the chemistry's 10 s tick, the advisor gives Dr Aqualis his advice and
 * the cabinet its alarms, and the display model draws the screen, redrawn
 * only when its page's key (or, on his page, his pose) changes.
 *
 * The cabinet's computer (`aqualis-os.ts`) boots (`core/logic/boot-sequence.ts`,
 * the gui family, its application the Trio's software) when the room loads,
 * when its supply comes back (after a power cut, so its OS offers its
 * recovery menu) and when Restart is pressed on Settings › Pool dynamics.
 * While it is off or booting its software is not running: the screen shows
 * the boot (or nothing) and takes no touches, Dr Aqualis is hidden, and the
 * controller is not stepped, so the host sends the dosing units zero
 * demands (the rig and the sampler run on, and the knob still turns). The
 * software starts afresh: a new controller (its integral lost, as a real
 * reboot loses its memory) and a new display, its settings kept (they are
 * the cabinet's stored configuration).
 *
 * Dev58's crash board crashes it (`crash`), its watchdog working or not
 * (`setWatchdog`): a stop crash's blue screen (`drawStopScreen`, redrawn on
 * its `stopKey`) while its outputs hold; a glitch's wreckage
 * (`drawLcdGlitch`) over a copy of the last good frame, Dr Aqualis drawn
 * into it, redrawn on each `glitchMoment`, while its outputs jump on each
 * burst. Only the supply, off and on, brings it back.
 */

/** Seconds from a crash board button to the crash. */
export const CRASH_COUNTDOWN = 5;

/** The world step the sampler and controller take, s (the rig's tick). */
const TICK = 10;
/** The most ticks a frame may take (1000× at a slow frame). */
const MOST_TICKS = 400;

/** How the Trio's boot screens draw its mark. */
export const TRIO_BOOT_DRAW: BootDrawOptions = { appMark: drawTrioMark };

/** The time-speed knob's settings: world seconds per real second. */
export const SPEEDS = [1, 10, 100, 1000] as const;
export const SPEED_LEGEND = '1× · 10× · 100× · 1000×';

/** Each dosing unit's own selector, left to right as engraved. */
export const DEVICE_MODES: readonly DeviceMode[] = ['remote', 'manual', 'off'];
export const DEVICE_LEGEND = 'REMOTE · MANUAL · OFF';

/** The crash board's watchdog switch, left to right as engraved. */
export const WATCHDOG_LEGEND = 'WORKS · FAILS';

export interface AqualisRoomHost {
  readonly rig: Rig;
  readonly scenarios: readonly {
    id: RigScenarioId;
    name: string;
    description: string;
  }[];
  scenario(): RigScenarioId;
  /** Put the pool's water to a scenario's (the loop and devices as they are). */
  chooseScenario(id: RigScenarioId): void;
  /** Index into `SPEEDS`. */
  speed(): number;
  setSpeed(index: number): void;
  /** The cabinet's knob. */
  selector(): Selector;
  setSelector(s: Selector): void;
  deviceMode(id: ChannelId): DeviceMode;
  setDeviceMode(id: ChannelId, mode: DeviceMode): void;
  /** What each device reports through its control port (null unconnected). */
  feedback(id: ChannelId): ChannelFeedback | null;
  sampleValve(open: boolean): void;
  /** The sample's flow through the cabinet, l/h. */
  sampleLh(): number;
  /** The loop's flow, m³/h, and whether its pump runs. */
  flowM3h(): number;
  pumpRunning(): boolean;
  /** The cabinet's lamps now. */
  leds(): LedState;
  /** Step the rig `realDt` real seconds on, at the speed set. */
  step(realDt: number): void;
  /** Draw the cabinet's screen if it needs it: whether it drew. */
  drawScreen(c: CanvasRenderingContext2D): boolean;
  /** Whether Dr Aqualis is on show (his page). */
  doctorShown(): boolean;
  /** Draw Dr Aqualis on his overlay (pre-scaled to the box's pixels) if his pose changed: whether it drew. */
  drawDoctor(c: CanvasRenderingContext2D, w: number, h: number): boolean;
  /** A touch on the cabinet's screen, in its pixels. */
  screenTouch(x: number, y: number): void;
  /** Whether the cabinet has its supply. */
  powered(): boolean;
  /** Switch its supply: back on, it boots, as after a power cut. */
  setPower(on: boolean): void;
  /** Whether it is booting (its software not yet running). */
  booting(): boolean;
  /** Boot it again, as Restart does (an orderly restart). */
  restart(): void;
  /** What its boot shows now, or null when it is not booting. */
  bootFrame(): BootFrame | null;
  /** Its computer's state. */
  os(): OsState;
  /** Crash it now (the crash board's buttons), its watchdog as switched. */
  crash(kind: CrashKind): void;
  /** Whether it is crashed (the board's CRASHED lamp). */
  /** Seconds until a crash the board has asked for, or null. */
  crashIn(): number | null;
  crashed(): boolean;
  /** The crash board's WATCHDOG WORKS · FAILS switch: whether the next crash's watchdog works. */
  watchdog(): boolean;
  setWatchdog(works: boolean): void;
  /** Whether the watchdog has raised CONTROLLER FAULT. */
  controllerFault(): boolean;
  /** Its alarm contacts now (to an annunciator). */
  alarms(): Alarm[];
  /** Its advice now (Dr Aqualis's). */
  advice(): Advice[];
  /** What its control ports send each dosing unit now, 0 to 1. */
  outputs(): Outputs;
}

export interface AqualisHostOptions {
  /** Boot when the room loads (`&boot=skip` leaves it running). */
  boot?: boolean;
  /** Its first boot begun this many seconds ago (`&boot=20`, to look at a later moment). */
  bootAt?: number;
  /** The machine's seed: its boots' small differences. */
  seed?: number;
  /** Crash once it has run `crashAfter` seconds (`&crash=stop|glitch`). */
  crash?: CrashKind;
  crashAfter?: number;
  /** The crash board's watchdog switch to begin with (`&watchdog=works|fails`). */
  watchdog?: boolean;
  /** How a stop screen ends: dev58's hang until power-cycled, by default. */
  stopOutcome?: StopOutcome['kind'];
  /** Its boots show the permission dialog (`&consent=on`): a scenario's option, off normally. */
  consent?: boolean;
}

/** A canvas to keep the last good frame in, where there is a DOM. */
function frameCopy(w: number, h: number) {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    return ctx
      ? { canvas, ctx: ctx as unknown as CanvasRenderingContext2D }
      : null;
  }
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  return ctx ? { canvas, ctx } : null;
}

export function createAqualisRoomHost(
  scenario: RigScenarioId = 'good',
  options: AqualisHostOptions = {},
): AqualisRoomHost {
  let rig = newRig(scenario);
  let speed = 1;
  let sel: Selector = 'auto';
  let valveOpen = true;
  let drawn = '';
  let settings: AqualisSettings = {
    dynamics: { volumeM3: RIG_POOL.volumeM3, flowM3h: RIG_POOL.flowM3h },
    targets: DEFAULT_TARGETS,
  };
  let hand: Record<ChannelId, number> = { hypochlorite: 0, acid: 0, co2: 0 };
  let sampler: SamplerState = newSampler(rigSample(rig));
  let control: ControllerState = newController();
  let readings: AqualisReadings | null = null;
  let sample: SampleStatus = { flowing: true, flowLh: 0, lostFor: 0 };
  let out: ControllerOutput | null = null;
  let advice: Advice[] = [];
  let alarmsOn: Alarm[] = [];
  let display: DisplayState = newDisplay();
  let doctor: DrAqualisFrame | null = null;
  let doctorDrawn = '';
  let owed = 0;
  let clock = 0;
  /** The cabinet's computer: its supply, its boot, its crashes. Running for its first view of the plant. */
  let os: OsState = newOs();
  const seed = options.seed ?? 58;
  /** The boot script of the boot under way (or the last), built once per boot. */
  let bootN = -1;
  let boot: BootScript = bootScript('gui', {
    seed,
    app: TRIO_BOOT_APP,
    consent: options.consent,
  });
  const bootNow = (): BootScript => {
    const b = os.boot;
    if (b && b.n !== bootN) {
      bootN = b.n;
      boot = bootScript('gui', {
        seed: seed + b.n * 7919,
        app: TRIO_BOOT_APP,
        unclean: b.unclean,
        consent: options.consent,
      });
    }
    return boot;
  };
  const running = () => osRunning(os);
  const NO_DEMAND: Outputs = { hypochlorite: 0, acid: 0, co2: 0 };
  // The crash board: its watchdog switch, the next crash's number, and
  // what the screen showed as it crashed.
  let watchdog = options.watchdog ?? true;
  let crashes = 0;
  let pendingCrash: { kind: CrashKind; after: number } | null = options.crash
    ? { kind: options.crash, after: Math.max(0, options.crashAfter ?? 2) }
    : null;
  let stopShown: StopScreen | null = null;
  let wreck: ReturnType<typeof frameCopy> = null;
  /** Whether the screen's canvas holds a good frame of its software's. */
  let goodOnScreen = false;
  let doctorAtCrash = false;
  let doctorCanvas: CanvasImageSource | null = null;

  /** The controller's step on the sample now (dt 0: its view, nothing integrated). */
  const controlNow = (dt: number) =>
    stepController(
      control,
      { readings, sample, selector: sel, ports: rigPorts(rig), settings, hand },
      dt,
    );

  /** One chemistry tick of the cabinet: sample, control, advise. */
  const tick = () => {
    const s = stepSampler(sampler, rigSample(rig), TICK);
    sampler = s.state;
    readings = s.readings;
    sample = s.status;
    if (!running()) {
      // Its software is not running: off or booting, nothing is asked of
      // the dosing units; crashed, they get whatever its crash sends.
      rig = stepRig(rig, osOutputs(os, NO_DEMAND), TICK);
      return;
    }
    const c = controlNow(TICK);
    control = c.state;
    out = c.out;
    advice = advise(readings, settings, out.channels, rig.water);
    alarmsOn = alarms(readings, sample, out.channels, settings, sel);
    rig = stepRig(rig, out.demands, TICK);
  };
  tick();

  /** Its software starts afresh on each boot: a new controller and display, nothing yet to say. */
  const freshSoftware = () => {
    drawn = '';
    doctorDrawn = '';
    goodOnScreen = false;
    stopShown = null;
    wreck = null;
    alarmsOn = [];
    advice = [];
    control = newController();
    display = newDisplay();
  };
  /** Its software running: its first view of the plant, then its first page. */
  const booted = () => {
    drawn = '';
    const c = controlNow(0);
    control = c.state;
    out = c.out;
    advice = advise(readings, settings, out.channels, rig.water);
    alarmsOn = alarms(readings, sample, out.channels, settings, sel);
    display = newDisplay();
  };
  if (options.boot !== false) {
    // Its first boot, as the room loads: a clean one, the first of its seed.
    os = newOs({ booting: true, bootAt: options.bootAt ?? 0 });
    freshSoftware();
  }

  const inputs = (): DisplayInputs => ({
    readings,
    sample,
    selector: sel,
    channels: out!.channels,
    inhibit: out!.inhibit,
    advice: osAdvice(os, advice),
    alarms: osAlarms(os, alarmsOn),
    settings,
    hand,
  });
  /** What its software would draw (as it crashed, for a glitch's wreckage). */
  const drawGood = (
    c: CanvasRenderingContext2D,
    m = displayModel(display, inputs()),
  ) => {
    // Dr Aqualis himself is on his overlay (`drawDoctor`), so his frames
    // upload a small canvas, not the whole screen.
    drawAqualisScreen(c, m, {
      bubble: (ctx, text, box, tail) =>
        drawSpeechBubble(ctx, text.split('\n'), box, tail, {
          title: 'Dr Aqualis says',
          fontPx: 19,
        }),
    });
  };

  const crashNow = (kind: CrashKind) => {
    if (os.phase !== 'running' && os.phase !== 'booting') return;
    doctorAtCrash =
      running() && displayModel(display, inputs()).page === 'doctor';
    if (!goodOnScreen && running() && out) {
      // Nothing good drawn yet: what it would have shown is the wreck's source.
      wreck = frameCopy(SCREEN.w, SCREEN.h);
      if (wreck) drawGood(wreck.ctx);
    } else wreck = null;
    os = crashOs(os, {
      kind,
      seed: seed * 31 + ++crashes * 104729,
      watchdog,
      demands: running() && out ? out.demands : NO_DEMAND,
      outcome: options.stopOutcome ?? 'hang',
    });
    drawn = '';
    stopShown = null;
    pendingCrash = null;
  };

  /** The glitch's wreckage over the last good frame, with Dr Aqualis in it. */
  const drawGlitch = (
    c: CanvasRenderingContext2D,
    crashSeed: number,
    t: number,
  ) => {
    const g = glitchMoment(crashSeed, t);
    const key = `glitch:${crashSeed}:${g.key}`;
    if (key === drawn) return false;
    if (!drawn.startsWith('glitch:')) {
      // The crash's first frame: keep the screen as it was, Dr Aqualis drawn in.
      if (!wreck) {
        wreck = frameCopy(SCREEN.w, SCREEN.h);
        if (wreck) wreck.ctx.drawImage(c.canvas, 0, 0);
      }
      if (wreck && doctorAtCrash && doctorCanvas)
        wreck.ctx.drawImage(
          doctorCanvas,
          OVERLAY.x,
          OVERLAY.y,
          OVERLAY.w,
          OVERLAY.h,
        );
    }
    drawn = key;
    goodOnScreen = false;
    drawLcdGlitch(
      c,
      wreck?.canvas ?? c.canvas,
      glitchPlan(crashSeed, g.burst, g.frame, SCREEN),
    );
    return true;
  };

  return {
    get rig() {
      return rig;
    },
    scenarios: RIG_SCENARIO_IDS.map((id) => ({
      id,
      name: RIG_SCENARIOS[id].name,
      description: RIG_SCENARIOS[id].description,
    })),
    scenario: () => rig.scenario,
    chooseScenario(id) {
      rig = resetWater(rig, id);
    },
    speed: () => speed,
    setSpeed(i) {
      speed = Math.max(0, Math.min(SPEEDS.length - 1, i));
    },
    selector: () => sel,
    setSelector(s) {
      sel = s;
    },
    deviceMode: (id) => rig.devices[id].mode,
    setDeviceMode(id, mode) {
      rig = setDeviceMode(rig, id, mode);
    },
    feedback: (id) => rigPorts(rig)[id],
    sampleValve(open) {
      valveOpen = open;
      rig = setSampleFlow(rig, open ? RIG_POOL.sampleFlowLh : 0);
    },
    sampleLh: () => rigSample(rig).flowLh,
    flowM3h: () => rigFlow(rig),
    pumpRunning: () => rig.pump.running,
    leds: () => ({
      power: os.powered,
      dosing:
        os.powered && Object.values(rig.devices).some((d) => d.delivering > 0),
      // Its alarms died with it, unless the watchdog raised CONTROLLER FAULT.
      alarm:
        (running() && (alarmsOn.length > 0 || !valveOpen)) ||
        watchdogTripped(os),
    }),
    step(realDt) {
      owed += realDt * SPEEDS[speed];
      let n = 0;
      while (owed >= TICK && n++ < MOST_TICKS) {
        owed -= TICK;
        tick();
      }
      if (n >= MOST_TICKS) owed = 0;
      // The screen runs on real time: its boot, its cycle, its crash and Dr Aqualis.
      clock += realDt;
      const r = stepOs(os, realDt, os.boot ? bootNow().total : 0);
      os = r.os;
      if (r.event === 'booted') booted();
      if (r.event === 'rebooting') freshSoftware();
      if (running()) {
        display = tickDisplay(display, realDt);
        if (pendingCrash) {
          pendingCrash.after -= realDt;
          if (pendingCrash.after <= 0) crashNow(pendingCrash.kind);
        }
      }
    },
    drawScreen(c) {
      // Off, its backlight is out (the cabinet's `setPower`): nothing to draw.
      if (!os.powered) return false;
      if (os.boot) {
        const f = bootFrame(bootNow(), os.boot.t);
        const key = `boot:${f.pictureKey}`;
        if (key === drawn) return false;
        drawn = key;
        goodOnScreen = false;
        drawBootPicture(c, f, SCREEN.w, SCREEN.h, TRIO_BOOT_DRAW);
        return true;
      }
      const crash = os.crash;
      if (crash?.kind === 'stop') {
        stopShown ??= stopScreen(crash.seed, {
          outcome: crash.outcome ?? 'hang',
        });
        const key = `stop:${stopKey(stopShown, crash.t)}`;
        if (key === drawn) return false;
        drawn = key;
        goodOnScreen = false;
        drawStopScreen(c, stopMoment(stopShown, crash.t));
        return true;
      }
      if (crash?.kind === 'glitch') return drawGlitch(c, crash.seed, crash.t);
      const m = displayModel(display, inputs());
      const faults = defectsAt(clock, SCREEN.w, SCREEN.h);
      const key = m.key + defectsKey(faults);
      if (key === drawn) return false;
      drawn = key;
      drawGood(c, m);
      drawDefects(c, faults);
      goodOnScreen = true;
      return true;
    },
    doctorShown: () =>
      running() && displayModel(display, inputs()).page === 'doctor',
    drawDoctor(c, w, h) {
      doctorCanvas = c.canvas;
      const a = displayModel(display, inputs()).doctor.advice;
      const box = DOCTOR.him;
      doctor = drAqualisPose(a?.mood ?? 'idle', clock, doctor, {
        box,
        target: { x: DOCTOR.bubble.x + 40, y: DOCTOR.bubble.y + 60 },
      });
      if (doctor.key === doctorDrawn) return false;
      doctorDrawn = doctor.key;
      c.clearRect(0, 0, w, h);
      drawDrAqualis(c, doctor.pose, { x: 0, y: 0, w: box.w, h: box.h });
      return true;
    },
    screenTouch(x, y) {
      // Off, booting or crashed, its software takes no touches.
      if (!running()) return;
      // The apology, once the screen is touched, has been read.
      os = touchOs(os);
      const ins = inputs();
      const id = hitDisplay(display, ins, x, y);
      if (!id) return;
      const r = pressDisplay(display, ins, id);
      display = r.state;
      if (r.effect?.kind === 'settings') settings = r.effect.settings;
      if (r.effect?.kind === 'hand')
        hand = { ...hand, [r.effect.channel]: r.effect.demand };
      if (r.effect?.kind === 'restart') {
        os = restartOs(os);
        freshSoftware();
      }
    },
    powered: () => os.powered,
    setPower(on) {
      if (on === os.powered) return;
      os = powerOs(os, on);
      freshSoftware();
    },
    booting: () => os.phase === 'booting',
    restart() {
      if (!running()) return;
      os = restartOs(os);
      freshSoftware();
    },
    bootFrame: () => (os.boot ? bootFrame(bootNow(), os.boot.t) : null),
    os: () => os,
    crash(kind) {
      // The board's buttons crash it after a countdown (the owner,
      // 2026-10-31), so whoever pressed one can turn to watch.
      pendingCrash = { kind, after: CRASH_COUNTDOWN };
    },
    crashIn: () => (pendingCrash ? Math.max(0, pendingCrash.after) : null),
    crashed: () => os.phase === 'crashed',
    watchdog: () => watchdog,
    setWatchdog(works) {
      watchdog = works;
    },
    controllerFault: () => watchdogTripped(os),
    alarms: () => osAlarms(os, alarmsOn),
    advice: () => osAdvice(os, advice),
    outputs: () => osOutputs(os, running() && out ? out.demands : NO_DEMAND),
  };
}

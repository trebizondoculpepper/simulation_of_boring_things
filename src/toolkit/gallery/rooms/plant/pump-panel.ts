import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../../components/core/views/eighties-controls';
import { tools } from '../../../components/core/views/fitting-tools';
import {
  mushroomStop,
  pilotLight,
  pushButton,
  selector,
} from '../../../components/core/parts/parts';
import {
  TRI_STATES,
  triStateIndicator,
} from '../../../components/core/parts/panel-indicators';
import { createControlCubicle } from '../../../components/industrial-control/views/control-cubicle';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import { currentPlant } from './live-plant';
import type { PoolId } from '../../../../game/plant/pools';
import type { PlantReading } from '../../logic/control-room-demo';
import { MAIN_POOL_MIMIC, mainPoolState } from '../../logic/pool-mimics';
import {
  LOUNGE_VALVE_MIMIC,
  loungeValveMimicState,
} from '../../logic/lounge-valve-mimic';
import { LOUNGE_VALVES } from '../../../../game/plant/lounge-valves';
import { roomWorld } from '../../../save/world-store';
import type { PumpsShown } from '../../logic/pool-mimics';
import { MOTORS, POOL_MOTORS } from '../../../../game/plant/motor-starters';
import type {
  MotorTag,
  StarterMode,
} from '../../../../game/plant/motor-starters';
import type { World } from '../../../../game/world';

/**
 * The filter pumps' local control panel, in its plant room: each pump's
 * starter in the world (`game/plant/motor-starters.ts`) shown and worked
 * here, as on the control room's main pool board, which works the same
 * starters (no LOCAL · REMOTE: both boards are the one world's). HAND ·
 * OFF · AUTO on each pump's door, with its RESET; START and STOP on the
 * mimic, which count in AUTO; the panel's emergency stop stops both.
 */

const PUMP_IDS = ['p1', 'p2'] as const;
type PumpId = (typeof PUMP_IDS)[number];
const MODES: readonly StarterMode[] = ['hand', 'off', 'auto'];

/** The world, where there is a page to keep it (not in tests). */
const store = () => (typeof window === 'undefined' ? null : roomWorld());

/** A pool's pumps' starters, duty (p1) then standby (p2); none for a pool without them. */
const tagsOf = (pool: PoolId): Partial<Record<PumpId, MotorTag>> => {
  const [p1, p2] = POOL_MOTORS(pool);
  return p1 && p2 ? { p1, p2 } : {};
};

/** What a pump's starter shows: 0 running, 1 stopped, 2 tripped. */
const shownOf = (w: World, tag: MotorTag): 0 | 1 | 2 => {
  const s = w.motors.starters[tag];
  return s.tripped ? 2 : s.running ? 0 : 1;
};

/** What the pumps do now, for the mimics: their starters', else as the reading has them. */
export function pumpsShown(
  reading: PlantReading,
  pool: PoolId = 'pool_02',
): PumpsShown {
  const w = store()?.world.value;
  const tags = tagsOf(pool);
  const at = (id: PumpId): 0 | 1 | 2 => {
    const tag = tags[id];
    if (w && tag) return shownOf(w, tag);
    return reading.alarms.includes(`${id}-trip` as never)
      ? 2
      : reading.pumps[id]
        ? 0
        : 1;
  };
  return { p1: at('p1'), p2: at('p2') };
}

/** A mimic button's id, "p1-start", as its command to the pump's starter. */
export function pressPump(id: string, pool: PoolId = 'pool_02') {
  const [pump, verb] = id.split('-') as [PumpId, string];
  const tag = tagsOf(pool)[pump];
  if (!tag || (verb !== 'start' && verb !== 'stop')) return;
  store()?.dispatch({
    type: 'motor/starter',
    tag,
    action: { act: verb },
  });
}

/** A seven-segment ammeter in its bezel, reading a motor's current. */
function ammeter(kit: PanelKit, parent: Group, x: number, y: number) {
  const t = tools(kit);
  t.box(parent, t.paint('#141516', 0.4), 0.13, 0.07, 0.01, x, y, 0.005);
  const digits = createSevenSegment(kit, 4, { digitHeight: 0.024 });
  digits.group.position.set(x, y + 0.004, 0.011);
  digits.group.traverse((o) => (o.userData.live = true));
  parent.add(digits.group);
  const label = createMicroLabel(kit, 'AMPS', {
    height: 0.009,
    ink: '#f2f1ea',
  });
  label.position.set(x, y - 0.026, 0.0105);
  parent.add(label);
  return digits;
}

/** The filter pumps' local control panel, showing `pool`'s plant. */
export const pumpPanelExhibit = (pool: PoolId = 'pool_02'): PlantExhibit => ({
  title: 'Local control panel: filter pumps',
  reference:
    'Penfold Controls cubicle (RAL 7035) after Benfield’s: the main pool mimic on its top panel; tri-state indicators, ammeters, HAND · OFF · AUTO and LOCAL · REMOTE below',
  size: { w: 2.7, d: 0.6, h: 2.45, mount: 'floor' },
  build(kit): LiveExhibit {
    const cubicle = createControlCubicle(kit, {
      width: 2.6,
      height: 2.35,
      doors: 3,
      fascia: 1.3,
    });
    cubicle.group.position.z = 0.25;
    const parts = cubicle.parts;
    const world = store();
    const tags = tagsOf(pool);
    const mimic = createMimicBoard(
      kit,
      pool === 'pool_01' ? LOUNGE_VALVE_MIMIC : MAIN_POOL_MIMIC,
      {
        maker: 'penfold',
        press: (id) => {
          const [assetId, verb] = id.split('/');
          if (
            pool === 'pool_01' &&
            LOUNGE_VALVES.some((valve) => valve.assetId === assetId)
          ) {
            world?.dispatch({
              type: 'plant/valve',
              id: assetId,
              open: verb === 'open',
            });
          } else pressPump(id, pool);
        },
      },
    );
    cubicle.fasciaFace.add(mimic.group);
    for (const [object, use] of mimic.parts.uses) parts.uses.set(object, use);
    // A door for each pump: its indicator, its ammeter, its selector and
    // its RESET, its starter's in the world.
    const pumps = PUMP_IDS.map((id, i) => {
      const tag = tags[id];
      const face = cubicle.doors[i].face;
      const state = signal<number | null>(1);
      const indicator = triStateIndicator(kit, {
        lamps: TRI_STATES.motor,
        state,
        title: tag
          ? `${tag} ${MOTORS[tag].role === 'duty' ? 'DUTY' : 'STANDBY'}`
          : `FILTER PUMP ${i + 1}`,
      });
      indicator.group.position.set(-0.12, 0.2, 0);
      face.add(indicator.group);
      for (const lamp of indicator.lamps) parts.add(lamp);
      const amps = ammeter(kit, face, 0.13, 0.21);
      const hoa = parts.add(
        selector(kit, {
          positions: 3,
          initial: 2,
          ...(world && tag
            ? {
                bound: {
                  get value() {
                    return MODES.indexOf(
                      world.world.value.motors.starters[tag].mode,
                    );
                  },
                  set: (k: number) =>
                    world.dispatch({
                      type: 'motor/starter',
                      tag,
                      action: { act: 'mode', mode: MODES[k] },
                    }),
                },
              }
            : {}),
          legend: 'HAND · OFF · AUTO',
          name: `${tag ?? `P${i + 1}`} HAND OFF AUTO`,
        }),
      );
      hoa.object.position.set(-0.12, 0.0, 0);
      face.add(hoa.object);
      const reset = parts.add(
        pushButton(kit, {
          colour: 'blue',
          legend: 'RESET',
          name: `${tag ?? `P${i + 1}`} RESET`,
          action: () =>
            tag &&
            world?.dispatch({
              type: 'motor/starter',
              tag,
              action: { act: 'reset' },
            }),
        }),
      );
      reset.object.position.set(0.13, 0.0, 0);
      face.add(reset.object);
      return { id, tag, state, amps };
    });
    // The third door: the supply lamp and the emergency stop, which stops
    // both pumps until it is released.
    const face = cubicle.doors[2].face;
    const supply = parts.add(
      pilotLight(kit, {
        colour: 'white',
        legend: 'SUPPLY ON',
        name: 'Supply on lamp',
      }),
    );
    supply.object.position.set(0.22, 0.2, 0);
    face.add(supply.object);
    const started = pool === 'pool_01' || pool === 'pool_02' ? pool : null;
    const stop = parts.add(
      mushroomStop(kit, {
        name: 'Pumps emergency stop',
        ...(world && started
          ? {
              bound: {
                get value() {
                  return world.world.value.motors.stopped[started];
                },
                set: (stopped: boolean) =>
                  world.dispatch({
                    type: 'motor/stop',
                    pool: started,
                    stopped,
                  }),
              },
            }
          : {}),
      }),
    );
    stop.object.position.set(0.12, -0.02, 0);
    face.add(stop.object);
    const group = new Group();
    group.add(cubicle.group);
    return {
      object: group,
      parts,
      update(delta) {
        const reading = currentPlant(pool);
        const shown = pumpsShown(reading, pool);
        const w = world?.world.value;
        for (const p of pumps) {
          p.state.value = shown[p.id];
          const amps =
            w && p.tag
              ? w.motors.starters[p.tag].current
              : shown[p.id] === 0
                ? reading.amps[p.id]
                : 0;
          p.amps.show(amps.toFixed(1).padStart(5, ' '));
        }
        mimic.show(
          pool === 'pool_01'
            ? loungeValveMimicState(w?.loungeValvePositions ?? {}, shown)
            : mainPoolState(reading, shown),
        );
        mimic.parts.update(delta);
      },
    };
  },
});

/** The main pool's, as the dev rooms show it. */
export const PUMP_PANEL_EXHIBIT = pumpPanelExhibit();

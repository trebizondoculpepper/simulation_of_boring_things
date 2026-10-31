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
import type {
  ChannelFeedback,
  ChannelId,
  Selector,
} from '../../../game/plant/aqualis-types';
import type { LedState } from '../../components/plant/logic/aqualis-cabinet';
import { drawBootScreen } from '../../components/plant/views/aqualis-cabinet';

/**
 * Dev58's host (mission 114): everything the room shows and works, behind
 * one object, so the room is only layout and touches. It runs the test rig
 * (`aqualis-rig.ts`) for real; the places marked STUB are where the
 * controller (`aqualis-controller.ts`), the sampler and the display model
 * (`aqualis-display.ts`, `views/aqualis-screens.ts`) plug in.
 */

/** The time-speed knob's settings: world seconds per real second. */
export const SPEEDS = [1, 10, 100, 1000] as const;
export const SPEED_LEGEND = '1× · 10× · 100× · 1000×';

/** Each dosing unit's own selector, left to right as engraved. */
export const DEVICE_MODES: readonly DeviceMode[] = ['remote', 'manual', 'off'];
export const DEVICE_LEGEND = 'REMOTE · MANUAL · OFF';

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
  /** A touch on the cabinet's screen, in its pixels. */
  screenTouch(x: number, y: number): void;
}

export function createAqualisRoomHost(
  scenario: RigScenarioId = 'good',
): AqualisRoomHost {
  let rig = newRig(scenario);
  let speed = 1;
  let sel: Selector = 'auto';
  let valveOpen = true;
  let drawn = false;

  /**
   * STUB: the controller's demand on each port, 0..1. The lead replaces this
   * with `aqualis-controller.ts` fed by the sampler's readings, the knob and
   * the settings; until then nothing is asked (OFF in effect).
   */
  const demands = (): Partial<Record<ChannelId, number>> => ({});

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
      power: true,
      dosing: Object.values(rig.devices).some((d) => d.delivering > 0),
      // STUB: the advisor's alarms light it; for now, lost sample flow.
      alarm: !valveOpen,
    }),
    step(realDt) {
      rig = stepRig(rig, demands(), realDt * SPEEDS[speed]);
    },
    drawScreen(c) {
      // STUB: the display model draws here, keyed so it redraws only on change.
      if (drawn) return false;
      drawBootScreen(c);
      drawn = true;
      return true;
    },
    screenTouch() {
      // STUB: the display model takes touches here.
    },
  };
}

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
import { drawAqualisScreen } from '../../components/plant/views/aqualis-screens';
import {
  drawDrAqualis,
  drawSpeechBubble,
} from '../../components/plant/views/dr-aqualis';

/**
 * Dev58's host (mission 114): everything the room shows and works, behind
 * one object, so the room is only layout and touches. It runs the test rig
 * (`aqualis-rig.ts`) and the Dr Aqualis Trio on it: the sampler reads the
 * rig's water, the controller drives the rig's devices through their ports
 * on the chemistry's 10 s tick, the advisor gives Dr Aqualis his advice and
 * the cabinet its alarms, and the display model draws the screen, redrawn
 * only when its page's key (or, on his page, his pose) changes.
 */

/** The world step the sampler and controller take, s (the rig's tick). */
const TICK = 10;
/** The most ticks a frame may take (1000× at a slow frame). */
const MOST_TICKS = 400;

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
  /** Whether Dr Aqualis is on show (his page). */
  doctorShown(): boolean;
  /** Draw Dr Aqualis on his overlay (pre-scaled to the box's pixels) if his pose changed: whether it drew. */
  drawDoctor(c: CanvasRenderingContext2D, w: number, h: number): boolean;
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

  /** One chemistry tick of the cabinet: sample, control, advise. */
  const tick = () => {
    const s = stepSampler(sampler, rigSample(rig), TICK);
    sampler = s.state;
    readings = s.readings;
    sample = s.status;
    const c = stepController(
      control,
      { readings, sample, selector: sel, ports: rigPorts(rig), settings, hand },
      TICK,
    );
    control = c.state;
    out = c.out;
    advice = advise(readings, settings, out.channels, rig.water);
    alarmsOn = alarms(readings, sample, out.channels, settings, sel);
    rig = stepRig(rig, out.demands, TICK);
  };
  tick();

  const inputs = (): DisplayInputs => ({
    readings,
    sample,
    selector: sel,
    channels: out!.channels,
    inhibit: out!.inhibit,
    advice,
    alarms: alarmsOn,
    settings,
    hand,
  });

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
      alarm: alarmsOn.length > 0 || !valveOpen,
    }),
    step(realDt) {
      owed += realDt * SPEEDS[speed];
      let n = 0;
      while (owed >= TICK && n++ < MOST_TICKS) {
        owed -= TICK;
        tick();
      }
      if (n >= MOST_TICKS) owed = 0;
      // The screen runs on real time: its cycle and Dr Aqualis.
      clock += realDt;
      display = tickDisplay(display, realDt);
    },
    drawScreen(c) {
      const m = displayModel(display, inputs());
      const faults = defectsAt(clock, SCREEN.w, SCREEN.h);
      const key = m.key + defectsKey(faults);
      if (key === drawn) return false;
      drawn = key;
      // Dr Aqualis himself is on his overlay (`drawDoctor`), so his frames
      // upload a small canvas, not the whole screen.
      drawAqualisScreen(c, m, {
        bubble: (ctx, text, box, tail) =>
          drawSpeechBubble(ctx, text.split('\n'), box, tail, {
            title: 'Dr Aqualis says',
            fontPx: 19,
          }),
      });
      drawDefects(c, faults);
      return true;
    },
    doctorShown: () => displayModel(display, inputs()).page === 'doctor',
    drawDoctor(c, w, h) {
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
      const ins = inputs();
      const id = hitDisplay(display, ins, x, y);
      if (!id) return;
      const r = pressDisplay(display, ins, id);
      display = r.state;
      if (r.effect?.kind === 'settings') settings = r.effect.settings;
      if (r.effect?.kind === 'hand')
        hand = { ...hand, [r.effect.channel]: r.effect.demand };
    },
  };
}

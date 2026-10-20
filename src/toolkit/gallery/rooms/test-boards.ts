import { computed, signal } from '@preact/signals-core';
import { BoxGeometry, Group, Mesh } from 'three';
import type { Object3D } from 'three';
import { partAudio } from '../../components/core/audio/part-audio';
import type { SoundRecipe } from '../../components/core/audio/part-audio';
import { bootBeep, postBeep } from '../../components/sound/audio/boot-beep';
import { createAnnunciator } from '../../components/industrial-control/logic/annunciator';
import { createScreenBoot } from '../../components/industrial-control/logic/screen-boot';
import { createSoftStarter as createSoftStarterLogic } from '../../components/industrial-control/logic/soft-starter';
import {
  createDrive,
  driveDisplay,
  driveRpm,
  pressDriveKey,
  stepDrive,
} from '../../components/industrial-control/logic/drive-keypad';
import {
  createTerminal,
  pressTerminalKey,
  terminalLines,
} from '../../components/industrial-control/logic/operator-terminal';
import { createHourMeter } from '../../components/core/logic/world/components';
import {
  LCD_MODES,
  createAnnunciatorPanel,
  createChartRecorder,
  createLcdMonitor,
  createDoorLeaf,
  createLouvres,
  createPowerMonitor,
  createSoftStarter,
  createViewingWindow,
} from '../../components/industrial-control/views/cabinet-fittings';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../components/core/views/eighties-controls';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import type { OperatorColour } from '../../components/industrial-control/views/industrial-controls';
import {
  createHourMeterView,
  createMessageDisplay,
  createStackLight,
} from '../../components/industrial-control/views/industrial-displays';
import { createPanelMeter } from '../../components/industrial-control/views/panel-instruments';
import { drawBootScreen } from '../../components/industrial-control/views/boot-screen';
import {
  MCC_BLUE,
  createWornPaint,
} from '../../components/core/views/worn-paint';
import {
  contactor,
  createPartSet,
  disconnectHandle,
  driveKeypad,
  ledPushbutton,
  mushroomStop,
  operatorTerminal,
  pilotLight,
  potentiometer,
  pushButton,
  pushbuttonStation,
  selector,
  studioSwitch,
} from '../../components/core/parts/parts';
import { STUDIO_LED_COLOURS } from '../../components/industrial-control/views/studio-controls';
import type {
  StudioCapColour,
  StudioLedColour,
} from '../../components/industrial-control/views/studio-controls';
import type { Part, PartSet } from '../../components/core/parts/parts';
import { createPs1Material } from '../../components/core/parts/ps1-material';

/** What a board or pedestal gives the room. */
export interface TestFitting {
  group: Group;
  /** Its parts: what each click works; they make their own sounds. */
  parts: PartSet;
  update(seconds: number, delta: number, reducedMotion: boolean): void;
  dispose(): void;
}

/**
 * A grey board on a stand with a title, built in metres, its parts at
 * `scale` times life size. Returns helpers to place parts and captions.
 */
export function createBoard(
  kit: PanelKit,
  {
    title,
    width,
    height,
    scale,
    captionScale = 1,
  }: {
    title: string;
    width: number;
    height: number;
    scale: number;
    captionScale?: number;
  },
) {
  const group = new Group();
  const backing = createPs1Material({ color: '#b9bcb5' });
  kit.materials.push(backing);
  const plate = new Mesh(
    new BoxGeometry(width * scale, height * scale, 0.02),
    backing,
  );
  plate.position.z = -0.01;
  group.add(plate);
  const parts = new Group();
  parts.scale.setScalar(scale);
  group.add(parts);
  const heading = createMicroLabel(kit, title, {
    height: 0.016,
    ink: '#23241f',
  });
  heading.position.set(0, height / 2 - 0.022, 0.0006);
  parts.add(heading);
  const set = createPartSet();
  return {
    group,
    parts,
    /** The board's parts. */
    set,
    at(part: Object3D, x: number, y: number) {
      part.position.set(x, y, 0);
      parts.add(part);
      return part;
    },
    /** Place a part on the board, `size` times its life size there. */
    place<P extends Part>(part: P, x: number, y: number, size = 1): P {
      part.object.position.set(x, y, 0);
      part.object.scale.setScalar(size);
      parts.add(part.object);
      return set.add(part);
    },
    caption(text: string, x: number, y: number, size = 0.0055) {
      const label = createMicroLabel(kit, text, {
        height: size * captionScale,
        ink: '#2b2a25',
      });
      label.position.set(x, y, 0.0005);
      parts.add(label);
    },
  };
}

/** A board as a fitting: its parts and any updates of its own. */
function fitting(
  board: ReturnType<typeof createBoard>,
  updates: ((delta: number) => void)[] = [],
): TestFitting {
  return {
    group: board.group,
    parts: board.set,
    update(_seconds, delta) {
      for (const update of updates) update(delta);
      board.set.update(delta);
    },
    dispose: () => board.set.dispose(),
  };
}

/** One spatial beep when a display completes each power-on self-test. */
function readyBeep(
  updates: ((delta: number) => void)[],
  boot: ReturnType<typeof createScreenBoot>,
  from: Object3D,
  hz: number,
  chosen?: SoundRecipe,
) {
  let wasReady = false;
  updates.push(() => {
    const ready = boot.ready.value;
    if (ready && !wasReady) partAudio.play(chosen ?? bootBeep(hz), from);
    wasReady = ready;
  });
}

/**
 * The CONTROLS board: one of each kind of 30 mm pilot device, three times
 * life size, each under its legend with what it is below. Every one is a
 * part, wired to nothing: each works and sounds on its own.
 */
export function createControlsBoard(kit: PanelKit): TestFitting {
  const board = createBoard(kit, {
    title: 'CONTROLS',
    width: 1.0,
    height: 0.46,
    scale: 3,
  });
  const row1 = 0.1;
  const row2 = -0.09;
  const what = (text: string, x: number, y: number) =>
    board.caption(text, x, y - 0.045, 0.0045);

  const buttons: [string, OperatorColour, 'flush' | 'extended', string][] = [
    ['START', 'green', 'flush', 'PUSH BUTTON, FLUSH'],
    ['STOP', 'red', 'extended', 'PUSH BUTTON, EXTENDED'],
    ['JOG', 'black', 'flush', 'PUSH BUTTON, FLUSH'],
    ['RESET', 'blue', 'flush', 'PUSH BUTTON, FLUSH'],
  ];
  buttons.forEach(([legend, colour, head, caption], i) => {
    const x = -0.4 + i * 0.12;
    board.place(pushButton(kit, { colour, head, legend }), x, row1);
    what(caption, x, row1);
  });
  board.place(
    ledPushbutton(kit, { colour: 'amber', legend: 'PUMP ON' }),
    0.08,
    row1,
  );
  what('ILLUMINATED, PUSH ON/OFF', 0.08, row1);
  board.place(mushroomStop(kit, {}), 0.22, row1);
  what('MUSHROOM, PUSH-PULL', 0.22, row1);
  board.place(
    pilotLight(kit, { colour: 'red', legend: 'RUNNING' }),
    0.37,
    row1,
  );
  what('PILOT LIGHT, PUSH TO TEST', 0.37, row1);

  const selectors: [string, string, 2 | 3, boolean, number][] = [
    ['HAND  OFF  AUTO', 'SELECTOR, 3 POSITION', 3, false, 1],
    ['OFF   ON', 'SELECTOR, 2 POSITION', 2, false, 0],
    ['OFF   ON', 'KEY SELECTOR', 2, true, 0],
  ];
  selectors.forEach(([legend, caption, positions, key, initial], i) => {
    const x = -0.4 + i * 0.14;
    board.place(selector(kit, { positions, key, initial, legend }), x, row2);
    what(caption, x, row2);
  });
  board.place(
    potentiometer(kit, { legend: 'SPEED', initial: 0.3 }),
    0.04,
    row2,
  );
  what('POTENTIOMETER', 0.04, row2);
  board.place(
    selector(kit, { positions: 4, legend: '1   2   3   4' }),
    0.22,
    row2,
  );
  what('CAM SELECTOR, 4 POSITION', 0.22, row2);
  board.place(
    pushButton(kit, {
      colour: 'red',
      head: 'illuminated',
      lamp: computed(() => true),
    }),
    0.37,
    row2,
  );
  what('MOMENTARY, SEPARATE LAMP', 0.37, row2);
  board.caption(
    'Click the left half of a knob to turn it down, the right half to turn it up.',
    0.2,
    -0.2,
    0.0045,
  );
  return fitting(board);
}

/**
 * The STUDIO CONTROLS board: the short-travel studio switches of 2010s
 * studio and broadcast gear (`createStudioSwitch`), a newer family than
 * the heavy-duty industrial controls, three times life size: each LED
 * colour, latching and momentary, one whose LED is driven separately, and
 * the testing-scenario switches as the Hyperplasc Scenario Simulator
 * wears them.
 */
export function createStudioBoard(kit: PanelKit): TestFitting {
  const board = createBoard(kit, {
    title: 'STUDIO CONTROLS',
    width: 0.66,
    height: 0.44,
    scale: 3,
  });
  const what = (text: string, x: number, y: number) =>
    board.caption(text, x, y - 0.03, 0.0042);
  const pitch = 0.045;
  const left = -0.27;
  // Every LED colour, momentary: the LED shows the press.
  (Object.keys(STUDIO_LED_COLOURS) as StudioLedColour[]).forEach((led, i) =>
    board.place(
      studioSwitch(kit, { legend: led.toUpperCase(), led }),
      left + i * pitch,
      0.1,
    ),
  );
  what('MOMENTARY: THE LED SHOWS EACH PRESS', left + 2 * pitch, 0.1);
  // The studio classics, latching: the LED lit while on.
  const latching: [string, StudioLedColour][] = [
    ['MUTE', 'red'],
    ['SOLO', 'amber'],
    ['REC', 'red'],
    ['TALK', 'white'],
  ];
  latching.forEach(([legend, led], i) =>
    board.place(
      studioSwitch(kit, { legend, led, mode: 'latching' }),
      0.04 + i * pitch,
      0.1,
    ),
  );
  what('LATCHING: LIT WHILE ON', 0.04 + 1.5 * pitch, 0.1);
  // Momentary, its LED driven by something else: here, busy.
  const busy = signal(false);
  let clock = 0;
  board.place(
    studioSwitch(kit, { legend: 'SYNC', led: 'blue', lamp: busy }),
    0.27,
    0.1,
  );
  what('LED DRIVEN APART', 0.27, 0.1);
  // The testing scenarios, as the simulator wears them.
  const scenarios: [string, StudioLedColour][] = [
    ['FULL OFF', 'red'],
    ['FULL ON', 'green'],
    ['SLOW START', 'green'],
    ['RESET', 'blue'],
    ['HICCUP', 'amber'],
    ['GLITCH', 'amber'],
    ['KAPUT', 'red'],
  ];
  scenarios.forEach(([legend, led], i) =>
    board.place(
      studioSwitch(kit, { legend, led }),
      left + 0.04 + i * 0.07,
      -0.04,
    ),
  );
  what(
    'TESTING SCENARIOS, AS ON THE HYPERPLASC SCENARIO SIMULATOR',
    left + 0.04 + 3 * 0.07,
    -0.04,
  );
  // Any cap with any LED: chosen independently.
  const pairs: [StudioCapColour, StudioLedColour][] = [
    ['graphite', 'green'],
    ['black', 'blue'],
    ['grey', 'amber'],
    ['white', 'red'],
    ['red', 'white'],
    ['blue', 'amber'],
    ['yellow', 'green'],
  ];
  pairs.forEach(([cap, led], i) =>
    board.place(
      studioSwitch(kit, {
        legend: cap.toUpperCase(),
        cap,
        led,
        mode: 'latching',
        initial: true,
      }),
      left + 0.04 + i * 0.07,
      -0.115,
    ),
  );
  what('CAP AND LED COLOURS CHOSEN APART', left + 0.04 + 3 * 0.07, -0.115);
  board.caption(
    'Short-travel studio switches: a square cap with one corner chamfered, a square LED window, the legend on the cap.',
    0,
    -0.18,
    0.0042,
  );
  return fitting(board, [
    (delta) => {
      clock += delta;
      busy.value = Math.floor(clock * 2.5) % 3 !== 0;
    },
  ]);
}

/** The plant messages the message display steps through. */
const MESSAGES: [string, string][] = [
  ['CONVEYOR M1', 'RUNNING'],
  ['LINE 2 STOPPED', 'OPERATOR REQUEST'],
  ['LUBE PRESSURE LOW', 'PUMP 3'],
  ['MOTOR M4 OVERLOAD', 'RESET AT UNIT 2C'],
  ['SHIFT 2', 'GOOD MORNING'],
];

/**
 * The DISPLAYS board: indicators, meters and the message display, twice
 * life size, each driven by test controls. A BOARD POWER selector feeds
 * the board; the message display also has its own power button.
 */
export function createDisplaysBoard(kit: PanelKit): TestFitting {
  const board = createBoard(kit, {
    title: 'DISPLAYS',
    width: 1.6,
    height: 0.62,
    scale: 2,
    captionScale: 1.5,
  });
  const updates: ((delta: number) => void)[] = [];
  const small = 0.8;
  const lever = (legend: string, x: number, y: number, initial = 0) =>
    board.place(selector(kit, { positions: 2, initial, legend }), x, y, small);

  const powerSelector = lever('BOARD POWER', -0.72, 0.2, 1);
  const power = computed(() => powerSelector.position.value === 1);

  // The message display, stepped by NEXT.
  const message = createMessageDisplay(kit);
  board.at(message.group, -0.47, 0.19);
  board.caption('MESSAGE DISPLAY, VACUUM FLUORESCENT', -0.47, 0.13);
  const messageSwitch = board.place(
    ledPushbutton(kit, { colour: 'green', legend: 'POWER', power }),
    -0.72,
    0.07,
    small,
  );
  const messagePower = computed(() => power.value && messageSwitch.state.value);
  const messageBoot = createScreenBoot(messagePower, 'DATALINE');
  let shown = 0;
  board.place(
    pushButton(kit, {
      colour: 'black',
      legend: 'NEXT',
      action: () => (shown = (shown + 1) % MESSAGES.length),
    }),
    -0.47,
    0.07,
    small,
  );
  updates.push((delta) => {
    messageBoot.step(delta);
    message.show(
      messageBoot.booting ? messageBoot.lines(2, 20) : MESSAGES[shown],
      messagePower.value,
    );
  });
  readyBeep(updates, messageBoot, message.group, 932);

  // The stack light on its bracket, and its mode.
  const stack = createStackLight(kit);
  board.at(stack.group, -0.2, 0.06);
  board.caption('STACK LIGHT', -0.2, 0.03);
  const mode = board.place(
    potentiometer(kit, { steps: 3 }),
    -0.2,
    -0.02,
    small,
  );
  board.caption('OFF  RUN  WARN  FAULT', -0.2, -0.05, 0.0035);
  updates.push(() => {
    const m = mode.position.value;
    stack.set(
      power.value ? [m === 3, m === 2, m === 1] : [false, false, false],
    );
  });

  // Pilot lights, each driven by a lever under it.
  const lamps: [string, OperatorColour][] = [
    ['RUN', 'red'],
    ['OFF', 'green'],
    ['OVERLOAD', 'amber'],
    ['POWER', 'white'],
  ];
  lamps.forEach(([legend, colour], i) => {
    const x = -0.72 + i * 0.075;
    const driveLever = lever('DRIVE', x, -0.2);
    board.place(
      pilotLight(kit, {
        colour,
        legend,
        power,
        drive: computed(() => driveLever.position.value === 1),
      }),
      x,
      -0.12,
      small,
    );
  });
  board.caption('PILOT LIGHTS, PUSH TO TEST', -0.61, -0.25);

  // The switchboard meters, each with its test knob.
  const meter = (
    unit: string,
    scaleMax: number,
    redFrom: number,
    legend: string,
    x: number,
    caption: string,
    steps: number,
  ) => {
    const view = createPanelMeter(kit, unit, {
      width: 0.09,
      scaleMax,
      redFrom,
    });
    board.at(view.group, x, -0.12);
    const knob = board.place(
      potentiometer(kit, { legend, steps }),
      x,
      -0.21,
      small,
    );
    updates.push((delta) => {
      view.set(power.value ? knob.share.value : 0);
      view.update(delta);
    });
    board.caption(caption, x, -0.25);
  };
  meter('A  AC', 50, 0.85, 'TEST AMPS', -0.33, 'AMMETER 0-50 A', 10);
  meter('V  AC', 600, 0.9, 'TEST VOLTS', -0.19, 'VOLTMETER 0-600 V', 12);

  // A digital panel meter, red LEDs, with its own test speed setting.
  const dpm = createSevenSegment(kit, 4, { digitHeight: 0.016 });
  board.at(dpm.group, -0.03, -0.12);
  const rpm = board.place(
    potentiometer(kit, { legend: 'TEST RPM', steps: 18 }),
    -0.03,
    -0.21,
    small,
  );
  updates.push(() =>
    dpm.show(power.value ? String(Math.round(rpm.share.value * 1800)) : ''),
  );
  board.caption('DIGITAL PANEL METER: DRIVE RPM', -0.03, -0.155, 0.0045);

  // The hour meter, its RUN and a fast-forward for checking it.
  const hourView = createHourMeterView(kit);
  board.at(hourView.group, 0.13, -0.12);
  const run = lever('RUN', 0.1, -0.2);
  const fast = lever('×360', 0.16, -0.2);
  const hours = createHourMeter({
    running: computed(() => power.value && run.position.value === 1),
    initial: 4211.3,
  });
  updates.push((delta) => {
    hours.step(fast.position.value === 1 ? delta * 360 : delta);
    hourView.show(hours.hours.value);
  });
  board.caption('HOUR METER', 0.13, -0.25);

  return fitting(board, updates);
}

/**
 * The CABINET FITTINGS board: the door fittings of the Retro Encabulator
 * (dev6), each tried here first, twice life size, and wired together
 * as on a real unit. The disconnect handle feeds the soft starter, which
 * the pushbutton station starts and stops; the power monitor, the chart
 * recorder and the contactor behind the viewing window follow it; the
 * annunciator flashes its alarms until acknowledged. The LCD, operator
 * terminal and drive keypad have separate power switches and boot cycles.
 * Swatches show the worn pale-blue paint of a door and of the plinth.
 */
export function createCabinetBoard(kit: PanelKit): TestFitting {
  const board = createBoard(kit, {
    title: 'CABINET FITTINGS',
    width: 2.5,
    height: 0.75,
    scale: 2,
    captionScale: 1.5,
  });
  const updates: ((delta: number) => void)[] = [];
  const small = 0.8;
  let clock = 0;
  updates.push((delta) => (clock += delta));
  const lever = (legend: string, x: number, y: number, initial = 0) => {
    const part = board.place(
      selector(kit, { positions: 2, initial, legend }),
      x,
      y,
      small,
    );
    return computed(() => part.position.value === 1);
  };

  const power = lever('BOARD POWER', -0.66, -0.2, 1);
  const screenPower = (name: string, x: number, y: number) => {
    const button = board.place(
      ledPushbutton(kit, { colour: 'green', legend: name, power }),
      x,
      y,
      small,
    );
    return computed(() => power.value && button.state.value);
  };

  // The LCD and the knob that chooses its picture.
  const lcd = createLcdMonitor(kit, { width: 0.3 });
  board.at(lcd.group, -0.66, 0.16);
  board.caption('LCD PANEL, 12 IN', -0.66, 0.015);
  const mode = board.place(
    potentiometer(kit, { steps: LCD_MODES.length - 1 }),
    -0.66,
    -0.05,
    small,
  );
  board.caption('TREND  MIMIC  LOG  VECTOR', -0.66, -0.085, 0.0035);
  const lcdSupply = screenPower('LCD POWER', -0.91, -0.05);
  const crtBoot = createScreenBoot(lcdSupply, 'ENCABULATOR SYSTEMS');
  updates.push((delta) => {
    crtBoot.step(delta);
    lcd.setOn(lcdSupply.value);
    lcd.setBoot(crtBoot.booting ? crtBoot.lines() : null);
    lcd.setMode(LCD_MODES[mode.position.value]);
    lcd.update(delta);
  });
  readyBeep(updates, crtBoot, lcd.group, 988);

  // The terminal and drive HIM are cabinet fittings, each with its own
  // supply. Their controls cannot work while their screens are off.
  const program = createTerminal();
  const drive = createDrive();
  const terminalSupply = screenPower('TERMINAL POWER', 1.13, 0.03);
  const himSupply = screenPower('HIM POWER', 1.13, -0.19);
  const terminalPart = board.place(
    operatorTerminal(kit, {
      power: terminalSupply,
      onKey: (key) => pressTerminalKey(program, key),
    }),
    0.98,
    0.19,
  );
  board.caption('OPERATOR TERMINAL', 0.98, 0.08);
  const keypadPart = board.place(
    driveKeypad(kit, {
      power: himSupply,
      onKey: (key) => pressDriveKey(drive, key),
    }),
    0.98,
    -0.18,
  );
  board.caption('DRIVE KEYPAD (HIM)', 0.98, -0.27);
  const terminalBoot = createScreenBoot(
    terminalSupply,
    'AUTOMATION CONTROL',
    'controller',
  );
  const himBoot = createScreenBoot(himSupply, 'VFD-601 HIM');
  updates.push((delta) => {
    terminalBoot.step(delta);
    himBoot.step(delta);
    if (!himSupply.value) drive.running = drive.jogging = false;
    stepDrive(drive, delta);
    keypadPart.view.show(
      himBoot.booting ? himBoot.lines(2, 16) : driveDisplay(drive),
      himSupply.value,
    );
    terminalPart.view.draw(
      !terminalSupply.value
        ? null
        : terminalBoot.booting
          ? (c, w, h) => drawBootScreen(c, w, h, terminalBoot.lines())
          : (c, w) => {
              const lines = terminalLines(program, driveRpm(drive));
              c.fillRect(0, 0, w, 18);
              c.fillStyle = '#26476e';
              c.fillText(lines[0], 6, 3);
              c.fillStyle = '#e6eef4';
              lines
                .slice(1)
                .forEach((line, i) => c.fillText(line, 6, 24 + i * 16));
            },
    );
  });
  readyBeep(updates, terminalBoot, terminalPart.object, 374, postBeep);
  readyBeep(updates, himBoot, keypadPart.object, 1047);

  // The disconnect, the soft starter and its pushbutton station.
  const disconnect = board.place(
    disconnectHandle(kit, {
      name: 'Red disconnect throw handle',
      colour: 'red',
    }),
    0.4,
    -0.16,
  );
  board.caption('RED DISCONNECT THROW HANDLE', 0.4, -0.31);
  const fed = computed(() => power.value && disconnect.on.value);
  const running = signal(false);
  const fault = signal(false);
  board.place(
    pushbuttonStation(kit, {
      buttons: [
        {
          colour: 'green',
          legend: 'START',
          action: () => {
            if (fed.value && !fault.value) running.value = true;
          },
        },
        {
          colour: 'red',
          legend: 'STOP',
          action: () => (running.value = false),
        },
        {
          colour: 'black',
          legend: 'RESET',
          action: () => (fault.value = false),
        },
      ],
    }),
    0.2,
    -0.17,
  );
  board.caption('PUSHBUTTON STATION', 0.2, -0.31);
  const starter = createSoftStarter(kit);
  board.at(starter.group, 0.5, 0.2);
  board.caption('SOFT STARTER', 0.5, 0.145);
  const faultSim = lever('FAULT SIM', 0.03, 0.04);
  const softStart = createSoftStarterLogic();
  let current = 0;
  const amps = () => current;
  updates.push((delta) => {
    if (!fed.value) running.value = false;
    if (faultSim.value && running.value) {
      fault.value = true;
      running.value = false;
    }
    const lamps = softStart.step(
      delta,
      running.value || fault.value,
      fault.value,
    );
    current = lamps.speed > 0 ? lamps.amps : 0;
    starter.set(lamps);
  });

  const monitor = createPowerMonitor(kit);
  board.at(monitor.group, 0.2, 0.2);
  board.caption('POWER MONITOR', 0.2, 0.135);
  updates.push(() => {
    const volts = fed.value ? 478 + Math.sin(clock * 0.9) * 2 : 0;
    monitor.show(volts, amps(), (volts * amps() * 1.73 * 0.85) / 1000);
  });

  const chart = createChartRecorder(kit);
  board.at(chart.group, -0.35, 0.17);
  board.caption('STRIP-CHART RECORDER', -0.35, 0.05);
  updates.push((delta) => {
    chart.set([
      amps() / 40,
      0.5 + Math.sin(clock * 0.4) * 0.3,
      power.value ? 0.78 : 0,
    ]);
    chart.update(delta);
  });

  // The annunciator: the starter's own alarms, and the plant's nonsense.
  const labels = [
    'DISC\nOPEN',
    'SMC\nFAULT',
    'DINGLE\nARM',
    'MODIAL\nHI',
    'BEARING\nTEMP',
    'FAN\nFAIL',
    'PHASE\nLOSS',
    'GRAM-\nMETER',
    'LUBE\nLOW',
    'DOOR\nOPEN',
    'SPARE',
    'SPARE',
  ];
  const panel = createAnnunciatorPanel(kit, labels, {
    columns: 4,
    cell: 0.053,
  });
  board.at(panel.group, -0.05, 0.2);
  board.caption('ANNUNCIATOR', -0.05, 0.125);
  const alarms = createAnnunciator(labels.length);
  // A click is a press and spring-back: TEST lights every window a while.
  let testUntil = 0;
  board.place(
    pushButton(kit, {
      colour: 'black',
      legend: 'TEST',
      action: () => (testUntil = clock + 2),
    }),
    -0.13,
    0.04,
    small,
  );
  board.place(
    pushButton(kit, {
      colour: 'amber',
      legend: 'ACK',
      action: () => alarms.acknowledge(),
    }),
    -0.05,
    0.04,
    small,
  );
  updates.push(() => {
    alarms.sense([
      power.value && !disconnect.on.value,
      fault.value,
      ...labels
        .slice(2, 10)
        .map(
          (_, k) =>
            power.value &&
            Math.sin(clock * (0.11 + k * 0.023) + k * 1.9) > 0.93,
        ),
      false,
      false,
    ]);
    alarms.test = clock < testUntil;
    panel.set(power.value ? alarms.lit(clock) : labels.map(() => false));
  });

  // A door swatch in the worn pale blue, with louvres pressed in it.
  const doorPaint = createWornPaint(kit, {
    colour: MCC_BLUE,
    width: 0.24,
    height: 0.24,
    seed: 3,
    handled: { x: 0.8, y: 0.5 },
  });
  board.at(createDoorLeaf(0.24, 0.24, 0.012, doorPaint), -0.35, -0.18);
  const louvres = createLouvres(kit, 0.16, 0.09, doorPaint);
  louvres.position.set(-0.35, -0.22, 0.012);
  board.parts.add(louvres);
  board.caption('WORN PAINT, LOUVRES', -0.35, -0.32);

  // A door piece with a viewing window, the starter's contactor behind it,
  // pulling in as the starter runs.
  board.place(
    contactor(kit, { coil: computed(() => fed.value && running.value) }),
    -0.05,
    -0.18,
  );
  const front = new Group();
  front.position.set(-0.05, -0.18, 0.07);
  front.add(
    createDoorLeaf(0.26, 0.24, 0.012, doorPaint, {
      x: 0,
      y: 0.01,
      width: 0.17,
      height: 0.15,
    }),
  );
  const pane = createViewingWindow(kit, 0.17, 0.15);
  pane.position.set(0, 0.01, 0.012);
  front.add(pane);
  board.parts.add(front);
  board.caption('VIEWING WINDOW', -0.05, -0.32);

  // The plinth's swatch: kicked, scuffed and scratched through.
  const plinthPaint = createWornPaint(kit, {
    colour: MCC_BLUE,
    width: 0.3,
    height: 0.1,
    seed: 8,
    wear: 'heavy',
  });
  board.at(createDoorLeaf(0.3, 0.1, 0.03, plinthPaint), 0.66, -0.2);
  board.caption('WORN PLINTH', 0.66, -0.27);

  return fitting(board, updates);
}

import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createPartSet, disconnectHandle } from '../../core/parts/parts';
import { createBrandBadge } from '../../core/views/brand-badge';
import type { BrandId } from '../../core/logic/brands';
import { createEngravedPlate } from '../../core/views/plant-signs';
import { createSafetySign } from '../../general-safety/views/safety-signs';
import { plantTools } from './plant-tools';

/** What the control box shows of itself: its supply, its controller and its I/O. */
export interface ControlBoxReading {
  /** Power through its isolator and MCB. */
  live: boolean;
  /** Its controller running (not starting, not hung). */
  running: boolean;
  hung: boolean;
  /** Its controller's inputs and outputs, each LED in order. */
  inputs: readonly boolean[];
  outputs: readonly boolean[];
  /** Each terminal's link answering. */
  links: readonly boolean[];
}

/** The input and output LEDs' legends on the controller's face. */
export const BOX_INPUTS = [
  'HYPO SEL AUTO',
  'HYPO PUMP AUTO',
  'HYPO HH OK',
  'ACID SEL AUTO',
  'ACID PUMP AUTO',
  'ACID HH OK',
] as const;
export const BOX_OUTPUTS = [
  'HYPO RUN',
  'HYPO PL1',
  'HYPO PL2',
  'HYPO PL3',
  'HYPO PL4',
  'ACID RUN',
  'ACID PL1',
  'ACID PL2',
  'ACID PL3',
  'ACID PL4',
] as const;

/**
 * The cable glands underneath, left to right (the owner, 2026-10-28: "two
 * serial inputs from the terminals entering through glands"): each one's
 * x on the box, metres from its middle, and the legend on its label.
 */
export const BOX_GLANDS = [
  { x: -0.2, legend: 'OT1 HYPO\nRS-485' },
  { x: -0.1, legend: 'OT2 ACID\nRS-485' },
  { x: 0, legend: 'SUPPLY\n230V AC' },
  { x: 0.1, legend: 'LEVEL\nSIGNALS' },
  { x: 0.2, legend: 'OUTLETS\n& PUMPS' },
] as const;

/**
 * The chemical distribution's control box (prompt 091; the owner,
 * 2026-10-27), Penfold Controls': a steel wall enclosure about 600 × 400
 * × 200 mm in light grey, its door isolator on the front (after a door-
 * mounted rotary switch-disconnector), its door opening on a quarter-turn
 * latch. Inside on DIN rail, each module badged by its maker (CLAUDE.md:
 * the box is Penfold's, what it holds is bought in): Voltara's MCB and
 * door isolator, Neumann Dynamik's 24 V power supply with its DC OK LED,
 * the controller (Quorvane's QL-12, a small PLC after a Siemens LOGO! 8)
 * with RUN, STOP and FAULT LEDs and an LED for every input and output,
 * Fankel's comms module for the two terminals, Hartwell & Bligh's ten
 * interposing relays (the selectors' outlets and the pumps' remote run),
 * and terminals for the day tanks' level signals; an I/O schedule card
 * beside the controller naming every LED, and the wiring diagram in the
 * door's pocket. No keypad: the terminals are the only way to read and
 * set it. Labelled up as a control box is (the owner, 2026-10-28): its
 * engraved tag plate on the door, a rating plate, the electrical danger
 * sign and where it is fed from; a labelled gland for each cable entry
 * (`BOX_GLANDS`), the two terminals' serial cables seen inside running up
 * to the comms module's ports, the supply's to the MCB and the field
 * wiring's to the terminal rail.
 *
 * Origin at the middle of its back, its front toward +z.
 */
export function createChemControlBox(
  kit: PanelKit,
  {
    tag,
    read,
    fedFrom = 'WET HALL DISTRIBUTION',
  }: {
    tag: string;
    read: () => ControlBoxReading;
    /** Where its supply comes from, on its door's label. */
    fedFrom?: string;
  },
) {
  const group = new Group();
  const t = tools(kit);
  const p = plantTools(kit);
  const parts = createPartSet();
  const W = 0.6;
  const H = 0.4;
  const D = 0.2;
  const steel = t.paint('#d7d8d2', 0.5, 0.2);
  const wall = 0.002;
  // The case, open at the front.
  t.box(group, steel, W, H, wall, 0, 0, wall / 2);
  t.box(group, steel, W, wall, D, 0, H / 2 - wall / 2, D / 2);
  t.box(group, steel, W, wall, D, 0, -H / 2 + wall / 2, D / 2);
  t.box(group, steel, wall, H, D, -W / 2 + wall / 2, 0, D / 2);
  t.box(group, steel, wall, H, D, W / 2 - wall / 2, 0, D / 2);
  // The mounting plate, galvanised.
  const plateZ = 0.012;
  t.box(
    group,
    t.paint('#c3c6c4', 0.45, 0.6),
    W - 0.03,
    H - 0.03,
    0.003,
    0,
    0,
    plateZ,
  );
  const front = plateZ + 0.002;
  const rail = (y: number) =>
    t.box(
      group,
      t.paint('#a8adae', 0.35, 0.8),
      W - 0.06,
      0.035,
      0.008,
      0,
      y,
      front + 0.004,
    );
  const duct = (y: number) =>
    t.box(
      group,
      t.paint('#8f9396', 0.7),
      W - 0.06,
      0.03,
      0.04,
      0,
      y,
      front + 0.02,
    );
  const moduleGrey = t.paint('#e3e2dc', 0.6);
  const dark = t.paint('#3a3d3f', 0.6);
  /** A maker's badge printed on a module's face. */
  const badge = (
    id: BrandId,
    x: number,
    y: number,
    z: number,
    height: number,
    maxWidth: number,
    parent: Group = group,
  ) => {
    const b = createBrandBadge(kit, id, { height, maxWidth });
    b.position.set(x, y, z);
    parent.add(b);
  };
  // Top rail: MCB, PSU, controller, comms module.
  const topY = 0.11;
  rail(topY);
  duct(topY + 0.075);
  duct(topY - 0.075);
  const mcb = disconnectHandle(kit, {
    style: 'dolly',
    modules: 1,
    initial: 'on',
    name: `${tag} MCB`,
  });
  // A DIN module's body behind its dolly.
  t.box(group, moduleGrey, 0.018, 0.085, 0.06, -0.25, topY, front + 0.03);
  mcb.object.position.set(-0.25, topY, front + 0.06);
  group.add(mcb.object);
  parts.add(mcb);
  t.label(
    group,
    'MCB 6A',
    -0.25,
    topY - 0.05,
    front + 0.061,
    0.006,
    '#1b1b1b',
    '#f4f3ee',
  );
  badge('voltara', -0.25, topY - 0.059, front + 0.061, 0.005, 0.03);
  // The 24 V supply.
  t.box(
    group,
    t.paint('#9fa4a6', 0.4, 0.5),
    0.054,
    0.09,
    0.055,
    -0.19,
    topY,
    front + 0.03,
  );
  t.label(
    group,
    '24V DC\n2.5A',
    -0.19,
    topY + 0.02,
    front + 0.0585,
    0.006,
    '#1b1b1b',
  );
  const dcOk = t.led(
    group,
    '#39e05a',
    0.0025,
    -0.19,
    topY - 0.02,
    front + 0.058,
  );
  dcOk.mesh.userData.live = true;
  t.label(group, 'DC OK', -0.19, topY - 0.03, front + 0.0585, 0.004, '#1b1b1b');
  badge('neumann-dynamik', -0.19, topY + 0.038, front + 0.0585, 0.006, 0.048);
  // The controller.
  const plcX = -0.07;
  t.box(group, moduleGrey, 0.144, 0.09, 0.06, plcX, topY, front + 0.03);
  t.box(
    group,
    t.paint('#0f8b8d', 0.5),
    0.144,
    0.012,
    0.0012,
    plcX,
    topY + 0.032,
    front + 0.0606,
  );
  badge('quorvane', plcX - 0.04, topY + 0.032, front + 0.0613, 0.008, 0.06);
  t.label(
    group,
    'QL-12/24RC',
    plcX + 0.04,
    topY + 0.032,
    front + 0.0613,
    0.006,
    '#ffffff',
  );
  const status = (
    [
      ['RUN', '#39e05a'],
      ['STOP', '#ffb21f'],
      ['FAULT', '#ff3324'],
    ] as const
  ).map(([word, colour], i) => {
    const x = plcX - 0.055 + i * 0.022;
    const led = t.led(group, colour, 0.0025, x, topY + 0.012, front + 0.061);
    led.mesh.userData.live = true;
    t.label(group, word, x, topY + 0.004, front + 0.0612, 0.0035, '#1b1b1b');
    return led;
  });
  const io = (legends: readonly string[], y: number, word: string) =>
    legends.map((_, i) => {
      const x = plcX - 0.06 + i * 0.012;
      const led = t.led(group, '#39e05a', 0.0018, x, y, front + 0.061);
      led.mesh.userData.live = true;
      t.label(
        group,
        `${word}${i + 1}`,
        x,
        y - 0.006,
        front + 0.0612,
        0.0028,
        '#1b1b1b',
      );
      return led;
    });
  const inputs = io(BOX_INPUTS, topY - 0.012, 'I');
  const outputs = io(BOX_OUTPUTS, topY - 0.03, 'Q');
  // The comms module: a port and TX/RX LEDs for each terminal.
  const commsX = 0.06;
  t.box(group, moduleGrey, 0.05, 0.09, 0.06, commsX, topY, front + 0.03);
  badge('fankel', commsX, topY + 0.038, front + 0.0606, 0.006, 0.044);
  t.label(
    group,
    'CM-485',
    commsX,
    topY + 0.028,
    front + 0.0606,
    0.005,
    '#1b1b1b',
  );
  // The I/O schedule card beside the controller: every LED named, as a
  // fitter would want when the door is open.
  const schedule = t.printed(
    0.17,
    0.11,
    (c, w, h) => {
      c.fillStyle = '#f4f2e8';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1b1b1b';
      c.font = `bold ${h * 0.075}px Arial`;
      c.fillText(`${tag}  QL-12 I/O`, w * 0.04, h * 0.1);
      c.font = `${h * 0.058}px Arial`;
      BOX_INPUTS.forEach((legend, i) =>
        c.fillText(`I${i + 1}  ${legend}`, w * 0.04, h * (0.22 + i * 0.075)),
      );
      BOX_OUTPUTS.forEach((legend, i) =>
        c.fillText(
          `Q${i + 1}  ${legend}  (K${i + 1})`,
          w * 0.5,
          h * (0.22 + i * 0.075),
        ),
      );
    },
    512,
  );
  schedule.mesh.position.set(0.185, topY, front + 0.0085);
  group.add(schedule.mesh);
  const comms = [0, 1].map((port) => {
    const y = topY + 0.012 - port * 0.03;
    t.box(
      group,
      dark,
      0.02,
      0.012,
      0.004,
      commsX - 0.008,
      y - 0.01,
      front + 0.061,
    );
    t.label(
      group,
      `P${port + 1} OT${port + 1}`,
      commsX - 0.008,
      y,
      front + 0.0612,
      0.0035,
      '#1b1b1b',
    );
    const tx = t.led(
      group,
      '#ffb21f',
      0.0016,
      commsX + 0.014,
      y,
      front + 0.061,
    );
    const rx = t.led(
      group,
      '#39e05a',
      0.0016,
      commsX + 0.014,
      y - 0.008,
      front + 0.061,
    );
    tx.mesh.userData.live = true;
    rx.mesh.userData.live = true;
    return { tx, rx };
  });
  // Middle rail: the interposing relays, each with its LED.
  const relayY = -0.03;
  rail(relayY);
  const relays = BOX_OUTPUTS.map((legend, i) => {
    const x = -0.24 + i * 0.022;
    t.box(
      group,
      t.paint('#2d4f8e', 0.5),
      0.016,
      0.06,
      0.05,
      x,
      relayY,
      front + 0.025,
    );
    const led = t.led(
      group,
      '#ffb21f',
      0.0018,
      x,
      relayY + 0.02,
      front + 0.051,
    );
    led.mesh.userData.live = true;
    t.label(
      group,
      `K${i + 1}`,
      x,
      relayY - 0.018,
      front + 0.051,
      0.004,
      '#ffffff',
    );
    void legend;
    return led;
  });
  t.label(
    group,
    'INTERPOSING RELAYS',
    0.17,
    relayY + 0.008,
    front + 0.01,
    0.006,
    '#1b1b1b',
    '#f4f3ee',
  );
  badge('hartwell-bligh', 0.17, relayY - 0.01, front + 0.01, 0.007, 0.1);
  duct(-0.1);
  // Bottom rail: the field terminals, the day tanks' level signals among them.
  const termY = -0.15;
  rail(termY);
  for (let i = 0; i < 40; i++)
    t.box(
      group,
      t.paint(i % 5 === 4 ? '#3d6fb5' : '#9b9d98', 0.6),
      0.0055,
      0.045,
      0.04,
      -0.24 + i * 0.0062,
      termY,
      front + 0.02,
    );
  t.label(
    group,
    'X1 LEVEL SIGNALS  X2 OUTLETS  X3 TERMINALS',
    0.12,
    termY + 0.03,
    front + 0.042,
    0.005,
    '#1b1b1b',
    '#f4f3ee',
  );
  // Glands underneath, each with its locknut inside and its label tied on
  // below it: the terminals' serial cables, the supply, the field wiring.
  const nut = t.paint('#2a2c2d', 0.45, 0.3);
  const cableColour = (i: number) =>
    i < 2 ? '#6a4c93' : i === 2 ? '#2d2f31' : '#3c4a5a';
  BOX_GLANDS.forEach(({ x, legend }, i) => {
    t.cyl(group, dark, 0.01, 0.016, x, -H / 2 - 0.008, D / 2);
    t.cyl(group, nut, 0.013, 0.006, x, -H / 2 - 0.0005, D / 2, 'y', 6);
    t.cyl(group, nut, 0.013, 0.005, x, -H / 2 + 0.0045, D / 2, 'y', 6);
    const plate = createEngravedPlate(kit, legend.split('\n'), {
      colour: 'white',
      width: 0.075,
      height: 0.034,
    });
    // Tied on the cable, in front of its gland and conduit, as a fitter
    // labels each entry.
    plate.position.set(x, -H / 2 - 0.045, D / 2 + 0.02);
    group.add(plate);
    // Its cable inside, up from the gland.
    const cable = p.paint(cableColour(i), 0.7);
    const z = D / 2;
    const r = i < 2 ? 0.0035 : 0.0045;
    if (i < 2) {
      // The serial cables: up the left of the plate into the lower duct,
      // and out of the upper duct up to the comms module's port.
      const portY = topY + 0.002 - i * 0.03;
      p.rod(group, cable, [x, -H / 2 + 0.008, z], [x, -0.1, z], r, 8);
      p.rod(
        group,
        cable,
        [commsX - 0.008, topY - 0.075, front + 0.062],
        [commsX - 0.008, portY - 0.01, front + 0.062],
        r,
        8,
      );
    } else if (i === 2) {
      // The supply, up the right into the lower duct (on to the MCB).
      p.rod(group, cable, [x, -H / 2 + 0.008, z], [x, -0.1, z], r, 8);
    } else {
      // The field multicores, up into the terminal rail's underside.
      p.rod(
        group,
        cable,
        [x - 0.12, -H / 2 + 0.008, z * 0.6],
        [x - 0.12, termY - 0.024, z * 0.6],
        r,
        8,
      );
      p.rod(
        group,
        cable,
        [x, -H / 2 + 0.008, z * 0.6],
        [x - 0.12, -H / 2 + 0.008, z * 0.6],
        r,
        8,
      );
    }
  });

  // The door, hinged on the left, its isolator and latch on the front.
  const hinge = new Group();
  hinge.position.set(-W / 2, 0, D);
  hinge.userData.live = true;
  group.add(hinge);
  const door = new Group();
  door.position.x = W / 2;
  hinge.add(door);
  const leaf = t.box(door, steel, W, H, 0.018, 0, 0, 0.009);
  leaf.userData.live = true;
  const isolator = disconnectHandle(kit, {
    style: 'rotary',
    initial: 'on',
    sound: 'soft-click',
    name: `${tag} door isolator`,
  });
  isolator.object.position.set(0.17, -0.02, 0.018);
  door.add(isolator.object);
  parts.add(isolator);
  t.label(door, 'ISOLATOR', 0.17, -0.085, 0.019, 0.01, '#1b1b1b', '#f4f3ee');
  badge('voltara', 0.17, -0.11, 0.019, 0.008, 0.08, door);
  // Its engraved tag plate, as every panel in the plant has.
  const tagPlate = createEngravedPlate(
    kit,
    [tag, 'CHEMICAL TRANSFER CONTROL', 'HYPOCHLORITE · ACID'],
    { colour: 'black', width: 0.26, height: 0.085 },
  );
  tagPlate.position.set(-0.1, 0.115, 0.018);
  door.add(tagPlate);
  // The electrical danger sign (ISO 7010 W012), and where it is fed from.
  const danger = createSafetySign(
    kit,
    ['electricity'],
    ['DANGER', '230 V'],
    'landscape',
    0.12,
    0.06,
  );
  danger.position.set(-0.17, 0.02, 0.0185);
  door.add(danger);
  const fed = createEngravedPlate(kit, ['FED FROM', fedFrom], {
    colour: 'white',
    width: 0.12,
    height: 0.032,
  });
  fed.position.set(-0.03, 0.02, 0.018);
  door.add(fed);
  // The maker's rating plate, low on the door.
  t.label(
    door,
    `PENFOLD CONTROLS  TYPE CTC-2\nSERIAL 0312-0447  2003\n230V AC 50Hz  6A  IP65\nWIRING DIAGRAM ${tag}-WD1`,
    -0.1,
    -0.1,
    0.019,
    0.0075,
    '#1b1b1b',
    '#c9ccc8',
  );
  panelMakerMark(kit, door, { width: W, height: H, z: 0.019 });
  const latch = t.cyl(
    door,
    t.paint('#202224', 0.5),
    0.012,
    0.016,
    W / 2 - 0.03,
    0,
    0.026,
    'z',
    16,
  );
  latch.userData.live = true;
  // The wiring diagram in its pocket, inside the door.
  t.box(door, t.paint('#8d9192', 0.6), 0.22, 0.16, 0.004, 0, 0.02, -0.003);
  const diagram = t.printed(
    0.2,
    0.14,
    (c, w, h) => {
      c.fillStyle = '#f2f0e6';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#1b1b1b';
      c.lineWidth = 2;
      c.font = `bold ${h * 0.06}px Arial`;
      c.fillStyle = '#1b1b1b';
      c.fillText(`${tag} WIRING DIAGRAM  SHT 1/4`, w * 0.04, h * 0.08);
      for (let i = 0; i < 9; i++) {
        c.beginPath();
        c.moveTo(w * 0.08, h * (0.2 + i * 0.08));
        c.lineTo(w * 0.92, h * (0.2 + i * 0.08));
        c.stroke();
        c.strokeRect(
          w * (0.15 + (i % 4) * 0.2),
          h * (0.17 + i * 0.08),
          w * 0.06,
          h * 0.06,
        );
      }
    },
    256,
  );
  diagram.mesh.position.set(0, 0.02, -0.006);
  diagram.mesh.rotation.y = Math.PI;
  door.add(diagram.mesh);

  // The door and all on it move: not to be merged with the still parts.
  hinge.traverse((o) => (o.userData.live = true));
  let open = false;
  let angle = 0;
  parts.uses.set(latch, () => (open = !open));
  parts.uses.set(leaf, () => (open = !open));
  let time = 0;
  return {
    object: group,
    parts,
    isolator,
    mcb,
    /** Whether its door stands open. */
    isOpen: () => open,
    setOpen(to: boolean) {
      open = to;
    },
    update(delta: number) {
      time += delta;
      parts.update(delta);
      const target = open ? -1.9 : 0;
      angle += (target - angle) * Math.min(1, delta * 5);
      hinge.rotation.y = angle;
      const r = read();
      dcOk.set(r.live);
      status[0].set(r.running);
      status[1].set(r.live && !r.running && !r.hung);
      status[2].set(r.live && r.hung && time % 1 < 0.5);
      inputs.forEach((led, i) => led.set(r.live && !!r.inputs[i]));
      outputs.forEach((led, i) => led.set(r.running && !!r.outputs[i]));
      relays.forEach((led, i) => led.set(r.running && !!r.outputs[i]));
      comms.forEach(({ tx, rx }, i) => {
        const talking = r.running && !!r.links[i];
        // Each port polled a few times a second.
        const phase = (time * 4 + i * 0.37) % 1;
        tx.set(talking && phase < 0.25);
        rx.set(talking && phase > 0.4 && phase < 0.6);
      });
    },
    /** What can be seen of it: the isolator from outside; inside, the controller's LEDs and the MCB. */
    status() {
      const r = read();
      const at = `isolator at ${isolator.on.value ? 'ON' : 'OFF'}`;
      if (!open) return `Control box ${tag}, door shut, ${at}`;
      const controller = r.running
        ? 'RUN'
        : r.hung
          ? 'FAULT'
          : r.live
            ? 'STOP (starting)'
            : 'dark';
      const breaker =
        mcb.position.value === 'on'
          ? 'MCB on'
          : `MCB ${mcb.position.value.toUpperCase()}`;
      return `Control box ${tag}, door open, ${at}, ${breaker}, controller ${controller}`;
    },
  };
}

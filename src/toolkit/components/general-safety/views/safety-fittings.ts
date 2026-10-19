import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { kitGlow } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { PLATE_WHITE, SANS, tools } from '../../core/views/fitting-tools';

/**
 * Views of general safety fittings: the emergency lighting test key switch,
 * emergency lights and exit signs, the accessible WC's alarm pull cord,
 * reset and over-door light, and warning signs. They only draw:
 * `../parts/safety-parts.ts` gives them their behaviour.
 */

/**
 * The emergency lighting test key switch, after MK's Grid Plus K4898ELWHI
 * in a one-gang grid plate: an 86 × 86 mm white plate with one narrow grid
 * module (25 × 59 mm) in it, a small secret-key cylinder in the module, and
 * the legend printed above it (MK prints EMG LTG TEST). Its key stands in
 * it and turns a quarter turn.
 */
export function createKeyPlate(kit: PanelKit, legend: string) {
  const t = tools(kit);
  const group = new Group();
  const white = t.paint(PLATE_WHITE, 0.35);
  t.box(group, white, 0.086, 0.086, 0.009, 0, 0, 0.0045);
  // The grid module, a shade off the plate's white, standing a little proud.
  t.box(group, t.paint('#ecebe5', 0.4), 0.025, 0.059, 0.002, 0, 0, 0.01);
  t.cyl(
    group,
    t.paint('#c9c4ae', 0.3, 0.8),
    0.0065,
    0.004,
    0,
    -0.008,
    0.012,
    'z',
  );
  t.box(group, t.paint('#2b2b2a'), 0.0012, 0.006, 0.001, 0, -0.008, 0.0142);
  const key = new Group();
  key.position.set(0, -0.008, 0.014);
  key.userData.live = true;
  group.add(key);
  const steel = t.paint('#c5c7c8', 0.25, 0.9);
  // The blade in the cylinder and the flat bow outside it.
  t.box(key, steel, 0.0015, 0.008, 0.006, 0, 0, 0.003);
  const bow = t.box(key, steel, 0.0025, 0.016, 0.018, 0, 0, 0.014);
  t.label(group, legend, 0, 0.015, 0.0111, 0.0032);
  return {
    group,
    key: bow,
    set(on: boolean) {
      key.rotation.z = on ? -Math.PI / 2 : 0;
    },
  };
}

/**
 * A recessed self-contained emergency downlight, after Thorn's Voyager
 * Star (recessed, E3/8T, the high-ceiling lens): a white flange 85 mm
 * across and 2 mm thick, flush with the ceiling, round a small clear lens
 * standing 5 mm proud, and beside it the status window with its green and
 * red LEDs: green on mains and charged; green and red both lit on
 * battery. It hangs from y = 0, facing down.
 */
export function createEmergencyLight(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.0425, 0.002, 0, -0.001, 0, 'y', 32);
  const lens = kitGlow(kit, '#ffffff');
  t.cyl(group, lens, 0.017, 0.005, 0, -0.0045, 0, 'y', 24);
  t.cyl(group, t.paint('#3a3a38', 0.5), 0.004, 0.0006, 0.031, -0.0023, 0);
  const green = t.led(group, '#35e06a', 0.0014, 0.031, -0.0026, -0.0018, 'y');
  const red = t.led(group, '#ff3020', 0.0014, 0.031, -0.0026, 0.0018, 'y');
  const dark = new Color('#c9cbc8');
  const bright = new Color('#f2f6ff');
  return {
    group,
    set(lit: boolean, charged: boolean) {
      lens.color.copy(lit ? bright : dark);
      green.set(charged || lit);
      red.set(lit);
    },
  };
}

/**
 * A self-contained emergency bulkhead, after LEDVANCE's EM BULKHEAD E
 * (non-maintained, auto-test): a white rounded box 355 × 115 × 63 mm, its
 * whole front an opal diffuser, with a green charge LED and a test button
 * at one end of its base. On the wall over a door, long side across.
 */
export function createEmergencyBulkhead(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const white = t.paint(PLATE_WHITE, 0.45);
  t.box(group, white, 0.355, 0.115, 0.022, 0, 0, 0.011);
  // The base's rounded ends.
  for (const x of [-0.1775, 0.1775])
    t.cyl(group, white, 0.0575, 0.022, x * 0.92, 0, 0.011, 'z', 20).scale.set(
      0.35,
      1,
      1,
    );
  const diffuser = kitGlow(kit, '#ffffff');
  t.box(group, t.paint('#d8dbd8', 0.65), 0.345, 0.105, 0.039, 0, 0, 0.0415);
  t.box(group, diffuser, 0.333, 0.093, 0.001, 0, 0, 0.0625);
  const green = t.led(group, '#35e06a', 0.0025, 0.15, -0.05, 0.023);
  t.cyl(group, t.paint('#d9d9d4', 0.6), 0.004, 0.003, 0.135, -0.05, 0.023, 'z');
  const dark = new Color('#dcdcd6');
  const bright = new Color('#f2f6ff');
  diffuser.color.copy(dark);
  return {
    group,
    set(lit: boolean, charged: boolean) {
      diffuser.color.copy(lit ? bright : dark);
      green.set(charged);
    },
  };
}

/**
 * A maintained LED exit box sign, after the EXIT3MLISO (390 × 192 × 60 mm,
 * 32 m viewing distance): a white steel box with a polycarbonate legend
 * panel filling its front, lit evenly from within, ISO 7010's running man
 * leaving through a doorway with an arrow straight on (up), white on
 * safety green; an opal strip in its base lights the way below it, and
 * beside the strip are its green charge LED and test button. Maintained,
 * so always lit, dimmer on its battery.
 */
export function createExitSign(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#eeeee9', 0.4), 0.39, 0.192, 0.06, 0, 0, 0.03);
  const face = t.printed(
    0.36,
    0.16,
    (c, w, h) => {
      c.fillStyle = '#00894a';
      c.fillRect(0, 0, w, h);
      c.fillStyle = c.strokeStyle = '#ffffff';
      const u = h / 10;
      // The arrow, straight on.
      c.lineWidth = u * 0.9;
      c.beginPath();
      c.moveTo(u * 3, u * 8.6);
      c.lineTo(u * 3, u * 2.6);
      c.stroke();
      c.beginPath();
      c.moveTo(u * 3, u * 1.2);
      c.lineTo(u * 5, u * 3.6);
      c.lineTo(u * 1, u * 3.6);
      c.closePath();
      c.fill();
      // The doorway, on the right.
      c.lineWidth = u * 0.7;
      c.strokeRect(u * 22, u * 1.2, u * 7.6, u * 7.6);
      c.fillStyle = '#00894a';
      c.fillRect(u * 21.5, u * 3, u * 1.2, u * 6.4);
      c.fillStyle = '#ffffff';
      // The running man, leaving it to the left.
      c.lineCap = 'round';
      c.lineWidth = u * 1.1;
      c.beginPath();
      c.arc(u * 17, u * 2.1, u * 1.05, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(u * 16.4, u * 3.6);
      c.lineTo(u * 17.6, u * 6.2);
      c.lineTo(u * 15.4, u * 7.4);
      c.lineTo(u * 14.6, u * 9.2);
      c.moveTo(u * 17.6, u * 6.2);
      c.lineTo(u * 19.6, u * 7.2);
      c.lineTo(u * 20.6, u * 9);
      c.moveTo(u * 16.6, u * 4.2);
      c.lineTo(u * 14.4, u * 4.8);
      c.lineTo(u * 13.2, u * 6.2);
      c.moveTo(u * 16.8, u * 4.2);
      c.lineTo(u * 18.8, u * 5.4);
      c.lineTo(u * 20.6, u * 4.6);
      c.stroke();
    },
    512,
    true,
  );
  face.mesh.position.z = 0.0605;
  group.add(face.mesh);
  const strip = kitGlow(kit, '#ffffff');
  t.box(group, strip, 0.26, 0.002, 0.03, -0.03, -0.0965, 0.032);
  const charge = t.led(group, '#35e06a', 0.0025, 0.14, -0.0965, 0.03, 'y');
  t.cyl(group, t.paint('#d9d9d4', 0.6), 0.004, 0.003, 0.16, -0.097, 0.03);
  const material = face.mesh.material as MeshBasicMaterial;
  return {
    group,
    set(level: number, charged = level >= 1) {
      material.color.setScalar(0.4 + level * 0.6);
      strip.color.setScalar(0.5 + level * 0.5);
      charge.set(charged);
    },
  };
}

/**
 * An accessible toilet's emergency alarm: the red pull cord with its two
 * bangles, the reset button plate, and the over-door light.
 */
export function createToiletAlarm(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const red = t.paint('#c4231c', 0.6);
  // The cord hangs from the ceiling at y = 0 down to near the floor.
  const cord = new Group();
  group.add(cord);
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.035, 0.03, 0, -0.015, 0);
  t.cyl(cord, red, 0.002, 2.4, 0, -1.23, 0, 'y', 6);
  for (const y of [-1.6, -2.35]) {
    const bangle = new Mesh(new TorusGeometry(0.025, 0.004, 6, 16), red);
    bangle.position.set(0, y, 0);
    cord.add(bangle);
  }
  const bangle = cord.children[cord.children.length - 1] as Mesh;
  let dip = 0;
  return {
    group,
    bangle,
    cord,
    pull() {
      dip = 1;
    },
    update(delta: number) {
      dip = Math.max(0, dip - delta * 3);
      cord.position.y = -Math.sin(dip * Math.PI) * 0.08;
    },
  };
}

/** The toilet alarm's reset plate: RESET button and acknowledge lamp. */
export function createAlarmReset(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.35), 0.086, 0.086, 0.01, 0, 0, 0.005);
  const button = t.cyl(
    group,
    t.paint('#c4231c', 0.4),
    0.016,
    0.008,
    0,
    -0.004,
    0.014,
    'z',
    20,
  );
  t.label(group, 'ALARM RESET', 0, -0.032, 0.0105, 0.005);
  const lamp = t.led(group, '#ff3020', 0.005, 0, 0.026, 0.011);
  return { group, button, set: lamp.set };
}

/** An over-door alarm light: a red dome that flashes in alarm. */
export function createOverDoorLight(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.4), 0.12, 0.08, 0.03, 0, 0, 0.015);
  const lens = kitGlow(kit, '#ff3020');
  const dome = new Mesh(
    new SphereGeometry(0.035, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    lens,
  );
  dome.rotation.x = Math.PI / 2;
  dome.position.z = 0.03;
  group.add(dome);
  const off = new Color('#5a1d18');
  const on = new Color('#ff4a35');
  let time = 0;
  let alarm = false;
  return {
    group,
    set(value: boolean) {
      alarm = value;
    },
    update(delta: number) {
      time += delta;
      lens.color.copy(alarm && time % 0.8 < 0.4 ? on : off);
    },
  };
}

/** A yellow warning sign, black lettering and border, `w` × `h` metres. */
export function createWarningSign(
  kit: PanelKit,
  lines: string[],
  w = 0.3,
  h = 0.2,
) {
  const t = tools(kit);
  const sign = t.printed(
    w,
    h,
    (c, cw, ch) => {
      c.fillStyle = '#f2c618';
      c.fillRect(0, 0, cw, ch);
      c.strokeStyle = '#151515';
      c.lineWidth = ch * 0.05;
      c.strokeRect(ch * 0.05, ch * 0.05, cw - ch * 0.1, ch - ch * 0.1);
      c.fillStyle = '#151515';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const size = (ch * 0.7) / lines.length;
      lines.forEach((line, i) => {
        // Each line as large as it can be, within the border.
        let px = i === 0 ? size * 1.15 : size * 0.8;
        c.font = `bold ${px}px ${SANS}`;
        const width = c.measureText(line).width;
        if (width > cw * 0.86) px *= (cw * 0.86) / width;
        c.font = `bold ${px}px ${SANS}`;
        c.fillText(
          line,
          cw / 2,
          ch * 0.5 + (i - (lines.length - 1) / 2) * size * 1.05,
        );
      });
    },
    384,
  );
  return sign.mesh;
}

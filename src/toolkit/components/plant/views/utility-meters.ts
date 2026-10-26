import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TorusGeometry,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';

/**
 * The site's utility meters (prompt 083; the owner, 2026-10-26: modern
 * meters after real reference designs), each showing a register it is
 * given, drawn after:
 *
 * - **electricity**: a three-phase, CT-operated commercial meter, after
 *   the Landis+Gyr E650 and the Elster A1700, made by Kessler-Moody: a
 *   light-grey body (177 × 265 × 82 mm) under a clear, wire-sealed lid, an
 *   8-digit backlit LCD scrolling its registers, red kWh and kvarh pulse
 *   LEDs, an optical port, scroll buttons and its rating plate;
 * - **gas**: a rotary meter after the Elster RABO and RVG, made by
 *   Trager-Feinstein: a cast aluminium twin-rotor body between flanges,
 *   a domed index with an 8-drum counter in m³ (the last drums red), oil
 *   sight-glasses on its end covers, and a separate data logger;
 * - **water**: an ultrasonic meter after the Kamstrup flowIQ 3100 DN100,
 *   made by Trager-Feinstein: a blue epoxy flanged body, its sealed
 *   register's LCD reading m³ to three decimals.
 *
 * Each built with its origin at its middle, its face toward +z. Around
 * them, the installations the site's intake holds, sized for the centre
 * (three pools, about 1 MW of boilers, a few hundred kVA, a DN100 main):
 *
 * - `createElectricityMeteringCabinet`: a GRP CT metering cabinet of the
 *   UK pattern: the meter over its test terminal block, a 4G modem, and
 *   the sealed CT chamber below;
 * - `createGasMeterTrain`: the UK commercial meter installation in
 *   yellow-painted DN80 pipe: emergency control valve, filter, slam-shut
 *   regulator with its relief vent, the meter and its volume converter
 *   (after the Elster EK205), the outlet valve;
 * - `createWaterMeterSet`: the DN100 main's set: gate valve, Y-strainer,
 *   the meter, a dismantling joint, gate valve.
 */

const paint = (
  kit: PanelKit,
  color: string,
  roughness = 0.55,
  metalness = 0,
) => {
  const m = new MeshStandardMaterial({ color, roughness, metalness });
  kit.materials.push(m);
  return m;
};
function box(
  p: Object3D,
  m: Material,
  w: number,
  h: number,
  d: number,
  x = 0,
  y = 0,
  z = 0,
) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  p.add(mesh);
  return mesh;
}
function cyl(
  p: Object3D,
  m: Material,
  r: number,
  h: number,
  axis: 'x' | 'y' | 'z',
  x = 0,
  y = 0,
  z = 0,
  seg = 24,
) {
  const mesh = new Mesh(new CylinderGeometry(r, r, h, seg), m);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  p.add(mesh);
  return mesh;
}

/** A display face of `w` × `h` metres drawn by `draw` whenever it changes. */
/** A clear cover (a lid, a window) of the given opacity. */
function clear(kit: PanelKit, opacity: number) {
  const m = new MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.05,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  kit.materials.push(m);
  return m;
}

function face(
  kit: PanelKit,
  w: number,
  h: number,
  px: number,
  draw: (
    g: CanvasRenderingContext2D,
    W: number,
    H: number,
    text: string,
  ) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * px);
  canvas.height = Math.round(h * px);
  const g = canvas.getContext('2d')!;
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  kit.textures.push(map);
  const m = new MeshBasicMaterial({ map });
  kit.materials.push(m);
  const mesh = new Mesh(new PlaneGeometry(w, h), m);
  mesh.userData.live = true;
  let shown: string | null = null;
  const show = (text: string) => {
    if (text === shown) return;
    shown = text;
    draw(g, canvas.width, canvas.height, text);
    map.needsUpdate = true;
  };
  return { mesh, show };
}

// ---- Electricity --------------------------------------------------------

/** The registers the meter scrolls through, OBIS code first. */
const ELEC_PAGES = ['1.8.0', '1.7.0', '0.9.1'] as const;

export function createCtElectricityMeter(kit: PanelKit) {
  const group = new Group();
  group.name = 'Kessler-Moody three-phase CT meter';
  const W = 0.177;
  const H = 0.265;
  const D = 0.082;
  const F = D * 0.7;
  // Its base, its hanging bracket and its sealed terminal cover under it.
  box(group, paint(kit, '#c9ccc9', 0.6), W, H, F, 0, 0, F / 2);
  box(
    group,
    paint(kit, '#b0b3b0', 0.6),
    0.03,
    0.02,
    0.01,
    0,
    H / 2 + 0.008,
    0.005,
  );
  const cover = paint(kit, '#b5b8b5', 0.6);
  box(group, cover, W, 0.07, F + 0.004, 0, -H / 2 - 0.035, F / 2 + 0.002);
  // The terminal cover's two sealing screws, each wired and lead-sealed.
  const lead = paint(kit, '#6e7174', 0.4, 0.7);
  for (const s of [-1, 1]) {
    cyl(group, lead, 0.004, 0.004, 'z', s * 0.07, -H / 2 - 0.05, F + 0.006, 10);
    cyl(
      group,
      lead,
      0.005,
      0.003,
      'z',
      s * 0.07,
      -H / 2 - 0.066,
      F + 0.006,
      10,
    );
  }
  // Its faceplate.
  const plate = paint(kit, '#e9eae6', 0.7);
  box(group, plate, W - 0.016, H - 0.02, 0.002, 0, 0, F + 0.001);
  const fz = F + 0.003;
  // The LCD: 8 digits, the OBIS register code, phase marks and the
  // direction arrows, backlit.
  const lcd = face(kit, 0.12, 0.042, 2000, (g, w, h, text) => {
    const [code, value, unit] = text.split('|');
    g.fillStyle = '#c5d6b0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#18200f';
    g.font = `bold ${h * 0.5}px monospace`;
    g.textBaseline = 'middle';
    g.textAlign = 'right';
    g.fillText(value, w * 0.8, h * 0.56);
    g.font = `${h * 0.2}px sans-serif`;
    g.textAlign = 'left';
    g.fillText(code, w * 0.03, h * 0.17);
    g.fillText('L1 L2 L3   +P →', w * 0.03, h * 0.9);
    g.textAlign = 'right';
    g.fillText(unit, w * 0.98, h * 0.6);
    g.fillText('T1', w * 0.98, h * 0.17);
  });
  lcd.mesh.position.set(0, 0.06, fz);
  group.add(lcd.mesh);
  // The pulse LEDs: kWh and kvarh, red, a flash for each unit counted.
  const leds = ['kWh', 'kvarh'].map((name, i) => {
    const m = new MeshBasicMaterial({ color: '#3a0d0d' });
    kit.materials.push(m);
    const led = cyl(
      group,
      m,
      0.004,
      0.003,
      'z',
      -0.05 + i * 0.04,
      0.005,
      fz,
      12,
    );
    led.userData.live = true;
    const label = createMicroLabel(kit, `${name}\n10000 imp`, {
      height: 0.0035,
      ink: '#222222',
    });
    label.position.set(-0.05 + i * 0.04, -0.012, fz);
    group.add(label);
    return m;
  });
  // The optical port (IEC 62056-21): a steel ring for the magnetic probe.
  const ring = new Mesh(
    new TorusGeometry(0.011, 0.002, 8, 20),
    paint(kit, '#8d9294', 0.3, 0.8),
  );
  ring.position.set(0.05, 0.005, fz);
  group.add(ring);
  cyl(
    group,
    paint(kit, '#1a1a1a', 0.2),
    0.009,
    0.001,
    'z',
    0.05,
    0.005,
    fz,
    20,
  );
  // Two scroll buttons, one sealable (the reset).
  for (const x of [-0.02, 0.02])
    cyl(
      group,
      paint(kit, '#2a5a9a', 0.5),
      0.007,
      0.006,
      'z',
      x,
      -0.04,
      fz + 0.001,
      16,
    );
  // Its rating plate's legend, the approval mark and the serial.
  const rating = createMicroLabel(
    kit,
    '3×230/400 V  50 Hz  1(10) A  CT 600/5 A\nCl. 0.5S (C)  kWh Cl. 1 kvarh  M26 0120\nMID B+D  No. 41 08 75 223',
    { height: 0.0032, ink: '#333333' },
  );
  rating.position.set(0, -0.085, fz);
  group.add(rating);
  const badge = createBrandBadge(kit, 'kessler-moody', { height: 0.012 });
  badge.position.set(0, 0.11, fz);
  group.add(badge);
  // The clear lid over it all, sealed.
  const lid = new MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.05,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  kit.materials.push(lid);
  box(group, lid, W + 0.004, H + 0.004, 0.02, 0, 0, F + 0.012);
  let phase = 0;
  let clock = 0;
  return {
    group,
    /**
     * The register, kWh; the load, kW, setting the kWh LED's flashing;
     * the seconds since the last call. The LCD scrolls its registers:
     * import kWh, demand kW, the time.
     */
    show(kwh: number, kw: number, delta: number) {
      clock += delta;
      const page = ELEC_PAGES[Math.floor(clock / 5) % ELEC_PAGES.length];
      if (page === '1.8.0')
        lcd.show(`${page}|${Math.floor(kwh).toString().padStart(8, '0')}|kWh`);
      else if (page === '1.7.0') lcd.show(`${page}|${kw.toFixed(2)}|kW`);
      else {
        const t = Math.floor(clock) % 86400;
        const hh = String(Math.floor(t / 3600) + 6).padStart(2, '0');
        const mm = String(Math.floor(t / 60) % 60).padStart(2, '0');
        lcd.show(`${page}|${hh}:${mm}|`);
      }
      // One flash per 0.1 kWh, as a slowed-down 10000 imp/kWh LED reads.
      phase += (kw / 360) * delta * 10;
      const on = phase % 1 < 0.15;
      leds[0].color.set(on && kw > 0 ? '#ff2a1e' : '#3a0d0d');
      leds[1].color.set(
        on && kw > 0 && phase % 3 < 0.15 ? '#ff2a1e' : '#3a0d0d',
      );
    },
  };
}

/**
 * A GSM/4G meter modem (after the Sierra/Telit metering modems on a DIN
 * clip): its power, network and data LEDs, an RS-485 port to the meter
 * and a stub aerial. `blink(t)` flashes the data LED as it reports.
 */
function createModem(kit: PanelKit) {
  const group = new Group();
  box(group, paint(kit, '#2c2f33', 0.5), 0.09, 0.11, 0.045, 0, 0, 0.0225);
  const label = createMicroLabel(kit, 'AMR 4G\nPWR  NET  DATA', {
    height: 0.004,
    ink: '#d8d8d8',
  });
  label.position.set(0, 0.03, 0.046);
  group.add(label);
  const lamps = ['#20d040', '#20d040', '#f0a020'].map((c, i) => {
    const m = new MeshBasicMaterial({ color: c });
    kit.materials.push(m);
    const l = cyl(
      group,
      m,
      0.0025,
      0.002,
      'z',
      -0.02 + i * 0.02,
      0.01,
      0.046,
      10,
    );
    l.userData.live = true;
    return { m, c };
  });
  cyl(
    group,
    paint(kit, '#c8c8c8', 0.3, 0.8),
    0.006,
    0.012,
    'y',
    0.03,
    0.061,
    0.02,
    12,
  );
  cyl(
    group,
    paint(kit, '#111111', 0.6),
    0.005,
    0.09,
    'y',
    0.03,
    0.11,
    0.02,
    12,
  );
  box(
    group,
    paint(kit, '#1a6a3a', 0.6),
    0.03,
    0.012,
    0.012,
    -0.02,
    -0.06,
    0.02,
  );
  return {
    group,
    blink(t: number) {
      const net = t % 2 < 0.1;
      const data = t % 15 < 1.5 && t % 0.3 < 0.15;
      lamps[1].m.color.set(net ? '#9dff9d' : lamps[1].c);
      lamps[2].m.color.set(data ? '#ffd27a' : '#3a2a10');
    },
  };
}

/**
 * The site's electricity metering cabinet (after the Ritherdon/Elsewedy
 * GRP CT metering cabinets of UK HV/LV intakes): 800 × 1200 × 320 mm,
 * grey, its door open on a white backboard holding the meter, the test
 * terminal block under it (voltage links and CT shorting links, sealed),
 * the modem, and the sealed CT chamber across the bottom where the three
 * 600/5 A CTs sit on the incoming tails. Its origin at the middle of its
 * back, on the wall; its face toward +z.
 */
export function createElectricityMeteringCabinet(kit: PanelKit) {
  const group = new Group();
  group.name = 'Electricity metering cabinet';
  const W = 0.8;
  const H = 1.2;
  const D = 0.32;
  const grp = paint(kit, '#b9bdb8', 0.7);
  // The shell: back, sides, top and bottom, and its door hung open.
  box(group, grp, W, H, 0.01, 0, 0, 0.005);
  for (const s of [-1, 1])
    box(group, grp, 0.012, H, D, (s * (W - 0.012)) / 2, 0, D / 2);
  for (const s of [-1, 1])
    box(group, grp, W, 0.012, D, 0, (s * (H - 0.012)) / 2, D / 2);
  const door = new Group();
  door.position.set(-W / 2, 0, D);
  door.rotation.y = -1.6;
  box(door, grp, W, H, 0.015, W / 2, 0, 0);
  const warn = createMicroLabel(kit, '⚡ DANGER 400 V\nELECTRICITY METER', {
    height: 0.03,
    ink: '#111111',
    plate: '#f6d21a',
  });
  warn.position.set(W / 2, 0.35, -0.009);
  warn.rotation.y = Math.PI;
  door.add(warn);
  group.add(door);
  // The backboard.
  box(
    group,
    paint(kit, '#efefea', 0.8),
    W - 0.06,
    H - 0.32,
    0.018,
    0,
    0.12,
    0.02,
  );
  const bz = 0.029;
  const meter = createCtElectricityMeter(kit);
  meter.group.position.set(-0.15, 0.32, bz);
  group.add(meter.group);
  const modem = createModem(kit);
  modem.group.position.set(0.2, 0.36, bz);
  group.add(modem.group);
  // The cable from the modem to the meter's comms terminal.
  box(
    group,
    paint(kit, '#1d1d1d', 0.6),
    0.27,
    0.006,
    0.006,
    0.0,
    0.16,
    bz + 0.03,
  );
  // The test terminal block: black, ten positions (three voltages and
  // neutral, three CT pairs), each with its link and test socket.
  const ttb = new Group();
  ttb.position.set(-0.05, -0.02, bz);
  box(ttb, paint(kit, '#1b1b1b', 0.6), 0.42, 0.11, 0.05, 0, 0, 0.025);
  const brass = paint(kit, '#b48a3c', 0.35, 0.8);
  const red = paint(kit, '#b21f1f', 0.5);
  for (let i = 0; i < 10; i++) {
    const x = -0.19 + i * 0.042;
    box(ttb, i < 4 ? red : brass, 0.012, 0.05, 0.006, x, 0.0, 0.053);
    cyl(ttb, brass, 0.004, 0.006, 'z', x, 0.038, 0.053, 10);
    cyl(ttb, brass, 0.004, 0.006, 'z', x, -0.038, 0.053, 10);
  }
  // Its clear sealed cover.
  box(ttb, clear(kit, 0.15), 0.43, 0.12, 0.004, 0, 0, 0.065);
  const ttbLabel = createMicroLabel(
    kit,
    'TEST TERMINAL BLOCK   V1 V2 V3 N   S1/S2 ×3',
    {
      height: 0.009,
      ink: '#151515',
    },
  );
  ttbLabel.position.set(0, -0.07, 0.03);
  ttb.add(ttbLabel);
  group.add(ttb);
  // The wiring loom from the block up to the meter's terminals.
  const wire = paint(kit, '#3a3a3a', 0.6);
  for (let i = 0; i < 6; i++)
    box(group, wire, 0.004, 0.13, 0.004, -0.2 + i * 0.022, 0.1, bz + 0.012);
  // The CT chamber: a sealed steel cover across the foot.
  const lead = paint(kit, '#6e7174', 0.4, 0.7);
  const ct = paint(kit, '#8f9497', 0.45, 0.5);
  box(group, ct, W - 0.04, 0.26, 0.03, 0, -0.45, D - 0.03);
  for (const x of [-0.34, 0.34])
    for (const y of [-0.34, -0.56])
      cyl(group, lead, 0.006, 0.006, 'z', x, y, D - 0.012, 10);
  const ctLabel = createMicroLabel(
    kit,
    'CT CHAMBER — SEALED\nCTs 600/5 A Cl. 0.5S  15 VA',
    {
      height: 0.018,
      ink: '#151515',
      plate: '#f0ede3',
    },
  );
  ctLabel.position.set(0, -0.45, D - 0.014);
  group.add(ctLabel);
  // The tails: three phases and neutral, up through the floor gland.
  const tails = ['#7a4a2a', '#222222', '#8a8a8a', '#2a5ab0'];
  tails.forEach((c, i) =>
    cyl(
      group,
      paint(kit, c, 0.6),
      0.016,
      0.6,
      'y',
      -0.21 + i * 0.14,
      -H / 2 - 0.3,
      0.12,
      12,
    ),
  );
  const mpan = createMicroLabel(kit, 'MPAN  00 845 101\n12 1234 5678 905', {
    height: 0.014,
    ink: '#111111',
    plate: '#ffffff',
  });
  mpan.position.set(0.22, 0.2, bz + 0.002);
  group.add(mpan);
  let t = 0;
  return {
    group,
    show(kwh: number, kw: number, delta: number) {
      t += delta;
      meter.show(kwh, kw, delta);
      modem.blink(t);
    },
  };
}

// ---- Gas ------------------------------------------------------------------

/**
 * The rotary gas meter, G100 (Qmax 160 m³/h, enough for the boilers' 100
 * to 160 m³/h), DN80, 171 mm laying length as the RVG's: its twin-rotor
 * body in cast aluminium between flanges, end covers with oil
 * sight-glasses (one each end, oil to the line), its index head with an
 * 8-drum counter (the last three red, litres), the LF pulser socket and
 * its lead seals, and the flow arrow cast in the body. Flow along +x.
 */
export function createRotaryGasMeter(kit: PanelKit, { flangeR = 0.1 } = {}) {
  const group = new Group();
  group.name = 'Trager-Feinstein rotary gas meter';
  const ali = paint(kit, '#a7acad', 0.45, 0.6);
  const grey = paint(kit, '#7d8285', 0.5, 0.4);
  // The body: the rotors' chamber, its axis front to back (z), the flow
  // across it (x), with ribs cast round it.
  box(group, ali, 0.13, 0.17, 0.2, 0, 0, 0);
  cyl(group, ali, 0.09, 0.2, 'z', 0, 0, 0, 28);
  for (const y of [-0.06, 0, 0.06])
    box(group, ali, 0.135, 0.008, 0.21, 0, y, 0);
  for (const s of [-1, 1]) {
    cyl(group, ali, 0.05, 0.03, 'x', s * 0.07, 0, 0, 20);
    cyl(group, grey, flangeR, 0.02, 'x', s * 0.0855, 0, 0, 24);
    // The flange bolts, eight on a 160 mm circle.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      cyl(
        group,
        grey,
        0.007,
        0.05,
        'x',
        s * 0.0855,
        Math.cos(a) * 0.08,
        Math.sin(a) * 0.08,
        8,
      );
    }
  }
  // The end covers, front and back, each with its oil sight-glass.
  for (const s of [-1, 1]) {
    cyl(group, grey, 0.095, 0.025, 'z', 0, 0, s * 0.112, 28);
    const glass = new MeshStandardMaterial({
      color: '#d8b04a',
      roughness: 0.1,
      transparent: true,
      opacity: 0.75,
    });
    kit.materials.push(glass);
    cyl(group, grey, 0.016, 0.008, 'z', 0.05, -0.05, s * 0.126, 16);
    cyl(group, glass, 0.012, 0.01, 'z', 0.05, -0.05, s * 0.128, 16);
    cyl(group, grey, 0.008, 0.01, 'z', -0.05, 0.06, s * 0.128, 6);
  }
  // The index head on top, facing front: black, its window and counter.
  const head = new Group();
  head.position.set(0, 0.125, 0.02);
  box(head, paint(kit, '#2b2d2f', 0.5), 0.13, 0.08, 0.1, 0, 0, 0);
  const counter = face(kit, 0.1, 0.02, 3000, (g, w, h, text) => {
    g.fillStyle = '#111111';
    g.fillRect(0, 0, w, h);
    const cw = w / 8;
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i >= 5 ? '#b21f1f' : '#f2f2ea';
      g.fillRect(i * cw + 2, 2, cw - 4, h - 4);
      g.fillStyle = i >= 5 ? '#ffffff' : '#111111';
      g.font = `bold ${h * 0.7}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text[i] ?? '0', i * cw + cw / 2, h * 0.54);
    }
  });
  counter.mesh.position.set(0, 0.012, 0.051);
  head.add(counter.mesh);
  const units = createMicroLabel(
    kit,
    'm³   G100  Qmax 160 m³/h  pmax 16 bar\n1 imp = 0.1 m³  MID  −20…+60 °C',
    {
      height: 0.0045,
      ink: '#f2f2ea',
    },
  );
  units.position.set(0, -0.016, 0.051);
  head.add(units);
  // The window over the counter.
  box(head, clear(kit, 0.2), 0.11, 0.03, 0.004, 0, 0.012, 0.054);
  // The LF pulser socket (Binder, 6-pin) on the head's side.
  cyl(
    head,
    paint(kit, '#8d9294', 0.3, 0.8),
    0.009,
    0.015,
    'x',
    0.072,
    0,
    0,
    14,
  );
  // Two lead seals on the head's screws.
  for (const s of [-1, 1])
    cyl(
      head,
      paint(kit, '#6e7174', 0.4, 0.7),
      0.005,
      0.004,
      'z',
      s * 0.055,
      -0.03,
      0.052,
      10,
    );
  group.add(head);
  const badge = createBrandBadge(kit, 'trager-feinstein', { height: 0.012 });
  badge.position.set(0, 0.04, 0.126);
  group.add(badge);
  const arrow = createMicroLabel(kit, '→', { height: 0.03, ink: '#5d6264' });
  arrow.position.set(0, -0.085, 0.101);
  group.add(arrow);
  return {
    group,
    /** The register, m³: five black drums, three red (litres ×10, ×100). */
    show(m3: number) {
      counter.show(
        Math.floor(m3 * 1000)
          .toString()
          .padStart(8, '0')
          .slice(-8),
      );
    },
  };
}

/**
 * A volume converter (after the Elster EK205): a grey, sealed box with a
 * two-line LCD paging corrected volume Vb, uncorrected Vm, pressure and
 * temperature; its arrow key, optical port, and the cables to the
 * meter's pulser and to the pressure and temperature sensors.
 */
function createVolumeConverter(kit: PanelKit) {
  const group = new Group();
  box(group, paint(kit, '#c3c6c4', 0.6), 0.125, 0.19, 0.07, 0, 0, 0.035);
  const lcd = face(kit, 0.09, 0.03, 2000, (g, w, h, text) => {
    const [a, b] = text.split('|');
    g.fillStyle = '#b6c6a3';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#18200f';
    g.font = `bold ${h * 0.36}px monospace`;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(a, w * 0.04, h * 0.28);
    g.fillText(b, w * 0.04, h * 0.74);
  });
  lcd.mesh.position.set(0, 0.05, 0.071);
  group.add(lcd.mesh);
  cyl(
    group,
    paint(kit, '#2a5a9a', 0.5),
    0.007,
    0.006,
    'z',
    -0.025,
    0.0,
    0.072,
    16,
  );
  const ring = new Mesh(
    new TorusGeometry(0.01, 0.002, 8, 20),
    paint(kit, '#8d9294', 0.3, 0.8),
  );
  ring.position.set(0.03, 0.0, 0.071);
  group.add(ring);
  const label = createMicroLabel(
    kit,
    'VOLUME CONVERTER\nPTZ  Ex ia  ATEX II 1G\nSEALED',
    {
      height: 0.006,
      ink: '#222222',
    },
  );
  label.position.set(0, -0.05, 0.071);
  group.add(label);
  const badge = createBrandBadge(kit, 'trager-feinstein', { height: 0.009 });
  badge.position.set(0, 0.08, 0.071);
  group.add(badge);
  // Three cable glands underneath.
  for (const x of [-0.035, 0, 0.035])
    cyl(
      group,
      paint(kit, '#2b2d2f', 0.5),
      0.007,
      0.02,
      'y',
      x,
      -0.105,
      0.035,
      10,
    );
  let clock = 0;
  return {
    group,
    show(m3: number, delta: number) {
      clock += delta;
      // Vb from Vm at about 21 mbar and 12 °C: a factor of about 1.02.
      const page = Math.floor(clock / 4) % 3;
      if (page === 0) lcd.show(`Vb ${(m3 * 1.0234).toFixed(0).padStart(9)}|m3`);
      else if (page === 1) lcd.show(`Vm ${m3.toFixed(0).padStart(9)}|m3`);
      else lcd.show('p   1.0346 bar|T   12.4 C');
    },
  };
}

/** Yellow pipe, flanges and handles, shared by the gas train's parts. */
function gasKit(kit: PanelKit) {
  return {
    yellow: paint(kit, '#e8c21a', 0.5),
    steel: paint(kit, '#7d8285', 0.5, 0.4),
    red: paint(kit, '#c0201c', 0.5),
  };
}

/**
 * The site's gas meter installation, wall-hung on brackets in its
 * housing, DN80 throughout, flow left to right at 0.9 m centre height:
 * the emergency control valve (a lever ball valve, its handle red, along
 * the pipe when open), the filter, the slam-shut regulator (after the
 * Elster J48 type: its diaphragm case, slam-shut reset cap and impulse
 * line) with its relief valve vented up and out, the rotary meter, the
 * volume converter on the wall above it, and the outlet valve. Labels:
 * the ECV notice and "GAS" with flow arrows. Origin at the middle of its
 * back, on the wall; face toward +z.
 */
export function createGasMeterTrain(kit: PanelKit) {
  const group = new Group();
  group.name = 'Gas meter installation';
  const { yellow, steel, red } = gasKit(kit);
  const z = 0.22;
  const r = 0.045;
  const pipe = (x0: number, x1: number) =>
    cyl(group, yellow, r, x1 - x0, 'x', (x0 + x1) / 2, 0, z, 20);
  const flange = (x: number) => cyl(group, yellow, 0.1, 0.02, 'x', x, 0, z, 24);
  const valve = (x: number, label: string) => {
    flange(x - 0.07);
    flange(x + 0.07);
    cyl(group, yellow, 0.07, 0.12, 'x', x, 0, z, 20);
    cyl(group, steel, 0.015, 0.05, 'y', x, 0.08, z, 10);
    // The lever, along the pipe: open; on its spindle, so it can be turned
    // a quarter across the pipe to shut it.
    const lever = new Group();
    lever.position.set(x, 0.11, z);
    box(lever, red, 0.22, 0.02, 0.025, 0.09, 0, 0);
    group.add(lever);
    const tag = createMicroLabel(kit, label, {
      height: 0.016,
      ink: '#111111',
      plate: '#ffffff',
    });
    tag.position.set(x, -0.14, z + 0.02);
    group.add(tag);
    return lever;
  };
  // Upstream riser in from the floor, then across.
  cyl(group, yellow, r, 1.0, 'y', -1.3, -0.5, z, 20);
  cyl(group, yellow, r * 1.15, r * 2.3, 'x', -1.3, 0, z, 20);
  pipe(-1.3, -1.1);
  const ecv = valve(-1.0, 'ECV');
  pipe(-0.93, -0.8);
  // The filter: a pot under the line, its drain plug, a dP gauge.
  flange(-0.8);
  cyl(group, steel, 0.08, 0.26, 'y', -0.68, -0.05, z, 20);
  cyl(group, yellow, 0.06, 0.24, 'x', -0.68, 0, z, 20);
  flange(-0.56);
  cyl(group, steel, 0.01, 0.03, 'y', -0.68, -0.19, z, 8);
  cyl(
    group,
    paint(kit, '#f2f2ea', 0.4),
    0.025,
    0.012,
    'z',
    -0.68,
    0.11,
    z + 0.02,
    20,
  );
  const fl = createMicroLabel(kit, 'FILTER', {
    height: 0.016,
    ink: '#111111',
    plate: '#ffffff',
  });
  fl.position.set(-0.68, -0.25, z + 0.08);
  group.add(fl);
  pipe(-0.56, -0.45);
  // The slam-shut regulator: body in line, diaphragm case above, the
  // slam-shut's reset cap on its side, the impulse line downstream.
  flange(-0.45);
  box(group, steel, 0.22, 0.14, 0.14, -0.33, 0, z);
  flange(-0.21);
  cyl(group, steel, 0.025, 0.08, 'y', -0.33, 0.1, z, 12);
  cyl(group, paint(kit, '#2a4f8a', 0.45), 0.15, 0.06, 'y', -0.33, 0.17, z, 28);
  cyl(group, steel, 0.04, 0.06, 'y', -0.33, 0.23, z, 16);
  cyl(group, red, 0.03, 0.08, 'z', -0.33, 0, z + 0.1, 16);
  cyl(group, steel, 0.006, 0.6, 'x', -0.03, 0.1, z + 0.05, 8);
  // The relief valve and its vent, up to outside.
  cyl(group, steel, 0.03, 0.06, 'y', -0.27, 0.29, z, 12);
  cyl(group, yellow, 0.014, 0.7, 'y', -0.27, 0.67, z, 10);
  const rg = createMicroLabel(
    kit,
    'REGULATOR / SLAM-SHUT\nIN 2 bar  OUT 21 mbar  OPSO 50 mbar',
    {
      height: 0.013,
      ink: '#111111',
      plate: '#ffffff',
    },
  );
  rg.position.set(-0.33, -0.17, z + 0.08);
  group.add(rg);
  // A 300 mm straight run before the meter, as its makers ask.
  pipe(-0.21, -0.1);
  const meter = createRotaryGasMeter(kit);
  meter.group.position.set(0, 0, z);
  group.add(meter.group);
  pipe(0.1, 0.4);
  // The temperature pocket and pressure point in the meter's outlet.
  cyl(group, steel, 0.008, 0.08, 'y', 0.2, 0.08, z, 8);
  valve(0.5, 'OUTLET VALVE');
  pipe(0.57, 1.3);
  // The volume converter on the wall over the meter, cabled to it.
  const conv = createVolumeConverter(kit);
  conv.group.position.set(0.0, 0.45, 0);
  group.add(conv.group);
  const cable = paint(kit, '#2b2d2f', 0.6);
  cyl(group, cable, 0.004, 0.2, 'y', -0.03, 0.26, 0.04, 6);
  cyl(group, cable, 0.004, 0.2, 'y', 0.03, 0.26, 0.04, 6);
  // Two brackets to the wall.
  for (const x of [-1.0, 0.8])
    box(group, steel, 0.04, 0.04, z, x, -0.08, z / 2);
  // Its notices: the ECV notice and the pipe's flow arrows.
  const notice = createMicroLabel(
    kit,
    'GAS EMERGENCY CONTROL\nIn an emergency turn the handle to OFF\nGas Emergency 0800 111 999',
    { height: 0.02, ink: '#111111', plate: '#f6d21a' },
  );
  notice.position.set(-0.95, 0.4, 0.005);
  group.add(notice);
  for (const x of [-0.5, 0.9]) {
    const a = createMicroLabel(kit, 'GAS →', { height: 0.025, ink: '#111111' });
    a.position.set(x, 0.0, z + r + 0.001);
    group.add(a);
  }
  const mprn = createMicroLabel(kit, 'MPRN 7 4 8 3 1 0 9 2 2', {
    height: 0.014,
    ink: '#111111',
    plate: '#ffffff',
  });
  mprn.position.set(0.0, 0.66, 0.005);
  group.add(mprn);
  return {
    group,
    /** The ECV's lever, on its spindle: turned a quarter, shut. */
    ecv,
    /** The register, m³; `delta` pages the converter. */
    show(m3: number, delta = 0) {
      meter.show(m3);
      conv.show(m3, delta);
    },
  };
}

// ---- Water ----------------------------------------------------------------

/**
 * The ultrasonic water meter, DN100 (Q3 100 m³/h), after the Kamstrup
 * flowIQ 3100: its blue epoxy flanged body, 250 mm laying length, the
 * transducer housing on top and the sealed register over it, angled up:
 * its LCD (m³ to three decimals, flow arrow, info code), its optical
 * port and the AMR radio module's tag. Flow along +x.
 */
export function createUltrasonicWaterMeter(
  kit: PanelKit,
  { flangeR = 0.11 } = {},
) {
  const group = new Group();
  group.name = 'Trager-Feinstein ultrasonic water meter';
  const blue = paint(kit, '#2457a8', 0.45, 0.2);
  const steel = paint(kit, '#7d8285', 0.5, 0.4);
  cyl(group, blue, 0.07, 0.25, 'x', 0, 0, 0, 24);
  for (const s of [-1, 1]) {
    cyl(group, blue, flangeR, 0.025, 'x', s * 0.125, 0, 0, 24);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      cyl(
        group,
        steel,
        0.008,
        0.06,
        'x',
        s * 0.125,
        Math.cos(a) * 0.09,
        Math.sin(a) * 0.09,
        8,
      );
    }
  }
  box(group, blue, 0.14, 0.06, 0.12, 0, 0.07, 0);
  // Its sealed register on top, facing up and out.
  const head = new Group();
  head.position.set(0, 0.12, 0);
  head.rotation.x = 0.6;
  box(head, paint(kit, '#e9eae6', 0.5), 0.12, 0.035, 0.1, 0, 0, 0);
  const lcd = face(kit, 0.075, 0.025, 3000, (g, w, h, text) => {
    g.fillStyle = '#b6c6a3';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#18200f';
    g.font = `bold ${h * 0.55}px monospace`;
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    g.fillText(text, w * 0.84, h * 0.52);
    g.font = `${h * 0.28}px sans-serif`;
    g.fillText('m³', w * 0.99, h * 0.55);
    g.textAlign = 'left';
    g.fillText('▶', w * 0.02, h * 0.82);
  });
  lcd.mesh.rotation.x = -Math.PI / 2;
  lcd.mesh.position.set(0, 0.0185, 0.01);
  head.add(lcd.mesh);
  const legend = createMicroLabel(kit, 'DN100  Q3 100 m³/h  R400  MID  PN16', {
    height: 0.004,
    ink: '#333333',
  });
  legend.rotation.x = -Math.PI / 2;
  legend.position.set(0, 0.0185, 0.035);
  head.add(legend);
  const badge = createBrandBadge(kit, 'trager-feinstein', { height: 0.008 });
  badge.rotation.x = -Math.PI / 2;
  badge.position.set(0, 0.0185, -0.03);
  head.add(badge);
  const ring = new Mesh(
    new TorusGeometry(0.008, 0.0015, 8, 16),
    paint(kit, '#8d9294', 0.3, 0.8),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0.045, 0.0185, -0.03);
  head.add(ring);
  // A wire-and-lead seal across the register's fixing.
  cyl(
    head,
    paint(kit, '#6e7174', 0.4, 0.7),
    0.005,
    0.004,
    'x',
    0.062,
    0,
    0.03,
    10,
  );
  group.add(head);
  // The AMR module's antenna lead and its tag.
  cyl(
    group,
    paint(kit, '#111111', 0.6),
    0.003,
    0.3,
    'y',
    -0.06,
    0.25,
    -0.03,
    6,
  );
  const arrow = createMicroLabel(kit, '→', { height: 0.04, ink: '#e8eef8' });
  arrow.position.set(0, 0, 0.071);
  group.add(arrow);
  return {
    group,
    /** The register, m³, to three decimals. */
    show(m3: number) {
      lcd.show(m3.toFixed(3));
    },
  };
}

/**
 * The DN100 water main's meter set, on the floor at 0.4 m centre height,
 * flow along +x: an inlet gate valve (resilient-seated, after the AVK
 * Series 06, its handwheel), a Y-strainer, the ultrasonic meter between
 * straight runs, a flanged dismantling joint so the meter can come out,
 * and the outlet gate valve; ductile iron, blue epoxy, on pipe supports.
 * Origin on the floor at its middle; face toward +z.
 */
export function createWaterMeterSet(kit: PanelKit) {
  const group = new Group();
  group.name = 'Water meter set';
  const blue = paint(kit, '#2457a8', 0.45, 0.2);
  const steel = paint(kit, '#7d8285', 0.5, 0.4);
  const black = paint(kit, '#202326', 0.6);
  const y = 0.4;
  const flange = (x: number) => cyl(group, blue, 0.11, 0.024, 'x', x, y, 0, 24);
  const pipe = (x0: number, x1: number) =>
    cyl(group, blue, 0.058, x1 - x0, 'x', (x0 + x1) / 2, y, 0, 20);
  const gate = (x: number, label: string) => {
    flange(x - 0.095);
    flange(x + 0.095);
    cyl(group, blue, 0.08, 0.17, 'x', x, y, 0, 20);
    box(group, blue, 0.12, 0.2, 0.15, x, y + 0.1, 0);
    cyl(group, steel, 0.012, 0.15, 'y', x, y + 0.27, 0, 10);
    const handwheel = new Group();
    handwheel.position.set(x, y + 0.34, 0);
    const wheel = new Mesh(new TorusGeometry(0.1, 0.012, 8, 24), black);
    wheel.rotation.x = Math.PI / 2;
    handwheel.add(wheel);
    box(handwheel, black, 0.2, 0.012, 0.012, 0, 0, 0);
    group.add(handwheel);
    const tag = createMicroLabel(kit, label, {
      height: 0.02,
      ink: '#111111',
      plate: '#ffffff',
    });
    tag.position.set(x, y - 0.14, 0.09);
    group.add(tag);
    return handwheel;
  };
  pipe(-1.2, -0.9);
  const inlet = gate(-0.8, 'INLET VALVE');
  pipe(-0.7, -0.6);
  // The Y-strainer: its screen leg angled down and forward, a drain plug.
  flange(-0.6);
  cyl(group, blue, 0.075, 0.25, 'x', -0.475, y, 0, 20);
  const leg = cyl(group, blue, 0.06, 0.22, 'y', -0.44, y - 0.1, 0.04, 16);
  leg.rotation.x = 0.7;
  cyl(group, steel, 0.015, 0.02, 'y', -0.44, y - 0.2, 0.11, 8);
  flange(-0.35);
  const st = createMicroLabel(kit, 'STRAINER', {
    height: 0.02,
    ink: '#111111',
    plate: '#ffffff',
  });
  st.position.set(-0.475, y + 0.12, 0.08);
  group.add(st);
  // Five diameters straight before the meter, three after, as the
  // meter's makers ask (though an ultrasonic meter forgives less).
  pipe(-0.35, -0.125);
  const meter = createUltrasonicWaterMeter(kit);
  meter.group.position.set(0, y, 0);
  group.add(meter.group);
  pipe(0.125, 0.4);
  // The dismantling joint: two flanges, a sleeve, its tie rods.
  flange(0.4);
  cyl(group, blue, 0.075, 0.18, 'x', 0.5, y, 0, 20);
  flange(0.6);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    cyl(
      group,
      steel,
      0.008,
      0.3,
      'x',
      0.5,
      y + Math.cos(a) * 0.09,
      Math.sin(a) * 0.09,
      8,
    );
  }
  const dj = createMicroLabel(kit, 'DISMANTLING JOINT', {
    height: 0.018,
    ink: '#111111',
    plate: '#ffffff',
  });
  dj.position.set(0.5, y - 0.15, 0.09);
  group.add(dj);
  pipe(0.6, 0.7);
  gate(0.8, 'OUTLET VALVE');
  pipe(0.9, 1.2);
  // Pipe supports under the runs.
  for (const x of [-1.05, -0.2, 0.25, 1.05]) {
    box(group, steel, 0.06, y - 0.06, 0.06, x, (y - 0.06) / 2, 0);
    box(group, steel, 0.16, 0.012, 0.16, x, 0.006, 0);
  }
  const arrow = createMicroLabel(kit, 'MAINS WATER  DN100 →', {
    height: 0.025,
    ink: '#ffffff',
  });
  arrow.position.set(-0.98, y, 0.059);
  group.add(arrow);
  return {
    group,
    /** The inlet gate valve's handwheel, on its spindle. */
    inlet,
    show(m3: number) {
      meter.show(m3);
    },
  };
}

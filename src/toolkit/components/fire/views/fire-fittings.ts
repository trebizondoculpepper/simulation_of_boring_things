import { ParticlePoints } from '../../core/views/particles';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  PointsMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { Material } from 'three';
import { METRE } from '../../core/logic/units';
import { createPs1Material } from '../../core/parts/ps1-material';
import { kitGlow } from '../../core/views/eighties-controls';
import { brandById } from '../../core/logic/brands';
import { createBrandBadge } from '../../core/views/brand-badge';
import { drawBrandMark, wordmarkFont } from '../../core/views/brand-logo';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { PLATE_WHITE, SANS, tools } from '../../core/views/fitting-tools';

/**
 * Views of active fire safety equipment, after present-day UK practice
 * (BS 5839): call points, sounder-beacons, smoke detectors, the alarm
 * panel, sprinkler heads and their valve set, the sprinkler bell,
 * extinguishers, a fire door on its magnetic holder, the voice alarm's
 * ceiling speaker, and a bin fire to set it all off. They only draw:
 * `../parts/fire-parts.ts` gives them their behaviour.
 */

/** A soft round dot, so particles are puffs and drops rather than squares. */
function softDot(kit: PanelKit) {
  const { context: c, texture } = createCanvasTexture(64, 64);
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  texture.needsUpdate = true;
  kit.textures.push(texture);
  return texture;
}

// ---- Fire ---------------------------------------------------------------

/** A resettable manual call point: its face, and the key that resets it. */
export function createCallPoint(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#c4231c', 0.4), 0.09, 0.09, 0.05, 0, 0, 0.025);
  const face = t.printed(
    0.07,
    0.07,
    (c, w, h) => {
      c.fillStyle = '#eef0ee';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#c0261f';
      c.textAlign = 'center';
      c.font = `bold ${w * 0.17}px ${SANS}`;
      c.fillText('FIRE', w / 2, h * 0.3);
      c.font = `bold ${w * 0.1}px ${SANS}`;
      c.fillText('PUSH HERE', w / 2, h * 0.62);
    },
    128,
  );
  face.mesh.position.z = 0.0505;
  group.add(face.mesh);
  // The resettable element shows a yellow-and-black flag once operated.
  const flag = t.printed(
    0.05,
    0.016,
    (c, w, h) => {
      for (let x = -h; x < w; x += h) {
        c.fillStyle = '#f2c618';
        c.fillRect(x, 0, h / 2, h);
        c.fillStyle = '#151515';
        c.fillRect(x + h / 2, 0, h / 2, h);
      }
    },
    128,
  );
  flag.mesh.position.set(0, -0.022, 0.0508);
  flag.mesh.visible = false;
  group.add(flag.mesh);
  const key = t.cyl(
    group,
    t.paint('#1b1b1b', 0.5),
    0.004,
    0.004,
    0.036,
    -0.036,
    0.051,
    'z',
    10,
  );
  return {
    group,
    face: face.mesh,
    key,
    set(latched: boolean) {
      flag.mesh.visible = latched;
      face.mesh.position.z = latched ? 0.047 : 0.0505;
    },
  };
}

/** A wall sounder-beacon: a red base and a lens that flashes. */
export function createSounderBeacon(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint('#c4231c', 0.4), 0.055, 0.06, 0, 0, 0.03, 'z', 24);
  const lens = kitGlow(kit, '#ff5040');
  t.cyl(group, lens, 0.032, 0.04, 0, 0, 0.08, 'z', 20);
  const off = new Color('#5a1d18');
  const on = new Color('#ff6a55');
  lens.color.copy(off);
  let time = 0;
  let sounding = false;
  return {
    group,
    set(value: boolean) {
      sounding = value;
    },
    update(delta: number) {
      time += delta;
      lens.color.copy(sounding && time % 1 < 0.12 ? on : off);
    },
  };
}

/** An optical smoke detector: its LED blinks; solid in alarm. */
export function createSmokeDetector(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.06, 0.012, 0, -0.006, 0, 'y', 28);
  t.cyl(group, t.paint('#efeee8', 0.4), 0.05, 0.035, 0, -0.03, 0, 'y', 28);
  const lamp = t.led(group, '#ff3020', 0.006, 0.04, -0.03, 0.02, 'z');
  lamp.mesh.rotation.x = 0;
  let time = 0;
  let alarm = false;
  return {
    group,
    set(value: boolean) {
      alarm = value;
    },
    update(delta: number) {
      time += delta;
      lamp.set(alarm || time % 4 < 0.08);
    },
  };
}

export interface PanelLamps {
  fire: boolean;
  zone1: boolean;
  zone2: boolean;
  /** An alarm stage is on: alert or evacuate. */
  alarm: boolean;
  /** Seconds left of the investigation delay, or 0. */
  countdown: number;
  /** The fire brigade has been called (the remote output). */
  brigade: boolean;
  silenced: boolean;
  power: boolean;
  onBattery: boolean;
  enabled: boolean;
}

/** The facia's drawing, pixels per metre. */
const FACIA_PX = 4000;

/**
 * A two-zone conventional fire alarm panel, after a common British panel
 * of the kind (C-TEC's CFP, 380 × 235 × 90 mm), with a maker's name of
 * our own: an off-white plastic case with a certification badge, the
 * zones' handwritten labels in windows, and a charcoal facia across its
 * lower half. On the facia's left, the printed operating instructions;
 * in the middle, numbered keys 1 to 4 (2, yellow, leaves access mode; 4
 * tests the lamps), the colour-coded buttons (white silences the panel's
 * own buzzer, red silences or resounds the sounders, green resets), and
 * the red key in its keyswitch; on the right, the red FIRE lamp, a lamp
 * for each zone in fire and each zone in fault, disable or test, and the
 * general lamps along the bottom.
 */
export function createFirePanel(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const W = 0.38;
  const H = 0.235;
  const D = 0.09;
  // The case: off-white plastic, the lid a touch proud of the box.
  t.box(
    group,
    t.paint('#dcdcd6', 0.55),
    W - 0.02,
    H - 0.02,
    D - 0.01,
    0,
    0,
    (D - 0.01) / 2,
  );
  t.box(group, t.paint('#ecece7', 0.45), W, H, 0.012, 0, 0, D - 0.006);
  // The facia stands a little proud of the case, and is drawn in front of
  // it, so the two never fight for the same depth seen from afar.
  const front = D + 0.0015;
  for (const x of [-W / 2 + 0.018, W / 2 - 0.018])
    t.cyl(
      group,
      t.paint('#d2d2cc', 0.4),
      0.006,
      0.003,
      x,
      -H / 2 + 0.018,
      front,
      'z',
      16,
    );
  const badge = t.printed(
    0.06,
    0.03,
    (c, w, h) => {
      c.fillStyle = '#4a4d50';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#d9d9d4';
      c.font = `bold ${h * 0.34}px ${SANS}`;
      c.fillText('EN54-2/4', w * 0.12, h * 0.62);
    },
    192,
  );
  badge.mesh.position.set(-0.11, 0.075, front);
  group.add(badge.mesh);

  // The facia: drawn as one picture, with the lamps and buttons set into it.
  const fw = 0.35;
  const fh = 0.118;
  const top = 0.012;
  const at = (px: number, py: number): [number, number] => [
    -fw / 2 + px / FACIA_PX,
    top - py / FACIA_PX,
  ];
  const facia = t.printed(
    fw,
    fh,
    (c, w, h) => {
      const round = (
        x: number,
        y: number,
        rw: number,
        rh: number,
        r: number,
      ) => {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + rw, y, x + rw, y + rh, r);
        c.arcTo(x + rw, y + rh, x, y + rh, r);
        c.arcTo(x, y + rh, x, y, r);
        c.arcTo(x, y, x + rw, y, r);
        c.fill();
      };
      c.fillStyle = '#ecece7';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#3b3e41';
      round(0, 0, w, h, 40);
      // Instructions, on the left.
      c.fillStyle = '#5b5f62';
      round(30, 26, 360, 44, 8);
      c.fillStyle = '#ffffff';
      c.font = `bold 22px ${SANS}`;
      c.fillText('Fire Alarm Control Panel Instructions', 40, 56);
      const lines: [string, string | null][] = [
        ['To silence the internal sounder: press', '#f4f4f0'],
        ['To silence/resound the alarm sounders:', null],
        ['  turn key to I or enter code and press', '#d6322a'],
        ['To reset the panel: ensure the alarm', null],
        ['  sounders are silenced and press', '#2fa04a'],
        ['To exit access mode: remove key OR press', '#f2c618'],
      ];
      c.font = `15px ${SANS}`;
      lines.forEach(([text, swatch], i) => {
        const y = 100 + i * 24;
        c.fillStyle = '#ffffff';
        c.fillText(text, 36, y);
        if (swatch) {
          c.fillStyle = swatch;
          c.fillRect(340, y - 12, 26, 12);
        }
      });
      c.fillStyle = '#f2c618';
      c.font = `bold 16px ${SANS}`;
      c.fillText('Indicators', 36, 264);
      c.fillStyle = '#ffffff';
      c.font = `14px ${SANS}`;
      c.fillText('constant light = zone disabled', 36, 286);
      c.fillText('flashing light = zone in fault or test mode', 36, 306);
      c.fillStyle = '#f2c618';
      c.fillText('General fault: flashing light - call engineer', 36, 330);
      // The maker's mark and name, from Warden's one definition (dev8).
      const warden = brandById('warden');
      c.save();
      drawBrandMark(c, warden, 68, 392, 37);
      c.restore();
      c.fillStyle = '#ffffff';
      c.font = wordmarkFont(warden, 16);
      c.fillText(`${warden.wordmark ?? warden.name} CF2 SERIES`, 112, 384);
      c.font = `bold 16px ${SANS}`;
      c.font = `12px ${SANS}`;
      c.fillText('The system must be tested regularly.', 112, 404);
      c.fillText('If in doubt, refer to the user manual.', 112, 420);
      // The controls' field, a lighter grey, curving into the lamps'.
      c.fillStyle = '#4c5053';
      round(420, 20, 330, 420, 30);
      c.fillStyle = '#e8e8e2';
      c.font = `13px ${SANS}`;
      c.textAlign = 'center';
      const under = (text: string, x: number, y: number) =>
        text.split('\n').forEach((line, i) => c.fillText(line, x, y + i * 14));
      under('override\ndelays', 470, 134);
      under('exit access\nmode', 470, 222);
      under('next option', 470, 310);
      under('enable/disable', 470, 396);
      c.fillStyle = '#f2c618';
      c.fillText('lamp test', 470, 410);
      c.fillStyle = '#e8e8e2';
      under('silence internal\nsounder', 610, 134);
      under('silence/resound\nsounders', 610, 222);
      under('control panel\nreset', 610, 310);
      under('access', 660, 404);
      c.font = `bold 14px ${SANS}`;
      c.fillText('0', 610, 314);
      c.fillText('I', 662, 357);
      // The keyhole: a round head over a slot, rimmed in pale plastic.
      c.fillStyle = '#d8d8d2';
      c.beginPath();
      c.arc(610, 352, 26, 0, Math.PI * 2);
      c.fill();
      c.fillRect(598, 352, 24, 46);
      c.fillStyle = '#141516';
      c.beginPath();
      c.arc(610, 352, 21, 0, Math.PI * 2);
      c.fill();
      c.fillRect(602, 352, 16, 42);
      c.textAlign = 'left';
      // The lamps' field.
      c.fillStyle = '#c4231c';
      round(790, 36, 56, 70, 6);
      c.fillStyle = '#ffffff';
      c.font = `bold 20px ${SANS}`;
      c.fillText('Fire', 798, 62);
      c.fillStyle = '#e8e8e2';
      c.font = `bold 16px ${SANS}`;
      c.fillText('Fire Zones', 1010, 38);
      c.font = `15px ${SANS}`;
      c.fillText('1', 900, 58);
      c.fillText('2', 980, 58);
      c.fillText('1', 900, 150);
      c.fillText('2', 980, 150);
      c.strokeStyle = '#f2c618';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(870, 190);
      c.lineTo(870, 200);
      c.lineTo(1330, 200);
      c.lineTo(1330, 190);
      c.stroke();
      c.fillStyle = '#e8e8e2';
      c.font = `bold 15px ${SANS}`;
      c.fillText('Zone fault/disable/test', 1010, 222);
      c.font = `12px ${SANS}`;
      const general = [
        'supply\npresent',
        'accessed',
        'remote\noutput',
        'general\nfault',
        'power\nsupply fault',
        'system\nfault',
        'sounder\nstatus',
        'output\ndelays',
      ];
      c.textAlign = 'center';
      general.forEach((text, i) => under(text, 820 + i * 66, 330));
      c.textAlign = 'left';
    },
    Math.round(fw * FACIA_PX),
  );
  facia.mesh.position.set(0, top - fh / 2, front);
  for (const material of [facia.mesh.material].flat()) {
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -2;
  }
  group.add(facia.mesh);
  // The zones' labels, handwritten in their windows above the facia.
  const labels = t.printed(
    0.14,
    0.018,
    (c, w, h) => {
      c.fillStyle = '#ecece7';
      c.fillRect(0, 0, w, h);
      c.font = `${h * 0.42}px "Comic Sans MS", ${SANS}`;
      ['1 CALL POINTS', '2 DETECTORS'].forEach((text, i) => {
        c.fillStyle = '#ffffff';
        c.fillRect(i * w * 0.5 + 4, 2, w * 0.5 - 8, h - 4);
        c.strokeStyle = '#9a9a94';
        c.strokeRect(i * w * 0.5 + 4, 2, w * 0.5 - 8, h - 4);
        c.fillStyle = '#1d3d8f';
        c.fillText(text, i * w * 0.5 + 12, h * 0.7);
      });
    },
    512,
  );
  labels.mesh.position.set(0.06, top + 0.014, front);
  group.add(labels.mesh);

  // Lamps.
  const lamp = (px: number, py: number, colour: string, r = 0.0026) => {
    const [x, y] = at(px, py);
    return t.led(group, colour, r, x, y, front + 0.001);
  };
  const lamps = {
    fire: lamp(818, 84, '#ff3020', 0.0034),
    zone1: lamp(904, 86, '#ff3020'),
    zone2: lamp(984, 86, '#ff3020'),
    fault1: lamp(904, 176, '#ffb020'),
    fault2: lamp(984, 176, '#ffb020'),
    supply: lamp(820, 300, '#35e06a'),
    accessed: lamp(886, 300, '#ffb020'),
    remote: lamp(952, 300, '#ffb020'),
    general: lamp(1018, 300, '#ffb020'),
    power: lamp(1084, 300, '#ffb020'),
    system: lamp(1150, 300, '#ffb020'),
    sounders: lamp(1216, 300, '#ffb020'),
    delays: lamp(1282, 300, '#ffb020'),
  };
  // Buttons: numbered keys and the colour-coded three.
  const button = (px: number, py: number, colour: string, digit?: string) => {
    const [x, y] = at(px, py);
    const mesh = t.box(
      group,
      t.paint(colour, 0.35),
      0.014,
      0.009,
      0.003,
      x,
      y,
      front + 0.0015,
    );
    if (digit)
      t.label(
        group,
        digit,
        x,
        y,
        front + 0.0032,
        0.005,
        colour === '#f2c618' ? '#1b1b1b' : '#ffffff',
      );
    return mesh;
  };
  const keys = [
    button(470, 92, '#1e1f21', '1'),
    button(470, 180, '#f2c618', '2'),
    button(470, 268, '#1e1f21', '3'),
    button(470, 356, '#1e1f21', '4'),
  ];
  const silenceBuzzer = button(610, 92, '#f4f4f0');
  const silenceResound = button(610, 180, '#d6322a');
  const reset = button(610, 268, '#2fa04a');
  // The keyswitch, as on the real panel: a keyhole cut in the facia (a
  // round head over a slot, drawn on the facia) with the key standing
  // straight out of it, its head a chunky, rounded red plastic paddle,
  // upright at 0 and turned a quarter to I.
  const [kx, ky] = at(610, 352);
  const barrel = t.cyl(
    group,
    t.paint('#141516', 0.8),
    0.0055,
    0.0008,
    kx,
    ky,
    front + 0.0004,
    'z',
    24,
  );
  const key = new Group();
  key.position.set(kx, ky, front + 0.0008);
  group.add(key);
  const red = t.paint('#d42a1e', 0.3);
  // The neck where the head meets the lock.
  t.box(key, red, 0.0035, 0.007, 0.005, 0, 0, 0.0025);
  const head = new Shape();
  head.moveTo(0.004, -0.0035);
  head.lineTo(0.004, 0.0035);
  head.quadraticCurveTo(0.007, 0.0045, 0.0085, 0.009);
  head.absellipse(
    0.017,
    0,
    0.0095,
    0.0115,
    Math.PI * 0.82,
    -Math.PI * 0.82,
    true,
    0,
  );
  head.quadraticCurveTo(0.007, -0.0045, 0.004, -0.0035);
  const headGeometry = new ExtrudeGeometry(head, {
    depth: 0.003,
    bevelEnabled: true,
    bevelThickness: 0.0008,
    bevelSize: 0.0008,
    bevelSegments: 3,
    curveSegments: 16,
  });
  // Drawn with its length along x and its face in xy: stand it out of
  // the facia (x to z), its thin edge towards the viewer.
  headGeometry.translate(0, 0, -0.0015);
  headGeometry.rotateY(-Math.PI / 2);
  key.add(new Mesh(headGeometry, red));
  let time = 0;
  let testing = 0;
  let state: PanelLamps | null = null;
  return {
    group,
    keys,
    silenceBuzzer,
    silenceResound,
    reset,
    key: barrel,
    keyHead: key,
    set(next: PanelLamps) {
      state = next;
      key.rotation.z = next.enabled ? -Math.PI / 2 : 0;
    },
    /** Light every lamp for a moment. */
    lampTest() {
      testing = 2.5;
    },
    update(delta: number) {
      time += delta;
      testing = Math.max(0, testing - delta);
      if (!state) return;
      if (testing > 0) {
        for (const l of Object.values(lamps)) l.set(true);
        return;
      }
      const s = state;
      // Fire lamps flash until the alarm is silenced, then stay lit.
      const fireLit = (on: boolean) => on && (s.silenced || time % 1 < 0.5);
      lamps.fire.set(fireLit(s.fire));
      lamps.zone1.set(fireLit(s.zone1));
      lamps.zone2.set(fireLit(s.zone2));
      lamps.fault1.set(false);
      lamps.fault2.set(false);
      lamps.supply.set(s.power);
      lamps.accessed.set(s.enabled);
      lamps.remote.set(s.brigade);
      lamps.general.set(s.onBattery && time % 1 < 0.5);
      lamps.power.set(s.onBattery);
      lamps.system.set(false);
      lamps.sounders.set(s.silenced);
      // Output delays: flashing while the investigation delay runs.
      lamps.delays.set(s.countdown > 0 && time % 1 < 0.5);
    },
  };
}

/** A pendant sprinkler head, and the spray it gives when discharging. */
export function createSprinklerHead(kit: PanelKit, fallDistance = 3) {
  const t = tools(kit);
  const group = new Group();
  const chrome = t.paint('#d0d3d4', 0.2, 0.9);
  t.cyl(group, t.paint('#f2f1ea', 0.4), 0.035, 0.01, 0, -0.005, 0);
  t.cyl(group, chrome, 0.008, 0.04, 0, -0.03, 0, 'y', 10);
  t.cyl(group, chrome, 0.018, 0.003, 0, -0.06, 0, 'y', 16);
  const bulb = t.cyl(
    group,
    kitGlow(kit, '#e0312a'),
    0.003,
    0.016,
    0,
    -0.045,
    0,
    'y',
    8,
  );
  // It bursts: not merged with the still parts (`mergeTree`).
  bulb.userData.live = true;
  // The spray: drops falling from the deflector in a cone.
  const count = 600;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const seed = () => {
    const a = Math.random() * Math.PI * 2;
    const s = 0.8 + Math.random() * 1.4;
    return [Math.cos(a) * s, -0.4 - Math.random() * 0.6, Math.sin(a) * s];
  };
  for (let i = 0; i < count; i++) {
    life[i] = Math.random() * Math.sqrt((2 * fallDistance) / 9.8);
    const [vx, vy, vz] = seed();
    speeds.set([vx, vy, vz], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const drops = new ParticlePoints(
    geometry,
    new PointsMaterial({
      map: softDot(kit),
      color: '#bcd4e6',
      // Point sizes ignore the room's scale: give them in scene units.
      size: 0.03 * METRE,
      transparent: true,
      opacity: 0.8,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  kit.materials.push(drops.material as Material);
  drops.visible = false;
  drops.frustumCulled = false;
  group.add(drops);
  let on = false;
  return {
    group,
    set(burst: boolean, spraying: boolean) {
      on = spraying;
      drops.visible = spraying;
      bulb.visible = !burst;
    },
    update(delta: number) {
      if (!on) return;
      for (let i = 0; i < count; i++) {
        life[i] += delta;
        if (life[i] > Math.sqrt((2 * fallDistance) / 9.8)) {
          life[i] = 0;
          const [vx, vy, vz] = seed();
          speeds.set([vx, vy, vz], i * 3);
        }
        const s = life[i];
        positions[i * 3] = speeds[i * 3] * s;
        positions[i * 3 + 1] = -0.06 + speeds[i * 3 + 1] * s - 4.9 * s * s;
        positions[i * 3 + 2] = speeds[i * 3 + 2] * s;
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

/**
 * A sprinkler valve set on its riser: the main valve's handwheel, the
 * alarm valve with its flag (SPRINKLER OPERATED while water flows), the
 * reset that replaces burst heads, and a gauge.
 */
export function createValveSet(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const red = t.paint('#b5221b', 0.45, 0.3);
  t.cyl(group, red, 0.06, 2.4, 0, 1.2, 0.12);
  t.cyl(group, red, 0.1, 0.22, 0, 0.8, 0.12);
  const wheel = new Mesh(
    new TorusGeometry(0.12, 0.012, 8, 24),
    t.paint('#c9b23a', 0.4, 0.5),
  );
  wheel.position.set(0, 0.8, 0.27);
  group.add(wheel);
  t.cyl(group, red, 0.012, 0.15, 0, 0.8, 0.2, 'z');
  t.cyl(group, red, 0.11, 0.3, 0, 1.45, 0.12);
  const flag = t.printed(0.16, 0.05, () => {}, 256);
  flag.mesh.position.set(0, 1.45, 0.231);
  group.add(flag.mesh);
  const reset = t.box(
    group,
    t.paint('#2e3236', 0.4),
    0.06,
    0.03,
    0.02,
    0,
    1.35,
    0.235,
  );
  t.label(group, 'RESET', 0, 1.32, 0.231, 0.008, '#1b1b1b');
  const gauge = t.printed(
    0.09,
    0.09,
    (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#222';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(w / 2, h / 2);
      c.lineTo(w * 0.78, h * 0.3);
      c.stroke();
      c.fillStyle = '#222';
      c.font = `${h * 0.12}px ${SANS}`;
      c.textAlign = 'center';
      c.fillText('bar', w / 2, h * 0.8);
    },
    128,
  );
  gauge.mesh.position.set(0.16, 1.7, 0.13);
  group.add(gauge.mesh);
  t.cyl(group, red, 0.008, 0.16, 0.08, 1.7, 0.12, 'x');
  let last = '';
  return {
    group,
    wheel,
    reset,
    set(open: boolean, tripped: boolean) {
      wheel.rotation.z = open ? 0 : Math.PI * 1.5;
      const text = `${open ? 'MAIN OPEN' : 'MAIN SHUT'}|${tripped ? 'TRIPPED' : 'SET'}`;
      if (text === last) return;
      last = text;
      const c = flag.context;
      const w = c.canvas.width;
      const h = c.canvas.height;
      c.fillStyle = tripped ? '#f2c618' : '#e8e8e2';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1b1b1b';
      c.font = `bold ${h * 0.34}px ${SANS}`;
      c.textAlign = 'center';
      c.fillText(
        tripped ? 'SPRINKLER OPERATED' : 'INSTALLATION SET',
        w / 2,
        h * 0.42,
      );
      c.font = `${h * 0.26}px ${SANS}`;
      c.fillText(open ? 'MAIN VALVE OPEN' : 'MAIN VALVE SHUT', w / 2, h * 0.82);
      flag.texture.needsUpdate = true;
    },
  };
}

export type ExtinguisherKind = 'water' | 'foam' | 'co2' | 'powder';

const BANDS: Record<ExtinguisherKind, [string, string]> = {
  water: ['#c4231c', 'WATER'],
  foam: ['#efe3b8', 'FOAM'],
  co2: ['#1b1b1b', 'CO2'],
  powder: ['#2a5bc4', 'POWDER'],
};

/** A portable extinguisher of its kind, on its wall bracket, with its sign. */
export function createExtinguisher(kit: PanelKit, kind: ExtinguisherKind) {
  const t = tools(kit);
  const group = new Group();
  const [band, name] = BANDS[kind];
  const body = t.cyl(
    group,
    t.paint('#c4231c', 0.35),
    0.075,
    0.5,
    0,
    0.55,
    0.11,
    'y',
    20,
  );
  t.cyl(group, t.paint(band, 0.4), 0.0755, 0.07, 0, 0.66, 0.11, 'y', 20);
  t.cyl(group, t.paint('#1b1b1b', 0.5), 0.02, 0.07, 0, 0.83, 0.11, 'y', 10);
  t.box(group, t.paint('#2a2a2a', 0.5), 0.12, 0.012, 0.03, 0.03, 0.88, 0.11);
  const pin = t.cyl(
    group,
    t.paint('#d8d0b4', 0.3, 0.7),
    0.004,
    0.04,
    -0.03,
    0.86,
    0.13,
    'z',
    6,
  );
  // Pulled out: not merged with the still parts (`mergeTree`).
  pin.userData.live = true;
  if (kind === 'co2') {
    const horn = t.cyl(
      group,
      t.paint('#1b1b1b', 0.5),
      0.02,
      0.22,
      0.1,
      0.55,
      0.11,
      'y',
      10,
    );
    horn.rotation.z = 0.15;
  } else {
    const hose = t.cyl(
      group,
      t.paint('#1b1b1b', 0.6),
      0.008,
      0.4,
      0.085,
      0.62,
      0.11,
      'y',
      8,
    );
    hose.rotation.z = 0.08;
  }
  t.box(group, t.paint('#333333', 0.5), 0.08, 0.04, 0.03, 0, 0.82, 0.015);
  const sign = t.printed(
    0.14,
    0.1,
    (c, w, h) => {
      c.fillStyle = '#c4231c';
      c.fillRect(0, 0, w, h);
      c.fillStyle = band === '#c4231c' ? '#ffffff' : band;
      c.fillRect(0, h * 0.55, w, h * 0.45);
      c.fillStyle = band === '#efe3b8' ? '#1b1b1b' : '#ffffff';
      if (band === '#c4231c') c.fillStyle = '#c4231c';
      c.textAlign = 'center';
      c.font = `bold ${h * 0.24}px ${SANS}`;
      c.fillText(name, w / 2, h * 0.86);
      c.fillStyle = '#ffffff';
      c.font = `bold ${h * 0.2}px ${SANS}`;
      c.fillText('FIRE', w / 2, h * 0.36);
    },
    192,
  );
  sign.mesh.position.set(0, 1.12, 0.002);
  group.add(sign.mesh);
  const label = t.label(
    group,
    kind === 'co2' ? 'CO₂' : name,
    0,
    0.5,
    0.186,
    0.012,
    '#ffffff',
    null,
  );
  label.rotation.y = 0;
  // Its maker's name, small, printed on the cylinder under its contents.
  const maker = createBrandBadge(kit, 'warden', {
    form: 'wordmark',
    height: 0.02,
    ink: '#f4efe6',
  });
  maker.position.set(0, 0.44, 0.1862);
  group.add(maker);
  // The discharge: a cloud of its agent from the nozzle.
  const count = 240;
  const positions = new Float32Array(count * 3);
  const life = new Float32Array(count).map(() => Math.random());
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const cloud = new ParticlePoints(
    geometry,
    new PointsMaterial({
      color:
        kind === 'water'
          ? '#a9c6dc'
          : kind === 'powder'
            ? '#e9e6f2'
            : '#f4f4f0',
      size: (kind === 'water' ? 0.03 : 0.08) * METRE,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  );
  kit.materials.push(cloud.material as Material);
  cloud.visible = false;
  cloud.frustumCulled = false;
  group.add(cloud);
  let spraying = false;
  return {
    group,
    body,
    set(state: 'ready' | 'unpinned' | 'discharging' | 'empty') {
      pin.visible = state === 'ready';
      spraying = state === 'discharging';
      cloud.visible = spraying;
    },
    update(delta: number) {
      if (!spraying) return;
      for (let i = 0; i < count; i++) {
        life[i] = (life[i] + delta * 1.4) % 1;
        const s = life[i];
        const spread = s * 0.4;
        positions[i * 3] = 0.12 + Math.sin(i * 12.9898) * spread;
        positions[i * 3 + 1] = 0.45 + Math.cos(i * 78.233) * spread * 0.6;
        positions[i * 3 + 2] = 0.2 + s * 1.6;
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

/**
 * A fire door held open by an electromagnetic door holder: the leaf on
 * its hinge, its closer, the holder on the wall and the keeper on the
 * leaf. The door swings to its target angle; `set` the target.
 */
export function createHeldFireDoor(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const frame = t.paint('#eeece4', 0.5);
  t.box(group, frame, 1.08, 0.06, 0.12, 0, 2.11, 0);
  for (const x of [-0.51, 0.51])
    t.box(group, frame, 0.06, 2.14, 0.12, x, 1.07, 0);
  t.box(group, t.paint('#1d2326', 0.6), 0.96, 2.08, 0.02, 0, 1.04, -0.05);
  const hinge = new Group();
  hinge.position.set(-0.48, 0, 0.04);
  group.add(hinge);
  const leaf = t.box(
    hinge,
    t.paint('#c79d64', 0.5),
    0.93,
    2.04,
    0.045,
    0.465,
    1.02,
    0,
  );
  t.box(hinge, t.paint('#1d2326', 0.08, 0.3), 0.16, 0.8, 0.05, 0.69, 1.45, 0);
  t.box(hinge, t.paint('#cfd2d2', 0.2, 0.9), 0.03, 0.03, 0.06, 0.87, 0.3, 0.03);
  t.box(
    hinge,
    t.paint('#cfd2d2', 0.2, 0.9),
    0.32,
    0.06,
    0.06,
    0.25,
    1.98,
    0.05,
  );
  const sign = t.printed(
    0.18,
    0.18,
    (c, w, h) => {
      c.fillStyle = '#1d4f9c';
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.font = `bold ${h * 0.12}px ${SANS}`;
      c.fillText('FIRE DOOR', w / 2, h * 0.36);
      c.fillText('KEEP CLOSED', w / 2, h * 0.52);
      c.font = `${h * 0.08}px ${SANS}`;
      c.fillText('WHEN NOT IN USE', w / 2, h * 0.66);
    },
    128,
  );
  sign.mesh.position.set(0.465, 1.62, 0.024);
  hinge.add(sign.mesh);
  // A short return wall beside the hinge, and the holder on it, where the
  // open leaf's edge comes to rest.
  t.box(group, t.paint('#dcdad2', 0.8), 0.1, 2.2, 1.0, -0.62, 1.1, 0.55);
  const holder = t.box(
    group,
    t.paint('#b9bcbe', 0.3, 0.6),
    0.06,
    0.08,
    0.08,
    -0.54,
    0.3,
    0.9,
  );
  const holderLamp = t.led(group, '#35e06a', 0.004, -0.54, 0.36, 0.95);
  let angle = 0;
  let target = 0;
  return {
    group,
    leaf,
    holder,
    /** Open (swung into the room, back against the holder) or shut. */
    setTarget(open: boolean) {
      target = open ? -1.5 : 0;
    },
    setHolder(energised: boolean) {
      holderLamp.set(energised);
    },
    get open() {
      return target !== 0;
    },
    update(delta: number) {
      angle += (target - angle) * Math.min(1, delta * (target ? 4 : 1.6));
      hinge.rotation.y = angle;
    },
  };
}

/** A ceiling loudspeaker of the voice alarm, hanging from y = 0. */
export function createCeilingSpeaker(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.11, 0.01, 0, -0.005, 0, 'y', 32);
  const ring = t.paint('#c9c8c0', 0.5);
  for (let r = 0.02; r < 0.1; r += 0.016) {
    const torus = new Mesh(new TorusGeometry(r, 0.0015, 4, 32), ring);
    torus.rotation.x = Math.PI / 2;
    torus.position.y = -0.011;
    group.add(torus);
  }
  return { group };
}

/** An electric fire bell: a red gong on its base, its striker under it. */
export function createFireBell(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const red = t.paint('#c4231c', 0.3, 0.4);
  t.cyl(group, red, 0.05, 0.03, 0, 0, 0.015, 'z', 24);
  const gong = new Mesh(
    new SphereGeometry(0.1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.6),
    red,
  );
  gong.rotation.x = Math.PI / 2;
  gong.position.z = 0.03;
  group.add(gong);
  const striker = t.box(
    group,
    t.paint('#2a2a2a', 0.5),
    0.01,
    0.03,
    0.01,
    0,
    -0.07,
    0.05,
  );
  // It strikes: not merged with the still parts (`mergeTree`).
  striker.userData.live = true;
  let time = 0;
  let ringing = false;
  return {
    group,
    set(value: boolean) {
      ringing = value;
    },
    update(delta: number) {
      time += delta;
      striker.position.x = ringing ? Math.sin(time * 120) * 0.004 : 0;
    },
  };
}

/**
 * A steel waste-paper bin, and the fire in it: flames that grow with the
 * fire's size (0 to 1) and flicker, and an orange light the room adds.
 */
export function createBinFire(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const bin = new Mesh(
    new CylinderGeometry(0.15, 0.12, 0.36, 20, 1, true),
    createPs1Material({
      color: '#6d7376',
      roughness: 0.5,
      metalness: 0.6,
      side: DoubleSide,
    }),
  );
  kit.materials.push(bin.material as Material);
  bin.position.y = 0.18;
  group.add(bin);
  t.cyl(group, t.paint('#2a2522', 0.9), 0.12, 0.01, 0, 0.005, 0);
  // The flames: hundreds of soft, glowing particles rising from the
  // paper in the bin, yellow-white at the root, orange, then red as they
  // cool, narrowing and swaying towards their tips, drawn twice (a bright
  // core and a wide dim glow) and added to what is behind them.
  const sparks = 360;
  const flamePositions = new Float32Array(sparks * 3);
  const flameColours = new Float32Array(sparks * 3);
  const age = new Float32Array(sparks).map(() => Math.random());
  const span = new Float32Array(sparks).map(() => 0.45 + Math.random() * 0.45);
  const root = new Float32Array(sparks * 2).map(() => Math.random() * 2 - 1);
  const lift = new Float32Array(sparks).map(() => 0.6 + Math.random() * 0.5);
  const flameGeometry = new BufferGeometry();
  flameGeometry.setAttribute(
    'position',
    new BufferAttribute(flamePositions, 3),
  );
  flameGeometry.setAttribute('color', new BufferAttribute(flameColours, 3));
  const dot = softDot(kit);
  const layer = (base: number, opacity: number) => {
    const material = new PointsMaterial({
      map: dot,
      size: base * METRE,
      vertexColors: true,
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    kit.materials.push(material);
    const points = new ParticlePoints(flameGeometry, material);
    points.frustumCulled = false;
    group.add(points);
    return { points, material, base };
  };
  const layers = [layer(0.07, 0.75), layer(0.2, 0.3)];
  /** The colour of a flame particle `l` (0 to 1) through its life. */
  const stops: [number, number, number, number][] = [
    [0, 0.75, 0.52, 0.2],
    [0.3, 0.7, 0.32, 0.06],
    [0.65, 0.45, 0.09, 0.02],
    [1, 0, 0, 0],
  ];
  const tint = (l: number, out: Float32Array, at: number) => {
    let k = 0;
    while (k < stops.length - 2 && l > stops[k + 1][0]) k++;
    const [l0, r0, g0, b0] = stops[k];
    const [l1, r1, g1, b1] = stops[k + 1];
    const f = Math.min(1, Math.max(0, (l - l0) / (l1 - l0)));
    out[at] = r0 + (r1 - r0) * f;
    out[at + 1] = g0 + (g1 - g0) * f;
    out[at + 2] = b0 + (b1 - b0) * f;
  };
  // Smoke: grey puffs rising from the bin in a plume, then spreading out
  // under the ceiling, as a real ceiling jet does.
  const count = 420;
  const positions = new Float32Array(count * 3);
  const life = new Float32Array(count).map(() => Math.random());
  const drift = new Float32Array(count * 2).map(() => Math.random() * 2 - 1);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const puffs = new PointsMaterial({
    map: softDot(kit),
    color: '#5a5a58',
    size: 0.35 * METRE,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  kit.materials.push(puffs);
  const cloud = new ParticlePoints(geometry, puffs);
  cloud.frustumCulled = false;
  group.add(cloud);
  let time = 0;
  let size = 0;
  let smoke = 0;
  return {
    group,
    set(value: number, smokiness = 0) {
      size = value;
      smoke = smokiness;
    },
    update(delta: number) {
      time += delta;
      puffs.opacity = Math.min(0.45, smoke * 0.5);
      cloud.visible = smoke > 0.02;
      if (cloud.visible)
        for (let i = 0; i < count; i++) {
          life[i] = (life[i] + delta * 0.25) % 1;
          const s = life[i];
          // Up the plume, then out under the ceiling.
          const rise = Math.min(1, s / 0.4);
          const spread = Math.max(0, s - 0.4) * 11;
          positions[i * 3] = drift[i * 2] * (0.08 + spread);
          positions[i * 3 + 1] =
            0.5 + rise * 2.0 + Math.min(0.12, spread * 0.02);
          positions[i * 3 + 2] = drift[i * 2 + 1] * (0.08 + spread);
        }
      geometry.attributes.position.needsUpdate = cloud.visible;
      const burning = size > 0.001;
      for (const l of layers) {
        l.points.visible = burning;
        l.material.size = l.base * METRE * (0.6 + size * 2.2);
      }
      if (!burning) return;
      // A bigger fire: more particles alight, rising faster and higher.
      const alight = Math.min(sparks, Math.round(sparks * (0.25 + size * 2)));
      const height = 0.5 + size * 2.4;
      for (let i = 0; i < sparks; i++) {
        age[i] += delta / span[i];
        if (age[i] >= 1) {
          age[i] -= 1;
          root[i * 2] = Math.random() * 2 - 1;
          root[i * 2 + 1] = Math.random() * 2 - 1;
        }
        const l = age[i];
        const narrow = 0.11 * (1 - l * 0.75) * (0.7 + size);
        const sway = Math.sin(time * 6 + i * 1.7) * 0.03 * l;
        flamePositions[i * 3] = root[i * 2] * narrow + sway;
        flamePositions[i * 3 + 1] = 0.3 + l * height * lift[i];
        flamePositions[i * 3 + 2] = root[i * 2 + 1] * narrow;
        if (i < alight) tint(l, flameColours, i * 3);
        else flameColours.fill(0, i * 3, i * 3 + 3);
      }
      flameGeometry.attributes.position.needsUpdate = true;
      flameGeometry.attributes.color.needsUpdate = true;
    },
  };
}

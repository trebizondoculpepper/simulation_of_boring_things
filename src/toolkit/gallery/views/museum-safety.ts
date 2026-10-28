import { Group, Mesh, Points, SphereGeometry } from 'three';
import type { Object3D } from 'three';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { SANS, tools } from '../../components/core/views/fitting-tools';
import { markComponent } from '../../components/core/views/component-identity';
import { mergeTree } from '../../components/core/views/merge-static';
import {
  createFloorBox,
  createOccupancySensor,
  createTwinSocket,
} from '../../components/architectural/views/building-fittings';
import {
  createCallPoint,
  createExtinguisher,
  createSmokeDetector,
  createSounderBeacon,
  createSprinklerHead,
} from '../../components/fire/views/fire-fittings';
import {
  createFireExitDoor,
  createFirePointStand,
} from '../../components/fire/views/detection-and-exits';
import {
  createEscapeSign,
  createFireDoorSign,
  createFirstAidSign,
} from '../../components/general-safety/views/escape-signs';
import {
  createEmergencyBulkhead,
  createExitSign,
} from '../../components/general-safety/views/safety-fittings';
import { createFireActionNotice } from '../../components/general-safety/views/safety-notices';
import { FIRE_EXIT, safetyLayer } from '../logic/museum-safety';
import type { SafetyFitting } from '../logic/museum-safety';
import { MUSEUM_HALL0, MUSEUM_SQUARE } from '../logic/museum-plan';
import type { MuseumHallId } from '../logic/museum-plan';
import { MUSEUM_EXHIBITION as BRAND } from '../logic/museum-brand';

/**
 * The museum's safety and services layer (mission 107, `logic/museum-safety.ts`),
 * built of the game's own fittings: BS 1363 sockets and floor boxes, call
 * points, sounder-beacons, emergency bulkheads, maintained exit signs and
 * hanging escape signs, fire point boards, smoke detectors and sprinklers
 * in Hall 0, CCTV domes and PIRs, Hall 0's fire exit door and its signs,
 * the defibrillator and first aid, and the visitors' notices: current UK
 * signs throughout (ISO 7010). Set decoration, merged by material, so it
 * costs a few draw calls a room. In the museum's coordinates.
 */

const GREEN = '#00894a';
const SAFE_BLUE = '#005ca8';
const RED = '#c4231c';

/** A printed sign `w` × `h` on a thin plate, facing +z. */
function sign(
  kit: PanelKit,
  w: number,
  h: number,
  draw: (c: CanvasRenderingContext2D, cw: number, ch: number) => void,
  px = 512,
) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#f4f4f0', 0.5), w, h, 0.004, 0, 0, 0.002);
  const face = t.printed(w - 0.004, h - 0.004, draw, px);
  face.mesh.position.z = 0.0045;
  group.add(face.mesh);
  return group;
}

/** Lines of text, centred, from `y`, each `size` high. */
function lines(
  c: CanvasRenderingContext2D,
  text: readonly string[],
  x: number,
  y: number,
  size: number,
  weight = 'bold',
  colour = '#ffffff',
) {
  c.fillStyle = colour;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  text.forEach((l, i) => {
    c.font = `${weight} ${size}px ${SANS}`;
    c.fillText(l, x, y + i * size * 1.25);
  });
}

/** ISO 7010 E010, the defibrillator: a heart, a lightning flash across it and a cross. */
function drawAed(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.save();
  c.translate(x, y);
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(0, s * 0.35);
  c.bezierCurveTo(-s * 0.55, -s * 0.05, -s * 0.35, -s * 0.45, 0, -s * 0.2);
  c.bezierCurveTo(s * 0.35, -s * 0.45, s * 0.55, -s * 0.05, 0, s * 0.35);
  c.fill();
  c.fillStyle = GREEN;
  c.beginPath();
  c.moveTo(s * 0.05, -s * 0.32);
  c.lineTo(-s * 0.12, s * 0.02);
  c.lineTo(s * 0.02, s * 0.02);
  c.lineTo(-s * 0.06, s * 0.3);
  c.lineTo(s * 0.14, -s * 0.06);
  c.lineTo(0, -s * 0.06);
  c.closePath();
  c.fill();
  c.fillStyle = '#ffffff';
  c.fillRect(s * 0.3, -s * 0.48, s * 0.06, s * 0.2);
  c.fillRect(s * 0.23, -s * 0.41, s * 0.2, s * 0.06);
  c.restore();
}

/** ISO 7010 P010, do not touch: a hand in a red circle and slash. */
function drawNoTouch(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
) {
  c.save();
  c.translate(x, y);
  c.fillStyle = '#1b1b1b';
  // The hand, palm out.
  c.fillRect(-s * 0.16, -s * 0.05, s * 0.32, s * 0.3);
  for (let k = 0; k < 4; k++)
    c.fillRect(-s * 0.16 + k * s * 0.085, -s * 0.3, s * 0.065, s * 0.28);
  c.fillRect(s * 0.16, 0, s * 0.12, s * 0.06);
  c.strokeStyle = RED;
  c.lineWidth = s * 0.1;
  c.beginPath();
  c.arc(0, 0, s * 0.42, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.moveTo(-s * 0.3, -s * 0.3);
  c.lineTo(s * 0.3, s * 0.3);
  c.stroke();
  c.restore();
}

/** A CCTV camera pictogram. */
function drawCamera(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  colour: string,
) {
  c.save();
  c.translate(x, y);
  c.fillStyle = colour;
  c.save();
  c.rotate(0.35);
  c.fillRect(-s * 0.35, -s * 0.12, s * 0.6, s * 0.24);
  c.fillRect(s * 0.25, -s * 0.07, s * 0.1, s * 0.14);
  c.restore();
  c.fillRect(-s * 0.42, -s * 0.2, s * 0.06, s * 0.5);
  c.fillRect(-s * 0.42, -s * 0.02, s * 0.2, s * 0.05);
  c.restore();
}

/** Each kind of fitting, built facing +z with its back at z = 0 (on a wall) or hanging from y = 0 (on a ceiling). */
function build(kit: PanelKit, f: SafetyFitting, top: number): Object3D {
  const t = tools(kit);
  switch (f.kind) {
    case 'socket': {
      const socket = createTwinSocket(kit, { testers: false });
      // Both switched on, nothing plugged in.
      for (const side of socket.sides) side.set(true, false);
      return socket.group;
    }
    case 'floor-box':
      return createFloorBox(kit).group;
    case 'call-point':
      return createCallPoint(kit).group;
    case 'sounder':
      return createSounderBeacon(kit).group;
    case 'bulkhead': {
      const b = createEmergencyBulkhead(kit);
      b.set(false, true);
      return b.group;
    }
    case 'exit-box': {
      const s = createExitSign(kit);
      s.set(1);
      return s.group;
    }
    case 'exit-hanging': {
      // One-sided, its back the sign's white housing; on two wires.
      const g = new Group();
      g.add(createEscapeSign(kit, f.arrow ?? 'up'));
      const wire = t.paint('#9aa0a2', 0.4, 0.8);
      const up = Math.max(0.3, top - f.y);
      for (const x of [-0.15, 0.15])
        t.box(g, wire, 0.003, up, 0.003, x, up / 2, 0.025);
      return g;
    }
    case 'fire-point': {
      const g = new Group();
      // Stood a little off the wall.
      const stand = createFirePointStand(kit);
      stand.position.z = 0.05;
      g.add(stand);
      (['water', 'co2'] as const).forEach((kind, i) => {
        const e = createExtinguisher(kit, kind);
        e.group.position.set(i ? 0.15 : -0.15, 0.25, 0.05);
        e.group.scale.setScalar(0.92);
        g.add(e.group);
      });
      const notice = createFireActionNotice(kit);
      notice.scale.setScalar(0.85);
      notice.position.set(0, 1.25, 0.054);
      g.add(notice);
      return g;
    }
    case 'cctv': {
      // A vandal-resistant dome on a short wall bracket: its smoked dome under a white housing.
      const g = new Group();
      const white = t.paint('#ecebe6', 0.4);
      t.box(g, white, 0.1, 0.14, 0.02, 0, 0, 0.01);
      t.box(g, white, 0.05, 0.05, 0.18, 0, 0.02, 0.1);
      t.cyl(g, white, 0.075, 0.05, 0, 0.0, 0.25, 'y', 24);
      const dome = new Mesh(
        new SphereGeometry(0.06, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        t.paint('#1e2326', 0.1, 0.5),
      );
      dome.rotation.x = Math.PI;
      dome.position.set(0, -0.025, 0.25);
      g.add(dome);
      return g;
    }
    case 'pir': {
      const g = createOccupancySensor(kit).group;
      g.rotation.x = -Math.PI / 2;
      return g;
    }
    case 'do-not-touch':
      return sign(kit, 0.3, 0.2, (c, w, h) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
        drawNoTouch(c, h * 0.5, h * 0.5, h * 0.8);
        c.fillStyle = BRAND.colours.ink;
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.font = `bold ${h * 0.13}px ${SANS}`;
        c.fillText('Please do not touch', h * 1.0, h * 0.32);
        c.font = `${h * 0.1}px ${SANS}`;
        c.fillText('except where you', h * 1.0, h * 0.52);
        c.fillText('see the hand sign', h * 1.0, h * 0.66);
      });
    case 'aed': {
      // A green wall cabinet, its window on the AED, its sign above.
      const g = new Group();
      t.box(g, t.paint(GREEN, 0.5), 0.42, 0.45, 0.2, 0, 0, 0.1);
      t.box(g, t.paint('#d9efe4', 0.1, 0.1), 0.3, 0.3, 0.005, 0, -0.02, 0.2025);
      t.box(g, t.paint('#f2c230', 0.5), 0.18, 0.2, 0.06, 0, -0.04, 0.17);
      t.box(
        g,
        t.paint('#e6e6e0', 0.4, 0.6),
        0.03,
        0.12,
        0.02,
        0.17,
        -0.02,
        0.21,
      );
      const top = sign(kit, 0.3, 0.3, (c, w, h) => {
        c.fillStyle = GREEN;
        c.fillRect(0, 0, w, h);
        drawAed(c, w / 2, h * 0.4, h * 0.6);
        lines(c, ['AED'], w / 2, h * 0.85, h * 0.14);
      });
      top.position.set(0, 0.43, 0);
      g.add(top);
      const under = sign(kit, 0.3, 0.08, (c, w, h) => {
        c.fillStyle = GREEN;
        c.fillRect(0, 0, w, h);
        lines(c, ['Defibrillator'], w / 2, h * 0.5, h * 0.55);
      });
      under.position.set(0, -0.3, 0);
      g.add(under);
      return g;
    }
    case 'first-aid': {
      const g = new Group();
      g.add(createFirstAidSign(kit));
      // The kit below it: a green box with its white cross.
      const box = sign(kit, 0.32, 0.24, (c, w, h) => {
        c.fillStyle = GREEN;
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffffff';
        c.fillRect(w / 2 - h * 0.1, h * 0.2, h * 0.2, h * 0.6);
        c.fillRect(w / 2 - h * 0.3, h * 0.4, h * 0.6, h * 0.2);
      });
      box.scale.z = 25;
      box.position.y = -0.36;
      g.add(box);
      return g;
    }
    case 'cctv-notice':
      return sign(kit, 0.3, 0.4, (c, w, h) => {
        c.fillStyle = '#ffd200';
        c.fillRect(0, 0, w, h);
        drawCamera(c, w / 2, h * 0.24, w * 0.55, '#1b1b1b');
        lines(
          c,
          ['Images are being', 'recorded'],
          w / 2,
          h * 0.5,
          h * 0.075,
          'bold',
          '#1b1b1b',
        );
        lines(
          c,
          [
            'for the safety of visitors',
            'and staff and the prevention',
            'of crime. This scheme is',
            'controlled by The Dyehouse.',
          ],
          w / 2,
          h * 0.7,
          h * 0.045,
          'normal',
          '#1b1b1b',
        );
      });
    case 'hearing-loop':
      return sign(kit, 0.2, 0.25, (c, w, h) => {
        c.fillStyle = SAFE_BLUE;
        c.fillRect(0, 0, w, h);
        // An ear and a T: the hearing loop symbol.
        c.strokeStyle = '#ffffff';
        c.lineWidth = w * 0.06;
        c.beginPath();
        c.arc(w * 0.42, h * 0.3, w * 0.2, Math.PI * 0.9, Math.PI * 2.3);
        c.quadraticCurveTo(w * 0.5, h * 0.48, w * 0.4, h * 0.5);
        c.stroke();
        c.fillStyle = '#ffffff';
        c.font = `bold ${w * 0.22}px ${SANS}`;
        c.textAlign = 'center';
        c.fillText('T', w * 0.78, h * 0.36);
        lines(c, ['Hearing loop', 'Switch to T'], w / 2, h * 0.72, w * 0.1);
      });
    case 'wayfinding':
      return sign(kit, 0.9, 0.4, (c, w, h) => {
        c.fillStyle = BRAND.colours.ink;
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffffff';
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        const rows = [
          ['←', 'Way out, stairs to the ground floor'],
          ['←', 'Toilets, accessible toilet, baby change'],
          ['←', 'Cloakroom, café and shop: ground floor'],
          ['→', 'The exhibition: PLANTROOMS'],
        ];
        rows.forEach(([a, text], i) => {
          const y = h * (0.17 + i * 0.22);
          c.font = `bold ${h * 0.14}px ${SANS}`;
          c.fillText(a, w * 0.04, y);
          c.font = `${h * 0.1}px ${SANS}`;
          c.fillText(text, w * 0.12, y);
        });
      });
    case 'occupancy':
      return sign(kit, 0.3, 0.2, (c, w, h) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
        c.fillStyle = SAFE_BLUE;
        c.fillRect(0, 0, w, h * 0.28);
        lines(c, ['NOTICE'], w / 2, h * 0.15, h * 0.16);
        lines(
          c,
          ['Maximum occupancy', 'of these galleries:', '150 people'],
          w / 2,
          h * 0.45,
          h * 0.12,
          'bold',
          '#1b1b1b',
        );
      });
    case 'fire-exit-door': {
      const g = createFireExitDoor(kit, FIRE_EXIT.w, FIRE_EXIT.h);
      // FIRE EXIT KEEP CLEAR on the leaf.
      const s = sign(kit, 0.3, 0.15, (c, w, h) => {
        c.fillStyle = GREEN;
        c.fillRect(0, 0, w, h);
        lines(c, ['FIRE EXIT', 'KEEP CLEAR'], w / 2, h * 0.32, h * 0.26);
      });
      s.position.set(0, 1.55, 0.05);
      g.add(s);
      return g;
    }
    case 'final-exit-sign':
      return createEscapeSign(kit, 'up', true);
    case 'ground-floor-sign':
      return sign(kit, 0.4, 0.3, (c, w, h) => {
        c.fillStyle = GREEN;
        c.fillRect(0, 0, w, h);
        lines(c, ['EXIT'], w / 2, h * 0.2, h * 0.2);
        // Stairs going down, and the arrow down them.
        c.strokeStyle = '#ffffff';
        c.lineWidth = h * 0.04;
        c.beginPath();
        c.moveTo(w * 0.2, h * 0.42);
        for (let k = 0; k < 4; k++) {
          c.lineTo(w * (0.2 + k * 0.08 + 0.08), h * (0.42 + k * 0.08));
          c.lineTo(w * (0.2 + k * 0.08 + 0.08), h * (0.42 + (k + 1) * 0.08));
        }
        c.stroke();
        c.fillStyle = '#ffffff';
        c.font = `bold ${h * 0.3}px ${SANS}`;
        c.textAlign = 'center';
        c.fillText('↓', w * 0.78, h * 0.56);
        lines(c, ['Ground floor'], w / 2, h * 0.86, h * 0.13);
      });
    case 'door-keep-shut': {
      // On the door's leaf, proud of the wall.
      const g = new Group();
      const s = createFireDoorSign(kit);
      s.position.z = 0.05;
      g.add(s);
      return g;
    }
    case 'staff-door': {
      // A plain single door, kept shut, with its signs and a keypad.
      const g = new Group();
      t.box(g, t.paint('#3c4447', 0.45), 1.04, 2.14, 0.05, 0, 1.07, 0.025);
      t.box(g, t.paint('#8a9a96', 0.5), 0.92, 2.06, 0.045, 0, 1.03, 0.05);
      t.box(g, t.paint('#c6cacb', 0.3, 0.8), 0.86, 0.25, 0.004, 0, 0.14, 0.075);
      t.box(
        g,
        t.paint('#c6cacb', 0.3, 0.8),
        0.14,
        0.025,
        0.06,
        0.34,
        1.0,
        0.09,
      );
      const staff = sign(kit, 0.3, 0.1, (c, w, h) => {
        c.fillStyle = SAFE_BLUE;
        c.fillRect(0, 0, w, h);
        lines(c, ['STAFF ONLY'], w / 2, h * 0.5, h * 0.5);
      });
      staff.position.set(0, 1.62, 0.074);
      g.add(staff);
      const shut = createFireDoorSign(kit);
      shut.position.set(0, 1.4, 0.072);
      g.add(shut);
      t.box(g, t.paint('#2a2a2a', 0.4), 0.08, 0.12, 0.03, 0.7, 1.2, 0.015);
      return g;
    }
    case 'smoke-detector':
      return createSmokeDetector(kit).group;
    case 'sprinkler': {
      const s = createSprinklerHead(kit).group;
      for (const child of [...s.children])
        if (child instanceof Points) s.remove(child);
      return s;
    }
  }
}

/** A room's safety layer, built and merged. Dispose with `dispose`. */
export function createMuseumSafety(id: MuseumHallId) {
  const kit = createPanelKit();
  const group = new Group();
  group.name = `${id} safety and services`;
  for (const f of safetyLayer(id)) {
    // The wires of a hanging sign go up to the lighting track, or Hall 0's ceiling.
    const object = build(
      kit,
      f,
      id === 'museum0' ? MUSEUM_HALL0.h : MUSEUM_SQUARE.h - 2.4,
    );
    object.position.set(f.x, f.y, f.z);
    object.rotation.y = f.yaw;
    group.add(object);
  }
  markComponent(group, { decorative: true });
  return {
    group,
    /** Merge it by material, once it is in place (its world matrices current). */
    merge() {
      // What a fitting hides (a socket's unplugged testers) goes, so it is
      // not merged in and shown.
      const hidden: Object3D[] = [];
      group.traverse((o) => {
        if (!o.visible) hidden.push(o);
      });
      for (const o of hidden) {
        o.removeFromParent();
        o.traverse((m) => {
          if (m instanceof Mesh) m.geometry.dispose();
        });
      }
      group.updateMatrixWorld(true);
      mergeTree(group, () => false, Infinity, { share: true });
    },
    dispose() {
      group.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      for (const m of kit.materials) m.dispose();
      for (const t of kit.textures) t.dispose();
    },
  };
}

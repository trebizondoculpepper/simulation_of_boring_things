import {
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS, tools } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';
import { clockHands } from '../logic/pool-clock';

/**
 * A pool hall's wall clock (mission 106), after the big sweep-second
 * clocks every pool has where swimmers can see them: a white dial with
 * bold numerals and minute marks under a steel bezel, black hour and
 * minute hands and a red sweep second hand. The dial is printed once;
 * the hands are meshes turned each frame to the time given, so it costs
 * nothing to run. When the time it is given runs so fast that the second
 * hand would turn more than an eighth of a turn a frame (it would only
 * strobe), the hand gives way to a faint red blur over the dial, as a fast
 * hand looks to the eye. In its own frame its dial faces +z at its origin.
 */
export function createPoolClock(kit: PanelKit, { dia = 0.7 } = {}) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Pool clock';
  const r = dia / 2;
  const steel = t.paint('#c6cbcd', 0.3, 0.8);
  t.cyl(group, steel, r + 0.03, 0.07, 0, 0, 0.035, 'z', 64);
  const face = t.printed(
    dia,
    dia,
    (c, w) => {
      const m = w / 2;
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(m, m, m, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#111111';
      for (let k = 0; k < 60; k++) {
        const a = (k / 60) * Math.PI * 2;
        const long = k % 5 === 0;
        c.save();
        c.translate(m, m);
        c.rotate(a);
        c.fillRect(
          -w * (long ? 0.012 : 0.005),
          -m * 0.96,
          w * (long ? 0.024 : 0.01),
          m * (long ? 0.12 : 0.06),
        );
        c.restore();
      }
      c.font = `bold ${w * 0.11}px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      for (let k = 1; k <= 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        c.fillText(
          String(k),
          m + Math.sin(a) * m * 0.7,
          m - Math.cos(a) * m * 0.7,
        );
      }
      c.font = `bold ${w * 0.035}px ${SANS}`;
      c.fillStyle = '#b22a22';
      c.fillText('PLANT TIME', m, m * 1.38);
    },
    1024,
  );
  face.mesh.position.z = 0.071;
  (face.mesh.material as { transparent?: boolean }).transparent = true;
  group.add(face.mesh);
  const badge = createBrandBadge(kit, 'poolguard', { height: dia * 0.045 });
  badge.position.set(0, r * 0.38, 0.073);
  group.add(badge);
  // The hands, each pivoted at the dial's middle, pointing up at zero.
  const hand = (
    length: number,
    width: number,
    colour: string,
    z: number,
    tail = 0.12,
  ) => {
    const pivot = new Group();
    pivot.position.z = z;
    pivot.userData.live = true;
    const paint = t.paint(colour, 0.5);
    t.box(
      pivot,
      paint,
      width,
      length * (1 + tail),
      0.004,
      0,
      (length * (1 - tail)) / 2,
      0,
    );
    group.add(pivot);
    return pivot;
  };
  const hour = hand(r * 0.5, dia * 0.035, '#111111', 0.076);
  const minute = hand(r * 0.78, dia * 0.025, '#111111', 0.08);
  const second = hand(r * 0.86, dia * 0.008, '#c62c22', 0.084, 0.2);
  t.cyl(group, t.paint('#c62c22', 0.5), dia * 0.02, 0.01, 0, 0, 0.088, 'z', 16);
  // The blur a hand too fast to follow leaves.
  const blurMaterial = new MeshBasicMaterial({
    color: '#e0473b',
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  kit.materials.push(blurMaterial);
  const blur = new Mesh(new RingGeometry(r * 0.06, r * 0.86, 48), blurMaterial);
  blur.position.z = 0.083;
  blur.visible = false;
  blur.userData.live = true;
  group.add(blur);
  // Glass.
  const glass = new Mesh(
    new CircleGeometry(r, 48),
    new MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
    }),
  );
  kit.materials.push(glass.material as MeshBasicMaterial);
  glass.position.z = 0.092;
  group.add(glass);
  return {
    group,
    /**
     * Show `clock` (seconds after midnight), the time running at `rate`
     * clock seconds a real second, on a display drawing about `fps` frames a second.
     */
    show(clock: number, rate: number, fps = 60) {
      const h = clockHands(clock);
      hour.rotation.z = -h.hour;
      minute.rotation.z = -h.minute;
      // The second hand turns rate/60 turns a second: an eighth of a turn
      // a frame and more, it would only strobe.
      const fast = rate / 60 / fps > 1 / 8;
      second.visible = !fast;
      blur.visible = fast;
      if (!fast) second.rotation.z = -h.second;
    },
  };
}

import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { plantTools } from './plant-tools';
import { onPlinth } from './plinth';

/**
 * The large tanks' level instruments, as components of their own (the
 * owner, 2026-10-27: repeatable components on plinths, styled once):
 *
 * - `createLevelTransmitter`: a non-contact level transmitter in its 2"
 *   socket: ultrasonic, a squat white head over a wide transducer face
 *   (after Siemens' Probe LU), or 80 GHz radar, a compact grey barrel with
 *   a PTFE lens (after VEGAPULS C 21), for acid, whose fumes upset
 *   ultrasound. Its base at the origin, standing up.
 * - `createLevelIndicator`: the loop-powered field indicator it drives,
 *   after the Kessler-Moody LI-5: five red digits of litres, a bar of the
 *   contents, its gland underneath, on a short bracket. Its face toward +z.
 */
export function createLevelTransmitter(kit: PanelKit, radar: boolean) {
  const t = plantTools(kit);
  const lt = new Group();
  const hdpe = t.paint('#1c1e1f', 0.78);
  const dark = t.paint('#2a2f31', 0.6);
  t.cyl(lt, hdpe, 0.06, 0.05, 0, 0.025, 0, 'y', 16);
  if (radar) {
    t.cyl(lt, t.paint('#5d6366', 0.4, 0.2), 0.042, 0.17, 0, 0.135, 0, 'y', 24);
    t.cyl(lt, t.paint('#e8e6dc', 0.5), 0.044, 0.02, 0, 0.06, 0, 'y', 24);
    t.cyl(lt, dark, 0.044, 0.025, 0, 0.23, 0, 'y', 24);
  } else {
    t.cyl(lt, t.paint('#e9eae4', 0.5), 0.07, 0.08, 0, 0.09, 0, 'y', 24);
    t.cyl(lt, t.paint('#d9dad4', 0.5), 0.05, 0.13, 0, 0.195, 0, 'y', 24);
    t.cyl(lt, t.paint('#2f63a3', 0.5), 0.052, 0.025, 0, 0.27, 0, 'y', 24);
  }
  t.cyl(lt, dark, 0.014, 0.04, 0.05, 0.17, 0, 'x', 8);
  return lt;
}

export function createLevelIndicator(
  kit: PanelKit,
  { tag, litres }: { tag: string; litres: number },
) {
  const t = plantTools(kit);
  const f = tools(kit);
  const disp = new Group();
  const galv = t.paint('#a9afaf', 0.38, 0.75);
  const dark = t.paint('#2a2f31', 0.6);
  t.box(disp, galv, 0.04, 0.12, 0.04, 0, -0.08, -0.03);
  t.box(disp, t.paint('#33393b', 0.5), 0.15, 0.12, 0.07, 0, 0, 0);
  t.cyl(disp, dark, 0.011, 0.025, 0, -0.072, 0, 'y', 8);
  const face = f.printed(0.13, 0.095, () => {}, 256, true);
  face.mesh.position.set(0, 0, 0.036);
  face.mesh.userData.live = true;
  disp.add(face.mesh);
  let shown = -1;
  const draw = (fraction: number) => {
    const c = face.context;
    const w = c.canvas.width;
    const h = c.canvas.height;
    c.fillStyle = '#121616';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#6f7a7a';
    c.font = 'bold 16px sans-serif';
    c.fillText('KESSLER-MOODY LI-5', 10, 20);
    c.textAlign = 'right';
    c.fillText(`${tag} · L`, w - 10, 42);
    c.textAlign = 'left';
    c.fillStyle = '#ff3a26';
    c.font = 'bold 74px monospace';
    c.textAlign = 'right';
    c.fillText(
      String(Math.round(fraction * litres)).padStart(5, ' '),
      w - 14,
      100,
    );
    c.textAlign = 'left';
    c.strokeStyle = '#6f7a7a';
    c.strokeRect(12, h - 50, w - 24, 26);
    c.fillStyle = fraction > 0.95 ? '#ff3a26' : '#d9a21c';
    c.fillRect(14, h - 48, (w - 28) * fraction, 22);
    c.fillStyle = '#6f7a7a';
    c.font = '14px sans-serif';
    for (const p of [0, 25, 50, 75, 100])
      c.fillText(`${p}`, 12 + ((w - 40) * p) / 100, h - 8);
    face.texture.needsUpdate = true;
  };
  draw(0);
  return {
    object: disp,
    /** Show `fraction` of full. */
    set(fraction: number) {
      const v = Math.max(0, Math.min(1, fraction));
      const r = Math.round(v * litres);
      if (r === shown) return;
      shown = r;
      draw(v);
    },
  };
}

/**
 * The level instruments on a plinth, for trying them: an ultrasonic and a
 * radar transmitter, and an indicator reading a level that rises and
 * falls.
 */
export function createLevelInstrumentsDemo(kit: PanelKit) {
  const stand = new Group();
  const us = createLevelTransmitter(kit, false);
  us.position.set(-0.12, 0, -0.05);
  const rd = createLevelTransmitter(kit, true);
  rd.position.set(0.12, 0, -0.05);
  const li = createLevelIndicator(kit, { tag: 'DEMO', litres: 4000 });
  li.object.position.set(0, 0.15, 0.13);
  stand.add(us, rd, li.object);
  const object = onPlinth(kit, stand, 0.5);
  let time = 0;
  const level = () => 0.5 + 0.4 * Math.sin(time / 20);
  return {
    object,
    update(delta: number) {
      time += delta;
      li.set(level());
    },
    status: () =>
      `Level instruments: reading ${Math.round(level() * 4000)} L of 4,000 L`,
  };
}

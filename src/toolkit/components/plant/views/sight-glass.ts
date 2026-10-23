import { CircleGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { plantTools } from './plant-tools';
import { newGlass, stepSightGlass, surfaceAt } from '../logic/sight-glass';
import type { GlassInputs } from '../logic/sight-glass';

/** A small seeded generator, so each glass's grains lie the same each time. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mix = (
  a: [number, number, number],
  b: [number, number, number],
  t: number,
) => `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(',')})`;

/**
 * A filter's sight glass (`logic/sight-glass.ts`): the round window at
 * the top of the bed, `radius` across, in its rim, set so the bed's
 * surface at rest is across its middle (the owner, 2026-10-23): the sand
 * below, showing its condition (its crust, the surface's unevenness), and
 * the water over it, black, in a vessel with no light of its own. In a
 * backwash the bed lifts and churns, and the water over it clouds a pale
 * brown with the dirt coming out, clearing back to black as it goes; air
 * at its start shows as bubbles. A flat disc facing +z in its own frame,
 * for a filter of any size; `update` steps it and draws it (at most
 * fifteen times a second, and only while what it shows is changing).
 */
export function createSightGlass(
  kit: PanelKit,
  { radius = 0.1, seed = 7 } = {},
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Sight glass';
  const px = 256;
  const { context: c, texture } = createCanvasTexture(px, px);
  kit.textures.push(texture);
  const material = new MeshStandardMaterial({
    map: texture,
    roughness: 0.15,
    emissive: '#ffffff',
    emissiveMap: texture,
    emissiveIntensity: 0.35,
  });
  kit.materials.push(material);
  const disc = new Mesh(new CircleGeometry(radius, 48), material);
  // In front of its rim (which stands 6 mm proud).
  disc.position.z = 0.009;
  disc.userData.live = true;
  group.add(disc);
  // Its rim, a dark ring round the glass.
  const rim = t.paint('#2a2f33', 0.5, 0.5);
  t.cyl(group, rim, radius * 1.18, 0.012, 0, 0, 0, 'z', 40);
  // Its grains, sown once: sand in the bed, and those churned up above it.
  const rand = seeded(seed);
  const grains = Array.from({ length: 420 }, () => ({
    x: rand(),
    y: rand(),
    r: 0.6 + rand() * 1.6,
    shade: rand(),
  }));
  const floaters = Array.from({ length: 70 }, () => ({
    x: rand(),
    phase: rand() * Math.PI * 2,
    speed: 0.3 + rand() * 0.7,
  }));
  const bubbles = Array.from({ length: 14 }, () => ({
    x: 0.15 + rand() * 0.7,
    phase: rand(),
    r: 2 + rand() * 4,
  }));
  let state = newGlass();
  let time = 0;
  let since = Infinity;
  let drawn = '';
  const SAND: [number, number, number] = [220, 190, 116];
  const CRUST: [number, number, number] = [74, 61, 42];
  // The water: black in the dark vessel, a pale brown with a backwash's dirt.
  const CLEAR: [number, number, number] = [6, 7, 8];
  const MURK: [number, number, number] = [176, 146, 104];
  const draw = () => {
    c.clearRect(0, 0, px, px);
    c.save();
    c.beginPath();
    c.arc(px / 2, px / 2, px / 2, 0, Math.PI * 2);
    c.clip();
    // The water.
    c.fillStyle = mix(CLEAR, MURK, state.murk);
    c.fillRect(0, 0, px, px);
    // The bed, below its surface.
    const yAt = (x: number) => px * (1 - surfaceAt(state, x, time));
    c.beginPath();
    c.moveTo(0, px);
    for (let k = 0; k <= 64; k++) c.lineTo((k / 64) * px, yAt(k / 64));
    c.lineTo(px, px);
    c.closePath();
    c.fillStyle = mix(SAND, CRUST, state.crustDark * 0.25);
    c.fill();
    // Its grains, jostling as it churns.
    c.save();
    c.clip();
    for (const g of grains) {
      const jx = state.churn * 2.5 * Math.sin(time * 6 + g.shade * 40);
      const jy = state.churn * 2.5 * Math.cos(time * 5 + g.shade * 30);
      c.fillStyle =
        g.shade < 0.5 ? 'rgba(120,98,66,0.55)' : 'rgba(240,226,196,0.5)';
      c.beginPath();
      c.arc(g.x * px + jx, g.y * px + jy, g.r, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    // The crust: a dark band at the top of the bed, as thick as its dirt.
    if (state.crust > 0.002) {
      c.beginPath();
      for (let k = 0; k <= 64; k++) c.lineTo((k / 64) * px, yAt(k / 64));
      for (let k = 64; k >= 0; k--)
        c.lineTo((k / 64) * px, yAt(k / 64) + state.crust * px);
      c.closePath();
      c.fillStyle = mix(SAND, CRUST, Math.min(1, 0.25 + state.crustDark));
      c.fill();
    }
    // Sand churned up into the water.
    const up = Math.round(state.churn * floaters.length);
    for (let k = 0; k < up; k++) {
      const f = floaters[k];
      const top = yAt(f.x);
      const rise = ((time * f.speed * 0.25 + f.phase) % 1) * px * 0.25;
      c.fillStyle = 'rgba(214,192,150,0.8)';
      c.beginPath();
      c.arc(
        f.x * px + Math.sin(time * 2 + f.phase) * 4,
        top - rise,
        1.4,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    // Air rising.
    if (state.bubbles > 0.02)
      for (const b of bubbles) {
        const y = px - ((time * 0.6 + b.phase) % 1) * px;
        c.strokeStyle = `rgba(235,245,250,${0.7 * state.bubbles})`;
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(b.x * px, y, b.r, 0, Math.PI * 2);
        c.stroke();
      }
    // The murk thick in the water over the bed, veiling the churned sand.
    if (state.murk > 0.01) {
      c.save();
      c.beginPath();
      c.moveTo(0, 0);
      for (let k = 0; k <= 64; k++) c.lineTo((k / 64) * px, yAt(k / 64));
      c.lineTo(px, 0);
      c.closePath();
      c.clip();
      c.fillStyle = `rgba(${MURK.join(',')},${0.55 * state.murk})`;
      c.fillRect(0, 0, px, px);
      c.restore();
    }
    // The glass's glint.
    c.strokeStyle = 'rgba(255,255,255,0.28)';
    c.lineWidth = 10;
    c.beginPath();
    c.arc(px / 2, px / 2, px * 0.38, Math.PI * 1.1, Math.PI * 1.45);
    c.stroke();
    c.restore();
    texture.needsUpdate = true;
  };
  draw();
  return {
    group,
    /** Step the picture `dt` seconds toward what `inputs` ask, and draw it. */
    update(inputs: GlassInputs, dt: number) {
      state = stepSightGlass(state, inputs, dt);
      time += dt;
      since += dt;
      if (since < 1 / 15) return;
      since = 0;
      // Still, and as last drawn: nothing to draw again.
      const key = [
        state.bed,
        state.crust,
        state.crustDark,
        state.rough,
        state.murk,
      ]
        .map((v) => Math.round(v * 200))
        .join();
      const moving = state.churn > 0.01 || state.bubbles > 0.02;
      if (!moving && key === drawn) return;
      drawn = key;
      draw();
    },
  };
}

import { attachRoomReflection } from '../../core/views/room-reflection';
import {
  AddOperation,
  AdditiveBlending,
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { plantTools } from './plant-tools';
import {
  AIR,
  MURK,
  glassKey,
  glassLayers,
  glassMoving,
  mixRgb,
  newGlass,
  settledGlass,
  stepSightGlass,
  surfaceAt,
} from '../logic/sight-glass';
import type { GlassInputs, Rgb } from '../logic/sight-glass';

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

/**
 * A filter's sight glass (`logic/sight-glass.ts`): the round window at
 * the top of the bed, `radius` across, in its rim, a two-dimensional
 * picture standing for the view into the unlit tank (the owner,
 * 2026-10-23 and 2026-10-31): the compacted sand against the glass, the
 * line where its surface meets the glass, the surface receding behind it
 * into the dark, the water over it black; a dirty bed's sludge thickening
 * the line into a brown-to-black band, a pitted one's cavities dipping it,
 * darker hollows going back and tongues of grime down into the sand. In a
 * backwash the bed lifts and fluidises, its grains swirling in water
 * clouded a pale brown with the dirt coming out, clearing back to black
 * as it goes; air at its start shows as bubbles; a bed short of sand
 * shows its surface lower; a vessel drained down, air over its water. A
 * flat disc facing +z in its own frame, for a filter of any size; the
 * layers are worked out in pure logic (`glassLayers`), and `update` steps
 * it and draws it only when what it shows changes, or at most ten times a
 * second while its grains swirl.
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
  // What is behind the glass, matte: the glass in front of it gives the
  // shine (the owner, 2026-10-26: no reflection painted into it).
  const material = new MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
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
  // The glass itself, in front of the picture: a clear, very smooth pane,
  // nearly invisible face-on, the room's lights giving it its highlights
  // as one moves; and its bevelled edge, a rounded ring of the same glass
  // where the highlights catch, as on a thick sight glass.
  // The pane shows only what it reflects, the room's own reflection
  // (`room-reflection.ts`, captured by the room), added over the picture
  // behind it: no point light's spot on it (the owner, 2026-10-26).
  const glass = new MeshBasicMaterial({
    color: '#000000',
    combine: AddOperation,
    // Plainer to see (the owner, 2026-10-26: too subtle).
    reflectivity: 0.5,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  kit.materials.push(glass);
  // Domed, as a thick sight glass is (the owner, 2026-10-26): a shallow
  // cap of a sphere, 12 mm proud at its middle, so its surface faces a
  // little different ways across it and a light's highlight lies within
  // the glass on the side toward it, moving as one moves.
  const rise = 0.012;
  const sphere = (radius * radius + rise * rise) / (2 * rise);
  const pane = new Mesh(
    new SphereGeometry(
      sphere,
      48,
      12,
      0,
      Math.PI * 2,
      0,
      Math.asin(Math.min(1, radius / sphere)),
    ),
    glass,
  );
  pane.rotation.x = Math.PI / 2;
  pane.position.z = 0.009 + rise - sphere;
  group.add(pane);
  // What it reflects: the room, seen from just in front of it.
  attachRoomReflection(group, [glass]);
  // Its rounded edge, smooth: the room's lights catch it in a small
  // crescent on the side toward them, showing the glass's curved profile.
  const edgeGlass = new MeshStandardMaterial({
    color: '#dfe9ec',
    roughness: 0.12,
    metalness: 0.6,
    transparent: true,
    opacity: 0.35,
  });
  kit.materials.push(edgeGlass);
  const edge = new Mesh(
    new TorusGeometry(radius - 0.003, 0.0045, 10, 48),
    edgeGlass,
  );
  edge.position.z = 0.011;
  group.add(edge);
  // Its internal reflection (the owner, 2026-10-26): thick glass sends
  // some of the light that catches its top back through itself, off its
  // back face, to glow faintly on the opposite rim: a soft, dimmer arc
  // just inside the bottom of its edge, the room's light being overhead.
  const inner = new MeshBasicMaterial({
    color: '#cfe3e8',
    transparent: true,
    opacity: 0.08,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  kit.materials.push(inner);
  const glow = new Mesh(
    new TorusGeometry(radius - 0.009, 0.0016, 6, 32, Math.PI * 0.42),
    inner,
  );
  // The arc centred on the bottom of the rim.
  glow.rotation.z = -Math.PI / 2 - Math.PI * 0.21;
  glow.position.z = 0.012;
  group.add(glow);
  // What lies behind it, sown once from its seed: the compacted sand's
  // grains pressed against the glass, painted once to a sheet of their
  // own and laid over the sand's colour at each drawing; the grains of
  // the receding surface, in rows closing up as they go back; grains a
  // backwash swirls up; air rising; drops on the glass where it is dry.
  const rand = seeded(seed);
  const grainSheet = document.createElement('canvas');
  grainSheet.width = px;
  grainSheet.height = px;
  {
    const g = grainSheet.getContext('2d')!;
    for (let k = 0; k < 1500; k++) {
      const x = rand() * px;
      const y = rand() * px;
      const r = 0.5 + rand() * 1.5;
      const shade = rand();
      g.fillStyle =
        shade < 0.35
          ? 'rgba(112,88,56,0.55)'
          : shade < 0.8
            ? 'rgba(246,230,196,0.5)'
            : 'rgba(60,48,34,0.45)';
      g.beginPath();
      g.ellipse(x, y, r, r * (0.7 + rand() * 0.3), rand() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  const ROWS = 22;
  const rows = Array.from({ length: ROWS }, (_, k) => ({
    // Closing up with distance: near rows wide apart, far ones close.
    v: Math.sqrt((k + 0.5) / ROWS),
    dashes: Array.from({ length: 9 }, () => ({
      x: rand(),
      w: 0.01 + rand() * 0.03,
      light: rand() < 0.5,
    })),
  }));
  // The lower edge of the sludge band, ragged: a few waves of its own.
  const ragged = [rand() * 6, rand() * 6, rand() * 6];
  const floaters = Array.from({ length: 90 }, () => ({
    x: rand(),
    phase: rand(),
    speed: 0.3 + rand() * 0.7,
    r: 0.8 + rand() * 1.2,
  }));
  const bubbles = Array.from({ length: 14 }, () => ({
    x: 0.15 + rand() * 0.7,
    phase: rand(),
    r: 2 + rand() * 4,
  }));
  const drops = Array.from({ length: 40 }, () => ({
    x: rand(),
    y: rand(),
    r: 1 + rand() * 2.5,
  }));
  let state = newGlass();
  let settled = false;
  let time = 0;
  let since = Infinity;
  let drawn = '';
  const rgba = (c: Rgb, a = 1) =>
    `rgba(${c.map((v) => Math.round(v)).join(',')},${a.toFixed(3)})`;
  const draw = () => {
    const L = glassLayers(state);
    const Y = (h: number) => px * (1 - h);
    const N = 48;
    const xs = Array.from({ length: N + 1 }, (_, k) => k / N);
    const line = xs.map((x) => Y(surfaceAt(state, x, time)));
    c.clearRect(0, 0, px, px);
    c.save();
    c.beginPath();
    c.arc(px / 2, px / 2, px / 2, 0, Math.PI * 2);
    c.clip();
    // The water, dark in the unlit vessel.
    c.fillStyle = rgba(L.water);
    c.fillRect(0, 0, px, px);
    // The surface receding into the dark: lit a little at the glass,
    // fading to black as it goes back, blurred away as the bed lifts.
    const top = Y(state.bed + L.recede);
    if (L.surfaceSharp > 0.02) {
      c.save();
      c.globalAlpha = L.surfaceSharp;
      c.beginPath();
      c.moveTo(0, top);
      xs.forEach((x, k) => c.lineTo(x * px, line[k]));
      c.lineTo(px, top);
      c.closePath();
      const near = Y(state.bed);
      const fade = c.createLinearGradient(0, near, 0, top);
      fade.addColorStop(0, rgba(L.surfaceNear));
      fade.addColorStop(0.2, rgba(mixRgb(L.surfaceNear, L.water, 0.45)));
      fade.addColorStop(0.55, rgba(mixRgb(L.surfaceNear, L.water, 0.82)));
      fade.addColorStop(1, rgba(L.water));
      c.fillStyle = fade;
      c.fill();
      c.clip();
      // Its grains, foreshortened to dashes, fainter as they go back.
      for (const row of rows) {
        const y = near + (top - near) * row.v;
        const a = 0.35 * (1 - row.v) ** 1.5;
        const h = Math.max(0.6, 2.2 * (1 - row.v));
        for (const d of row.dashes) {
          c.fillStyle = d.light
            ? `rgba(240,222,180,${a.toFixed(3)})`
            : `rgba(0,0,0,${(a * 1.4).toFixed(3)})`;
          c.fillRect(d.x * px, y, d.w * px * (1 - row.v * 0.6), h);
        }
      }
      // Its pits, darker hollows going back, each with its far wall
      // catching what light comes through the glass.
      for (const p of L.hollows) {
        const y = near + (top - near) * p.v - p.h * px * 0.5;
        c.fillStyle = `rgba(0,0,0,${p.alpha.toFixed(3)})`;
        c.beginPath();
        c.ellipse(p.x * px, y, p.w * px, p.h * px, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = rgba(
          mixRgb(L.surfaceNear, [255, 240, 210], 0.15),
          p.alpha * 0.5 * (1 - p.v * 0.8),
        );
        c.lineWidth = Math.max(0.8, 2 * (1 - p.v));
        c.beginPath();
        c.ellipse(
          p.x * px,
          y,
          p.w * px * 0.85,
          p.h * px * 0.7,
          0,
          Math.PI * 1.1,
          Math.PI * 1.9,
        );
        c.stroke();
      }
      c.restore();
    }
    // The sand against the glass, below the line: compacted, its grains
    // sharp; loosening as the bed fluidises, the murk through it.
    c.save();
    c.beginPath();
    c.moveTo(0, px);
    xs.forEach((x, k) => c.lineTo(x * px, line[k]));
    c.lineTo(px, px);
    c.closePath();
    c.clip();
    c.globalAlpha = 0.45 + 0.55 * L.packed;
    c.fillStyle = rgba(L.sand);
    c.fillRect(0, 0, px, px);
    const jx = (1 - L.packed) * 4 * Math.sin(time * 5.3);
    const jy = (1 - L.packed) * 4 * Math.cos(time * 4.1);
    c.drawImage(grainSheet, jx, jy);
    c.globalAlpha = 1;
    // The sludge where surface and glass meet: a thin shadow line clean,
    // a band dirty, brown to near black, ragged below where it works into
    // the top of the sand.
    if (L.sludgeAlpha > 0.01) {
      const depth = Math.max(1.5, L.sludge * px);
      c.beginPath();
      xs.forEach((x, k) => c.lineTo(x * px, line[k] - 1));
      for (let k = N; k >= 0; k--) {
        const x = xs[k];
        const rag =
          0.14 * Math.sin(x * 7 + ragged[0]) +
          0.08 * Math.sin(x * 19 + ragged[1]) +
          0.04 * Math.sin(x * 43 + ragged[2]);
        c.lineTo(x * px, line[k] + depth * (1 + rag));
      }
      c.closePath();
      const band = c.createLinearGradient(
        0,
        Y(state.bed),
        0,
        Y(state.bed) + depth * 1.3,
      );
      band.addColorStop(0, rgba(L.sludgeColour, L.sludgeAlpha));
      band.addColorStop(0.7, rgba(L.sludgeColour, L.sludgeAlpha * 0.85));
      band.addColorStop(1, rgba(L.sludgeColour, L.sludgeAlpha * 0.3));
      c.fillStyle = band;
      c.fill();
      // The grains still showing through it, faintly.
      c.save();
      c.clip();
      c.globalAlpha = 0.3;
      c.drawImage(grainSheet, jx, jy);
      c.restore();
      // Tongues of grime from the pits at the glass, down into the sand.
      for (const t of L.tongues) {
        const k = Math.round(t.x * N);
        const y0 = line[k] - 1;
        const x = t.x * px;
        const deep = y0 + t.length * px;
        // Each a finger of grime with a rounded end, and a fainter halo
        // round it where it stains the sand.
        for (const [grow, alpha] of [
          [1.6, t.alpha * 0.3],
          [1, t.alpha],
        ] as const) {
          const half = (t.w * px * grow) / 2;
          const end = half * 0.45;
          const bottom = y0 + (deep - y0) * (grow > 1 ? 1.12 : 1);
          c.fillStyle = rgba(L.sludgeColour, alpha);
          c.beginPath();
          c.moveTo(x - half, y0);
          c.quadraticCurveTo(
            x - end * 1.1,
            y0 + (bottom - y0) * 0.3,
            x - end,
            bottom - end,
          );
          c.arc(x, bottom - end, end, Math.PI, 0, true);
          c.quadraticCurveTo(
            x + end * 1.1,
            y0 + (bottom - y0) * 0.3,
            x + half,
            y0,
          );
          c.closePath();
          c.fill();
        }
      }
    }
    c.restore();
    // The line itself, a shadow where the surface leaves the glass, and
    // the lip of the surface just behind it catching the light.
    c.strokeStyle = `rgba(0,0,0,${(0.55 * L.surfaceSharp).toFixed(3)})`;
    c.lineWidth = 1.5;
    c.beginPath();
    xs.forEach((x, k) => c.lineTo(x * px, line[k]));
    c.stroke();
    c.strokeStyle = rgba(
      mixRgb(L.surfaceNear, [255, 240, 205], 0.3),
      0.5 * L.surfaceSharp,
    );
    c.lineWidth = 1;
    c.beginPath();
    xs.forEach((x, k) => c.lineTo(x * px, line[k] - 2));
    c.stroke();
    // Sand swirled up into the water as the bed fluidises.
    const up = Math.round((1 - L.packed) * 1.6 * floaters.length);
    for (let k = 0; k < Math.min(up, floaters.length); k++) {
      const f = floaters[k];
      const rise = (time * f.speed * 0.18 + f.phase) % 1;
      const x =
        f.x * px +
        Math.sin(time * f.speed * 1.7 + f.phase * 9) * 14 * (1 - rise);
      const y = Y(state.bed) + 10 - rise * px * 0.45;
      c.fillStyle = `rgba(222,198,150,${(0.85 * (1 - rise * 0.6)).toFixed(3)})`;
      c.beginPath();
      c.arc(x, y, f.r, 0, Math.PI * 2);
      c.fill();
    }
    // Air rising.
    if (state.bubbles > 0.02)
      for (const b of bubbles) {
        const y = px - ((time * 0.6 + b.phase) % 1) * px;
        c.strokeStyle = `rgba(235,245,250,${(0.7 * state.bubbles).toFixed(3)})`;
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(b.x * px, y, b.r, 0, Math.PI * 2);
        c.stroke();
      }
    // The murk in the water, thick over the bed and through it as it
    // lifts, veiling the swirling sand.
    if (L.murk > 0.01) {
      c.save();
      c.beginPath();
      c.moveTo(0, 0);
      xs.forEach((x, k) => c.lineTo(x * px, line[k]));
      c.lineTo(px, 0);
      c.closePath();
      c.clip();
      c.fillStyle = rgba(MURK, 0.85 * L.murk);
      c.fillRect(0, 0, px, px);
      c.restore();
      if (L.packed < 0.95) {
        c.fillStyle = rgba(MURK, 0.5 * L.murk * (1 - L.packed));
        c.fillRect(0, Y(state.bed), px, px);
      }
    }
    // Air over the water, if the vessel is drained down or has air in
    // its top: as dark, its sand above the water dry and paler, the
    // water's level a bright line, drops on the glass above it.
    if (L.level < 0.995) {
      const lv = Y(L.level);
      const sandTop = Math.min(...line);
      c.save();
      c.beginPath();
      c.rect(0, 0, px, lv);
      c.clip();
      // Above the surface seen going back, which shows dry if the
      // water is down to it.
      c.fillStyle = rgba(AIR);
      c.fillRect(0, 0, px, Math.min(lv, top, sandTop));
      // Its surface's band, if above the water, is still there, dry.
      c.beginPath();
      c.moveTo(0, px);
      xs.forEach((x, k) => c.lineTo(x * px, line[k]));
      c.lineTo(px, px);
      c.closePath();
      c.fillStyle = 'rgba(255,244,220,0.18)';
      c.fill();
      for (const d of drops) {
        const y = d.y * lv;
        c.fillStyle = 'rgba(210,225,230,0.18)';
        c.beginPath();
        c.arc(d.x * px, y, d.r, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(240,248,250,0.35)';
        c.fillRect(d.x * px - d.r * 0.4, y - d.r * 0.5, 1, 1);
      }
      c.restore();
      c.fillStyle = 'rgba(190,206,212,0.55)';
      c.fillRect(0, lv - 1, px, 2);
    }
    // The window's edge in shadow, the light falling off toward its rim.
    const rim = c.createRadialGradient(
      px / 2,
      px / 2,
      px * 0.3,
      px / 2,
      px / 2,
      px / 2,
    );
    rim.addColorStop(0, 'rgba(0,0,0,0)');
    rim.addColorStop(1, 'rgba(0,0,0,0.45)');
    c.fillStyle = rim;
    c.fillRect(0, 0, px, px);
    c.restore();
    texture.needsUpdate = true;
  };
  draw();
  return {
    group,
    /**
     * Step the picture `dt` seconds toward what `inputs` ask, and draw it:
     * only when what it shows changes (`glassKey`), or, while its grains
     * swirl or air rises, at most ten times a second (mission 094).
     */
    update(inputs: GlassInputs, dt: number) {
      // Its first sight of its filter's state: as it has looked a while.
      state = settled
        ? stepSightGlass(state, inputs, dt)
        : settledGlass(inputs);
      settled = true;
      since += dt;
      if (glassMoving(state)) {
        time += dt;
        if (since < 0.1) return;
        since = 0;
        drawn = '';
        draw();
        return;
      }
      const key = glassKey(state);
      if (key === drawn) return;
      drawn = key;
      draw();
    },
  };
}

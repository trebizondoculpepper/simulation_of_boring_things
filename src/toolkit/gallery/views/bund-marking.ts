import {
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
} from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createCanvasTexture } from '../../components/core/views/screens';
import { bundMarking } from '../logic/bund-marking';
import type { BundMarking, Rect, Side } from '../logic/bund-marking';
import { createDoseBottle } from '../../components/plant/views/dose-bottle';
import { bottleBund } from '../../../game/plant/dose-bottle';
import { plantTools } from '../../components/plant/views/plant-tools';

/** How far over the floor the paint lies: clear of it, and of other floor paint. */
const PAINT_Y = 0.004;
/** The hazard stripe's pattern: two yellow and two black bands a tile, 45°, this long. */
const TILE = 0.1;

/** The stencil's paint: hypochlorite yellow, acid red, as their bunds' rims. */
const INK = { hypochlorite: '#e3b51f', acid: '#c4231c' } as const;

/** The way the letters' tops face, as a turn about the vertical (north is none). */
const TURN: Record<Side, number> = {
  north: 0,
  south: Math.PI,
  east: -Math.PI / 2,
  west: Math.PI / 2,
};

/**
 * The floor markings round a room's bunded tanks (`logic/bund-marking.ts`;
 * prompt 089, item 3): each stripe a painted 50 mm hazard band, yellow and
 * black at 45°; each stencil the chemical's name in its colour. On the
 * floor at `floorY`, a few millimetres proud of it.
 */
export function createBundMarkings(
  kit: PanelKit,
  markings: readonly BundMarking[],
  floorY = 0,
): Group {
  const group = new Group();
  group.name = 'Bund floor markings';
  if (!markings.length) return group;
  const art = createCanvasTexture(64, 64);
  {
    const c = art.context;
    c.fillStyle = '#e3b51f';
    c.fillRect(0, 0, 64, 64);
    c.strokeStyle = '#161616';
    c.lineWidth = 11.3;
    for (let k = -64; k <= 128; k += 32) {
      c.beginPath();
      c.moveTo(k, 64);
      c.lineTo(k + 64, 0);
      c.stroke();
    }
    art.texture.wrapS = art.texture.wrapT = RepeatWrapping;
    art.texture.needsUpdate = true;
    kit.textures.push(art.texture);
  }
  for (const m of markings) {
    for (const s of m.stripes) {
      const w = s.maxX - s.minX;
      const d = s.maxZ - s.minZ;
      const texture = art.texture.clone();
      texture.repeat.set(w / TILE, d / TILE);
      texture.needsUpdate = true;
      kit.textures.push(texture);
      const paint = new MeshStandardMaterial({
        map: texture,
        roughness: 0.7,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
      kit.materials.push(paint);
      const stripe = new Mesh(new PlaneGeometry(w, d), paint);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(
        (s.minX + s.maxX) / 2,
        floorY + PAINT_Y,
        (s.minZ + s.maxZ) / 2,
      );
      stripe.name = 'Bund hazard stripe';
      group.add(stripe);
    }
    const st = m.stencil;
    if (!st) continue;
    const px = 1024;
    const tall = Math.max(16, Math.round((px * st.h) / st.w));
    const canvas = createCanvasTexture(px, tall);
    {
      const c = canvas.context;
      c.clearRect(0, 0, px, tall);
      c.fillStyle = INK[m.chemical];
      c.font = `bold ${Math.round(tall * 0.9)}px "Stardos Stencil", "Arial Black", sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(st.text, px / 2, tall / 2, px * 0.98);
      canvas.texture.needsUpdate = true;
      kit.textures.push(canvas.texture);
    }
    const ink = new MeshStandardMaterial({
      map: canvas.texture,
      transparent: true,
      alphaTest: 0.3,
      roughness: 0.75,
      polygonOffset: true,
      polygonOffsetFactor: -3,
    });
    kit.materials.push(ink);
    const holder = new Group();
    holder.position.set(st.x, floorY + PAINT_Y + 0.0005, st.z);
    holder.rotation.y = TURN[st.top];
    const letters = new Mesh(new PlaneGeometry(st.w, st.h), ink);
    letters.rotation.x = -Math.PI / 2;
    letters.name = `Stencil: ${st.text}`;
    holder.add(letters);
    group.add(holder);
  }
  return group;
}

/**
 * Dev44's trial of the bund markings (prompt 089, item 3): a 30 l
 * hypochlorite bottle in a corner between two stub walls, its stripe on
 * its two open sides only, and a 60 l acid bottle in the open with a
 * dosing skid hard by its east side, its stripe cut round it; each name
 * stencilled before it. On the floor at y = 0, the exhibit's middle at the
 * origin, its front toward +z; `w` × `d` metres of floor.
 */
export function createBundMarkingDemo(kit: PanelKit, w = 3.2, d = 2.2): Group {
  const group = new Group();
  group.name = 'Bund floor markings trial';
  const t = plantTools(kit);
  const grey = t.paint('#a9aeab', 0.8);
  const floor: Rect = { minX: -w / 2, maxX: w / 2, minZ: -d / 2, maxZ: d / 2 };
  // The corner: a stub of wall along the back and one up the left side.
  const back: Rect = {
    minX: -w / 2,
    maxX: -0.2,
    minZ: -d / 2,
    maxZ: -d / 2 + 0.1,
  };
  const left: Rect = {
    minX: -w / 2,
    maxX: -w / 2 + 0.1,
    minZ: -d / 2,
    maxZ: 0.6,
  };
  for (const r of [back, left])
    t.box(
      group,
      grey,
      r.maxX - r.minX,
      0.9,
      r.maxZ - r.minZ,
      (r.minX + r.maxX) / 2,
      0.45,
      (r.minZ + r.maxZ) / 2,
    );
  // A skid standing by the acid bottle's east side.
  const skid: Rect = { minX: 0.92, maxX: 1.32, minZ: -0.2, maxZ: 0.1 };
  t.box(
    group,
    t.paint('#3b4f63', 0.6),
    skid.maxX - skid.minX,
    0.5,
    skid.maxZ - skid.minZ,
    (skid.minX + skid.maxX) / 2,
    0.25,
    (skid.minZ + skid.maxZ) / 2,
  );
  const bottles = [
    { litres: 30, acid: false, x: 0, z: 0 },
    { litres: 60, acid: true, x: 0.55, z: -0.05 },
  ];
  const hypoHalf = bottleBund(30).side / 2;
  bottles[0].x = -w / 2 + 0.1 + 0.05 + hypoHalf;
  bottles[0].z = -d / 2 + 0.1 + 0.05 + hypoHalf;
  const markings: BundMarking[] = [];
  const bunds = bottles.map((b) => {
    const half = bottleBund(b.litres).side / 2;
    return {
      minX: b.x - half,
      maxX: b.x + half,
      minZ: b.z - half,
      maxZ: b.z + half,
    };
  });
  bottles.forEach((b, i) => {
    const bottle = createDoseBottle(kit, {
      tag: b.acid ? 'DEV-DT2' : 'DEV-DT1',
      product: b.acid ? 'HYDROCHLORIC ACID 10%' : 'SODIUM HYPOCHLORITE 14-15%',
      litres: b.litres,
      acid: b.acid,
    });
    bottle.object.position.set(b.x, 0, b.z);
    group.add(bottle.object);
    const room = floor;
    const others = bunds.filter((_, j) => j !== i);
    markings.push(
      bundMarking(bunds[i], {
        chemical: b.acid ? 'acid' : 'hypochlorite',
        face: 'south',
        room,
        obstacles: [back, left, skid, ...others],
      }),
    );
  });
  group.add(createBundMarkings(kit, markings));
  return group;
}

import {
  CanvasTexture,
  Color,
  MeshStandardMaterial,
  RepeatWrapping,
} from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  MACHINING_ANGLES,
  MACHINING_TONES,
  machining,
  machiningAngle,
} from '../logic/machining';

/**
 * Machined metal for a panel's plates (mission 096; the owner, 2026-10-27:
 * "imagine it's machined metal, each piece machined at a slightly different
 * angle, so there are score marks in the plate … a light or two behind the
 * camera that sometimes catches the sheen"). One small procedural texture
 * of fine score lines, drawn once, used as each plate's roughness and bump
 * map on a metal material, so the lamps' highlights and the environment's
 * reflections break up along the marks, as brushed metal's do. (Three's
 * anisotropic physical material was tried and blew some plates out white
 * at certain angles; the turned roughness and bump maps alone read as
 * machining without it.) Plates come in a few angles
 * and tones (`machining.ts`), each a material sharing the one texture
 * image, so the cost is one upload and a handful of programs.
 */

/** The texture's size, pixels, and how much plate one repeat covers, metres. */
const SIZE = 512;
const TILE = 0.07;

/** The score lines: grey (the roughness) streaks of varied weight, along x. */
function drawScoring(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const c = canvas.getContext('2d')!;
  c.fillStyle = 'rgb(120,120,120)';
  c.fillRect(0, 0, SIZE, SIZE);
  // A steady sequence, so every panel is cut the same.
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 1400; i++) {
    const y = random() * SIZE;
    const shade = 70 + random() * 120;
    c.strokeStyle = `rgba(${shade},${shade},${shade},${0.25 + random() * 0.5})`;
    c.lineWidth = 0.5 + random() * 1.4;
    const x0 = random() * SIZE;
    const run = SIZE * (0.4 + random() * 1.2);
    const tilt = (random() - 0.5) * 1.5;
    // Drawn twice, a tile apart, so the streaks wrap without a seam.
    for (const dx of [-SIZE, 0]) {
      c.beginPath();
      c.moveTo(x0 + dx, y);
      c.lineTo(x0 + dx + run, y + tilt);
      c.stroke();
    }
  }
  return canvas;
}

export interface MachinedMetal {
  /** The material for the plate at (`column`, `row`) of the rack. */
  plate(column: number, row: number): Material;
  /** The bezel: dark anodised, matt, a different finish from the plates. */
  bezel: MeshStandardMaterial;
}

/** The plates' machined finishes, made once per panel and freed with its kit. */
export function createMachinedMetal(kit: PanelKit): MachinedMetal {
  const image = drawScoring();
  const base = new CanvasTexture(image);
  base.wrapS = base.wrapT = RepeatWrapping;
  base.anisotropy = 8;
  kit.textures.push(base);
  const materials: Material[][] = [];
  const tones = ['#c3c7c9', '#babfc1', '#cbcdcc'];
  for (let step = 0; step < MACHINING_ANGLES; step++) {
    const angle = machiningAngle(step);
    // A clone shares the image (one upload), turned to the plate's angle.
    const turned = base.clone();
    turned.repeat.set(1 / TILE, 1 / TILE);
    turned.center.set(0.5, 0.5);
    turned.rotation = angle;
    turned.needsUpdate = true;
    kit.textures.push(turned);
    materials.push(
      Array.from({ length: MACHINING_TONES }, (_, tone) => {
        const material = new MeshStandardMaterial({
          color: new Color(tones[tone % tones.length]),
          metalness: 0.8,
          roughness: 0.55,
          roughnessMap: turned,
          bumpMap: turned,
          bumpScale: 0.35,
          envMapIntensity: 0.55,
        });
        kit.materials.push(material);
        return material;
      }),
    );
  }
  const bezel = new MeshStandardMaterial({
    color: '#2f3336',
    metalness: 0.35,
    roughness: 0.78,
  });
  kit.materials.push(bezel);
  return {
    plate(column, row) {
      const { step, tone } = machining(column, row);
      return materials[step][tone];
    },
    bezel,
  };
}

/**
 * Give a panel's own parts a finish that shows off its lights: metal a
 * little more polished, plastics (caps, lenses, knob skirts) glossier, and
 * everything reflecting the environment more; lettering and printed faces
 * (anything with a map) are left matt, so no glare washes them out.
 */
export function polishParts(
  kit: PanelKit,
  skip: ReadonlySet<Material>,
  /** Only the materials made from this one on (the parts', not the bezel's badges). */
  from = 0,
) {
  for (const material of kit.materials.slice(from)) {
    if (skip.has(material) || !(material instanceof MeshStandardMaterial))
      continue;
    if (material.map) continue;
    if (material.metalness > 0.5)
      material.roughness = Math.min(material.roughness, 0.28);
    else material.roughness = Math.min(material.roughness, 0.4);
    material.envMapIntensity = 1.25;
  }
}

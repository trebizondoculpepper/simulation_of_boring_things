import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
} from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { selector } from '../../../components/core/parts/parts';
import { METRE } from '../../../components/core/logic/units';
import {
  inMetres,
  plainBoardMarkedConcrete,
} from '../../../components/architectural/views/board-marked-concrete';
import { twinkle } from '../../../components/architectural/logic/architectural-lighting';
import { D, H, SIZE, W, booth, live } from './lighting-booth';

/** Tiny, flush fibre ends in a cast-concrete wall, fed by a remote illuminator. */
function concreteFibreWall(kit: PanelKit): LiveExhibit {
  const concrete = plainBoardMarkedConcrete('#aeb3ae');
  kit.materials.push(concrete);
  const wheel = selector(kit, {
    positions: 2,
    initial: 1,
    series: 'xb4',
    name: 'Concrete fibre twinkle wheel',
  });
  const b = booth(kit, 'Fibre-optic concrete wall', {
    back: concrete,
    controls: [{ part: wheel, text: 'TWINKLE' }],
  });
  b.back.geometry.dispose();
  b.back.geometry = inMetres(new BoxGeometry(W, H, 0.1), W, H);

  // A handful of 1.5 mm fibre ends are enlarged on screen just enough to
  // remain visible from the walkway. They sit flush with the wall face.
  const count = 88;
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const strengths = new Float32Array(count);
  let seed = 311;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rand() - 0.5) * (W - 0.28);
    positions[i * 3 + 1] = 0.35 + rand() * (H - 0.65);
    positions[i * 3 + 2] = -D / 2 + 0.105;
    strengths[i] = 0.5 + rand() * 0.5;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  const material = new PointsMaterial({
    size: 0.025 * METRE,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  kit.materials.push(material);
  b.object.add(live(new Points(geometry, material)));
  const warm = new Color('#ffdfa9');
  let time = 0;
  return {
    object: b.object,
    parts: b.parts,
    update(delta) {
      b.step(delta);
      time += delta;
      const level = b.level();
      const turning = wheel.position.value === 1;
      for (let i = 0; i < count; i++) {
        const brightness =
          2.5 * level * strengths[i] * twinkle(i, time, turning);
        colours[i * 3] = warm.r * brightness;
        colours[i * 3 + 1] = warm.g * brightness;
        colours[i * 3 + 2] = warm.b * brightness;
      }
      geometry.attributes.color.needsUpdate = true;
    },
  };
}

export const CONCRETE_FIBRE_WALL: PlantExhibit = {
  title: 'Fibre-optic concrete wall',
  reference:
    'Warm-white fibre ends cast flush into a raw concrete wall; an illuminator and twinkle wheel behind the wall feed them, leaving no visible fitting on the face',
  size: { ...SIZE },
  maker: 'lumenhaus',
  build: concreteFibreWall,
};

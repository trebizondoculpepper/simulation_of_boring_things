import {
  AdditiveBlending,
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
import {
  inMetres,
  plainBoardMarkedConcrete,
} from '../../../components/architectural/views/board-marked-concrete';
import {
  fibreRainbowHue,
  fibreWheelSparkle,
} from '../../../components/architectural/logic/architectural-lighting';
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
  const colourWheel = selector(kit, {
    positions: 2,
    initial: 0,
    series: 'xb4',
    name: 'Concrete fibre white or rainbow selector',
  });
  const b = booth(kit, 'Fibre-optic concrete wall', {
    back: concrete,
    controls: [
      { part: wheel, text: 'TWINKLE' },
      { part: colourWheel, text: 'WHITE/RGB' },
    ],
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
    strengths[i] = 0.75 + rand() * 0.25;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  const material = new PointsMaterial({
    size: 2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  kit.materials.push(material);
  b.object.add(live(new Points(geometry, material)));
  const white = new Color('#fffefa');
  const rainbow = new Color();
  let time = 0;
  return {
    object: b.object,
    parts: b.parts,
    update(delta) {
      b.step(delta);
      time += delta;
      const level = b.level();
      const turning = wheel.position.value === 1;
      const colourful = colourWheel.position.value === 1;
      for (let i = 0; i < count; i++) {
        const brightness =
          (colourful ? 3.2 : 5) *
          level *
          strengths[i] *
          fibreWheelSparkle(i, time, turning);
        const colour = colourful
          ? rainbow.setHSL(fibreRainbowHue(i, time), 1, 0.54)
          : white;
        colours[i * 3] = colour.r * brightness;
        colours[i * 3 + 1] = colour.g * brightness;
        colours[i * 3 + 2] = colour.b * brightness;
      }
      geometry.attributes.color.needsUpdate = true;
    },
  };
}

export const CONCRETE_FIBRE_WALL: PlantExhibit = {
  title: 'Fibre-optic concrete wall',
  reference:
    'Fibre ends cast flush into raw concrete; a bright illuminator with twinkle and white/rainbow selectors feeds them from behind the wall',
  size: { ...SIZE },
  maker: 'lumenhaus',
  build: concreteFibreWall,
};

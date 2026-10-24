import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  PointsMaterial,
} from 'three';
import type { FibreIlluminatorState } from '../../../../game/plant/fibre-illuminator';
import {
  fibreRainbowHue,
  fibreWheelSparkle,
} from '../logic/architectural-lighting';

/** Fibre ends flush with the bare concrete on all four Jacuzzi walls. */
export function createJacuzziFibreWall(
  width: number,
  depth: number,
  tileTop: number,
  roof: number,
) {
  const group = new Group();
  const bands = [
    { span: width, x: 0, z: -depth / 2 + 0.006, yaw: 0 },
    { span: width, x: 0, z: depth / 2 - 0.006, yaw: Math.PI },
    { span: depth, x: -width / 2 + 0.006, z: 0, yaw: Math.PI / 2 },
    { span: depth, x: width / 2 - 0.006, z: 0, yaw: -Math.PI / 2 },
  ];
  const height = roof - tileTop;
  const count = 360;
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const strengths = new Float32Array(count);
  let seed = 311;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
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
  let offset = 0;
  for (let wall = 0; wall < bands.length; wall++) {
    const band = bands[wall];
    const amount = wall < 2 ? 100 : 80;
    for (let j = 0; j < amount; j++) {
      const i = offset + j;
      const across = (rand() - 0.5) * (band.span - 0.5);
      const h = 0.25 + rand() * (height - 0.5);
      // Local +z is the room-facing normal of the north wall.
      positions[i * 3] = band.x + across * Math.cos(band.yaw);
      positions[i * 3 + 1] = tileTop + h;
      positions[i * 3 + 2] = band.z - across * Math.sin(band.yaw);
      strengths[i] = 0.75 + rand() * 0.25;
    }
    offset += amount;
  }
  const points = new Points(geometry, material);
  points.userData.live = true;
  group.add(points);
  const white = new Color('#fffefa');
  const rainbow = new Color();
  return {
    group,
    update(time: number, state: FibreIlluminatorState) {
      for (let i = 0; i < count; i++) {
        const brightness =
          (state.on ? state.brightness : 0) *
          (state.rainbow ? 3.2 : 5) *
          strengths[i] *
          fibreWheelSparkle(
            i,
            time * (state.twinkleSpeed / 5),
            state.twinkleSpeed > 0,
          );
        const colour = state.rainbow
          ? rainbow.setHSL(fibreRainbowHue(i, time), 1, 0.54)
          : white;
        colours[i * 3] = colour.r * brightness;
        colours[i * 3 + 1] = colour.g * brightness;
        colours[i * 3 + 2] = colour.b * brightness;
      }
      geometry.attributes.color.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

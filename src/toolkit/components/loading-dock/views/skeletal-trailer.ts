import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitGlow } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { markComponent } from '../../core/views/component-identity';
import { TRAILER, TWENTY_FOOT, CONTAINER_Z } from '../logic/rig';

/**
 * A tri-axle skeletal container trailer (prompt 097), after the 40 ft
 * UK skeletals that also carry a single 20 ft at the rear: two I-section
 * main beams, a gooseneck at the front over the unit, bolsters across at
 * the container's corners with a twistlock at each, landing legs, side
 * guards, three axles on super-single tyres, mudguards, and a rear
 * under-run bar with its light clusters and number plate. Set decoration.
 *
 * Metres; on the ground under its kingpin, its rear toward −z (`TRAILER`
 * in `rig.ts`). `rearPlate` is where an ADR plate goes on its rear.
 */
export function createSkeletalTrailer(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Skeletal container trailer';
  const steel = t.paint('#2c2f33', 0.55, 0.3);
  const grey = t.paint('#5b5f63', 0.5, 0.4);
  const rubber = t.paint('#141414', 0.9);
  const rim = t.paint('#bfc2c4', 0.35, 0.6);
  const yellow = t.paint('#e4b21c', 0.5);
  const rearZ = -(TRAILER.length - TRAILER.front);
  const deck = TRAILER.deck;

  // ---- The main beams, gooseneck and kingpin -----------------------------
  // The gooseneck over the unit runs at the fifth wheel's height, then
  // the beams step down a little to the container's deck behind it.
  for (const s of [-1, 1]) {
    t.box(
      group,
      steel,
      0.12,
      0.2,
      2.6,
      s * 0.45,
      deck - 0.12,
      TRAILER.front - 1.3,
    );
    t.box(
      group,
      steel,
      0.12,
      0.42,
      -rearZ - 1.3,
      s * 0.45,
      deck - 0.23,
      (rearZ - 1.3) / 2,
    );
  }
  t.box(
    group,
    steel,
    TRAILER.width - 0.2,
    0.2,
    0.15,
    0,
    deck - 0.12,
    TRAILER.front - 0.08,
  );
  // The kingpin's plate under the gooseneck, and the pin.
  t.box(group, grey, 1.1, 0.03, 1.1, 0, deck - 0.235, 0);
  t.cyl(group, grey, 0.045, 0.08, 0, deck - 0.29, 0, 'y', 12);
  // Cross members along the beams.
  for (let z = -1; z > rearZ + 0.3; z -= 1.6)
    t.box(group, steel, 0.9, 0.12, 0.08, 0, deck - 0.3, z);

  // ---- The bolsters and twistlocks ----------------------------------------
  // Full-width bolsters at the 20 ft's corners (and the front ones a 40 ft
  // would use), each end a casting with its twistlock's handle.
  const ends = [
    CONTAINER_Z + TWENTY_FOOT.l / 2,
    CONTAINER_Z - TWENTY_FOOT.l / 2 + 0.08,
  ];
  const bolsters = [TRAILER.front - 0.15, ...ends];
  for (const z of bolsters) {
    t.box(group, steel, TWENTY_FOOT.w, 0.16, 0.18, 0, deck - 0.08, z);
    for (const s of [-1, 1]) {
      t.box(
        group,
        grey,
        0.16,
        0.06,
        0.16,
        s * (TWENTY_FOOT.w / 2 - 0.09),
        deck - 0.0,
        z,
      );
      t.box(
        group,
        yellow,
        0.02,
        0.02,
        0.12,
        s * (TWENTY_FOOT.w / 2 + 0.01),
        deck - 0.1,
        z,
      );
    }
  }

  // ---- The landing legs ---------------------------------------------------
  for (const s of [-1, 1]) {
    t.box(
      group,
      grey,
      0.14,
      deck - 0.45,
      0.14,
      s * 0.95,
      (deck - 0.45) / 2 + 0.2,
      -TRAILER.legs,
    );
    t.box(group, steel, 0.3, 0.04, 0.3, s * 0.95, 0.02, -TRAILER.legs);
    t.box(group, steel, 0.5, 0.1, 0.1, s * 0.7, deck - 0.4, -TRAILER.legs);
  }
  // The crank handle, nearside.
  t.box(group, grey, 0.3, 0.03, 0.03, -1.15, 0.95, -TRAILER.legs);

  // ---- The axles, wheels and mudguards ------------------------------------
  for (const a of TRAILER.axles) {
    const z = -a;
    t.cyl(
      group,
      steel,
      0.07,
      TRAILER.width - 0.5,
      0,
      TRAILER.tyre.r,
      z,
      'x',
      10,
    );
    for (const s of [-1, 1]) {
      const x = s * (TRAILER.width / 2 - TRAILER.tyre.w / 2);
      t.cyl(
        group,
        rubber,
        TRAILER.tyre.r,
        TRAILER.tyre.w,
        x,
        TRAILER.tyre.r,
        z,
        'x',
        28,
      );
      t.cyl(
        group,
        rim,
        0.29,
        0.02,
        x + s * (TRAILER.tyre.w / 2),
        TRAILER.tyre.r,
        z,
        'x',
        20,
      );
    }
  }
  const first = -TRAILER.axles[0] + 0.7;
  const last = -TRAILER.axles[2] - 0.7;
  for (const s of [-1, 1]) {
    t.box(
      group,
      steel,
      0.42,
      0.02,
      first - last,
      s * (TRAILER.width / 2 - 0.19),
      TRAILER.tyre.r * 2 + 0.06,
      (first + last) / 2,
    );
    // Spray suppression flaps behind the last axle.
    t.box(
      group,
      t.paint('#111111', 0.9),
      0.42,
      0.45,
      0.01,
      s * (TRAILER.width / 2 - 0.19),
      0.55,
      last,
    );
  }

  // ---- Side guards, between the landing legs and the first axle ---------
  for (const s of [-1, 1])
    for (const y of [0.55, 0.85])
      t.box(
        group,
        grey,
        0.04,
        0.08,
        -TRAILER.legs - first - 0.4,
        s * (TRAILER.width / 2 - 0.05),
        y,
        (-TRAILER.legs + first) / 2,
      );

  // ---- The rear: under-run bar, lights, plate, markers --------------------
  t.box(group, grey, TRAILER.width - 0.2, 0.12, 0.12, 0, 0.5, rearZ + 0.1);
  for (const s of [-1, 1]) {
    t.box(
      group,
      steel,
      0.08,
      deck - 0.6,
      0.08,
      s * 0.45,
      (deck + 0.5) / 2 - 0.05,
      rearZ + 0.15,
    );
    // The light cluster: tail and brake, indicator, reversing, fog.
    t.box(
      group,
      t.paint('#202020', 0.6),
      0.5,
      0.16,
      0.06,
      s * 0.85,
      0.72,
      rearZ + 0.05,
    );
    const lens = kitGlow(kit, '#b0140f');
    lens.color.multiplyScalar(0.45);
    t.box(group, lens, 0.2, 0.12, 0.01, s * 0.95, 0.72, rearZ + 0.015);
    t.box(
      group,
      kitGlow(kit, '#6a4505'),
      0.1,
      0.12,
      0.01,
      s * 0.77,
      0.72,
      rearZ + 0.015,
    );
  }
  // Red and yellow chevron marker boards on the bar, as the UK requires.
  const markers = t.printed(
    1.6,
    0.14,
    (c, cw, ch) => {
      c.fillStyle = '#e8c21a';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#c3221c';
      for (let x = -ch; x < cw + ch; x += ch * 1.4) {
        c.beginPath();
        c.moveTo(x, ch);
        c.lineTo(x + ch * 0.7, 0);
        c.lineTo(x + ch * 1.4, 0);
        c.lineTo(x + ch * 0.7, ch);
        c.closePath();
        c.fill();
      }
    },
    512,
  );
  markers.mesh.position.set(0, 0.5, rearZ + 0.035);
  markers.mesh.rotation.y = Math.PI;
  group.add(markers.mesh);
  const plate = t.printed(0.52, 0.11, (c, cw, ch) => {
    c.fillStyle = '#f2c51e';
    c.fillRect(0, 0, cw, ch);
    c.fillStyle = '#111';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${ch * 0.7}px "Helvetica Neue", Arial, sans-serif`;
    c.fillText('HM07 DLV', cw / 2, ch / 2 + 2, cw * 0.9);
  });
  plate.mesh.position.set(0, 0.74, rearZ + 0.012);
  plate.mesh.rotation.y = Math.PI;
  group.add(plate.mesh);

  return {
    group: markComponent(group, {
      name: 'Skeletal container trailer',
      decorative: true,
    }),
    /** Where a container's bottom corners sit, and its middle along the trailer. */
    seat: { y: deck + 0.03, z: CONTAINER_Z },
    /** The rear's ADR plate place, above the light clusters, facing −z. */
    rearPlate: { y: 0.98, z: rearZ + 0.01 },
  };
}

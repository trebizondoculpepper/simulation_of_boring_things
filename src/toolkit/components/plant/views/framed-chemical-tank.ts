import { CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { brandLivery } from '../../core/views/brand-livery';
import { drawBrandMark, wordmarkFont } from '../../core/views/brand-logo';
import { plantTools } from './plant-tools';
import { createChemicalLabel } from './chemicals-signs';
import {
  createLevelIndicator,
  createLevelTransmitter,
} from './level-instruments';
import {
  createChemicalBallValve,
  markChemicalValve,
} from './chemical-ball-valve';
import type { BoundChemicalValve } from './chemical-ball-valve';
import { createPartSet } from '../../core/parts/parts';

/**
 * A bulk chemical tank in its galvanised frame (the owner, 2026-10-26: the
 * framed rectangular tank looked the part). After DENIOS's rectangular PE
 * chemical tanks, 2,070 × 720 × 1,690 mm at 2,000 L: a thick, opaque black
 * HDPE body, rectangular, braced by a galvanised steel lattice (corner
 * posts, bands and straps) on a skid base; a DN400 filling dome and 2"
 * screwed sockets on its top; a flanged outlet near its foot. Scaled here
 * to 4,000 L, about 2.3 × 1.15 × 1.75 m, and sold by Chlorella.
 *
 * Its instruments, each real: a non-contact level transmitter in one top
 * socket (ultrasonic over hypochlorite; 80 GHz radar over acid, whose
 * fumes upset ultrasound), wired through a cable gland to a junction box
 * on the frame, and a loop-powered local display at eye height showing the
 * contents; an independent high-level float switch in another socket; the
 * vent's gooseneck (through a carbon scrubber pot on the acid's). No sight
 * glass: a breakable tube below the liquid line is a leak waiting to
 * happen on a tank of acid.
 *
 * Metres, its middle at the origin, the floor at y = 0, its front (the
 * display and outlet) toward +z.
 */
export function createFramedChemicalTank(
  kit: PanelKit,
  {
    tag,
    product,
    litres,
    acid,
    size = { L: 2.3, W: 1.15, H: 1.75 },
    floatGauge = false,
    fillLine = true,
    outletSide = -1,
    valves: bound = {},
  }: {
    tag: string;
    product: string;
    litres: number;
    acid: boolean;
    /** Its body, metres: the bulk tank's by default; smaller for a day tank. */
    size?: { L: number; W: number; H: number };
    /** A mechanical float indicator through its lid, as small tanks carry. */
    floatGauge?: boolean;
    /** Its fill line down the front to a valve: off where a riser comes in from above. */
    fillLine?: boolean;
    /** Which way its draw-off turns from the outlet: −1 left, 1 right. */
    outletSide?: -1 | 1;
    /** Its fill and outlet valves' fittings in its room's model, and the world's state they show (plan 085). */
    valves?: { fill?: BoundChemicalValve; outlet?: BoundChemicalValve };
  },
) {
  const group = new Group();
  const t = plantTools(kit);
  const f = tools(kit);
  const { L, W, H } = size;
  /** Its fittings' and plates' scale beside the bulk tank's. */
  const k = Math.min(1, Math.max(0.55, H / 1.75));
  const base = 0.12;
  const top = base + H;
  const hdpe = t.paint('#1c1e1f', 0.78);
  const galv = t.paint('#a9afaf', 0.38, 0.75);
  const dark = t.paint('#2a2f31', 0.6);
  const pvc = t.paint('#5a5f63', 0.55);
  const valves = createPartSet();

  // The body: thick moulded HDPE, its edges well rounded, a shallow
  // moulded rib round it under each steel band.
  const bodyGeo = new RoundedBoxGeometry(L, H, W, 4, 0.09);
  const body = new Mesh(bodyGeo, hdpe);
  body.position.set(0, base + H / 2, 0);
  group.add(body);

  // The frame: a skid of channel, corner posts of angle, three bands
  // round it and vertical straps across each face, the lattice bolted
  // where they cross; lifting eyes at the top corners.
  const g = 0.035;
  const hx = L / 2 + g / 2;
  const hz = W / 2 + g / 2;
  for (const z of [-hz, hz])
    t.box(group, galv, L + 2 * g, 0.1, 0.06, 0, 0.05, z);
  for (const x of [-L / 2 + 0.2, 0, L / 2 - 0.2])
    t.box(group, galv, 0.06, 0.08, W + 2 * g, x, 0.04, 0);
  for (const x of [-hx, hx])
    for (const z of [-hz, hz]) {
      t.box(group, galv, g, H + 0.06, g, x, base + H / 2, z);
      t.box(group, galv, 0.08, 0.008, 0.08, x, 0.1, z);
    }
  const bands = [base + 0.25, base + H * 0.55, top - 0.08];
  for (const y of bands) {
    for (const z of [-hz, hz])
      t.box(group, galv, L + 2 * g, 0.05, 0.012, 0, y, z);
    for (const x of [-hx, hx])
      t.box(group, galv, 0.012, 0.05, W + 2 * g, x, y, 0);
  }
  const straps = [-L / 4, L / 4];
  for (const x of straps)
    for (const z of [-hz, hz]) {
      t.box(group, galv, 0.05, H, 0.012, x, base + H / 2, z);
      for (const y of bands)
        t.cyl(group, galv, 0.011, 0.02, x, y, z + Math.sign(z) * 0.012, 'z', 6);
    }
  for (const z of [-hz, hz])
    t.box(group, galv, 0.05, H, 0.012, 0, base + H / 2, z);
  for (const x of [-hx, hx]) {
    t.box(group, galv, 0.012, H, 0.05, x, base + H / 2, 0);
    for (const z of [-hz, hz]) {
      const eye = t.cyl(
        group,
        galv,
        0.04,
        0.012,
        x * 0.98,
        top + 0.03,
        z * 0.95,
        'x',
        12,
      );
      eye.scale.set(1, 1, 1);
    }
  }

  // The top: the DN400 filling dome, its screw lid ribbed for a grip;
  // the 2" sockets each with its union nut.
  const domeX = -L / 4;
  const domeR = Math.min(0.24 * k, Math.min(L, W) * 0.28);
  t.cyl(group, hdpe, domeR, 0.07, domeX, top + 0.035, 0, 'y', 36);
  t.cyl(group, dark, domeR - 0.005, 0.05, domeX, top + 0.095, 0, 'y', 36);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    t.box(
      group,
      dark,
      0.03,
      0.04,
      0.012,
      domeX + Math.cos(a) * (domeR - 0.005),
      top + 0.095,
      Math.sin(a) * (domeR - 0.005),
    ).rotation.y = -a;
  }
  f.label(
    group,
    domeR >= 0.2
      ? 'DN400'
      : domeR >= 0.14
        ? 'DN300'
        : domeR >= 0.09
          ? 'DN200'
          : 'DN150',
    domeX,
    top + 0.121,
    0,
    0.03,
    '#d0d0d0',
  ).rotation.x = -Math.PI / 2;
  const socket = (x: number, z: number) => {
    t.cyl(group, hdpe, 0.06, 0.05, x, top + 0.025, z, 'y', 16);
    const nut = t.cyl(group, pvc, 0.05, 0.04, x, top + 0.07, z, 'y', 6);
    return nut;
  };
  // The fill: in at the top, its line down the front to the inlet
  // valve, where the delivery main from the fill point joins
  // (`fillAt`).
  const fillX = L / 2 - 0.3;
  const fillZ = W / 2 + 0.2;
  if (fillLine) {
    socket(fillX, -0.25);
    t.pipe(group, 50, [
      [fillX, top + 0.09, -0.25],
      [fillX, top + 0.25, -0.25],
      [fillX, top + 0.25, fillZ],
      [fillX, 0.45, fillZ],
    ]);
    const fill = createChemicalBallValve(kit, {
      dn: 40,
      name: bound.fill
        ? `${bound.fill.tag} · ${bound.fill.name}`
        : `${tag}-V1 fill valve`,
      ...(bound.fill?.binding ? { binding: bound.fill.binding } : {}),
    });
    markChemicalValve(fill.object, bound.fill);
    fill.object.rotation.z = Math.PI / 2;
    fill.object.position.set(fillX, 0.95, fillZ);
    group.add(fill.object);
    valves.add(fill);
  }
  // The vent: a gooseneck, its mesh to the room; on the acid's (10%, the
  // owner, 2026-10-26: little fume at that strength), through a small
  // activated-carbon vent filter first.
  const ventX = L / 2 - 0.3;
  socket(ventX, 0.25);
  if (acid) {
    t.rod(
      group,
      pvc,
      [ventX, top + 0.09, 0.25],
      [ventX, top + 0.2, 0.25],
      0.03,
      12,
    );
    t.cyl(
      group,
      t.paint('#3b6a4a', 0.6),
      0.08,
      0.38,
      ventX,
      top + 0.39,
      0.25,
      'y',
      24,
    );
    t.cyl(group, dark, 0.085, 0.04, ventX, top + 0.6, 0.25, 'y', 24);
    t.rod(
      group,
      pvc,
      [ventX, top + 0.62, 0.25],
      [ventX, top + 0.72, 0.25],
      0.025,
      12,
    );
  } else {
    t.rod(
      group,
      pvc,
      [ventX, top + 0.09, 0.25],
      [ventX, top + 0.4, 0.25],
      0.03,
      12,
    );
  }
  t.rod(
    group,
    pvc,
    [ventX, acid ? top + 0.72 : top + 0.4, 0.25],
    [ventX + 0.12, (acid ? top + 0.72 : top + 0.4) + 0.08, 0.25],
    0.03,
    12,
  );
  t.rod(
    group,
    pvc,
    [ventX + 0.12, (acid ? top + 0.72 : top + 0.4) + 0.08, 0.25],
    [ventX + 0.2, (acid ? top + 0.72 : top + 0.4) - 0.05, 0.25],
    0.03,
    12,
  );

  // The level transmitter in its socket: ultrasonic, a squat white head
  // over a wide transducer face (after Siemens' Probe LU); or 80 GHz
  // radar, a compact grey barrel with a PTFE lens (after VEGAPULS C 21).
  const lt = createLevelTransmitter(kit, acid);
  lt.position.set(L / 8, top, 0);
  group.add(lt);
  socket(L / 8, 0).visible = false;
  // Its cable gland, and the cable over to the junction box on the post.
  const jbX = L / 2 + 0.11;
  const jbY = Math.min(1.55, top - 0.15);
  const jbZ = W / 2 - 0.05;
  t.rod(
    group,
    dark,
    [L / 8 + 0.07, top + 0.17, 0],
    [jbX - 0.05, top + 0.17, 0],
    0.006,
    6,
  );
  t.rod(
    group,
    dark,
    [jbX - 0.05, top + 0.17, 0],
    [jbX - 0.05, top + 0.17, jbZ],
    0.006,
    6,
  );
  t.rod(
    group,
    dark,
    [jbX - 0.05, top + 0.17, jbZ],
    [jbX - 0.05, jbY + 0.1, jbZ],
    0.006,
    6,
  );

  // The high-level switch: a float switch in its own socket, its own gland
  // and cable; it trips the delivery whatever the transmitter says.
  const lsX = -L / 2 + 0.3;
  socket(lsX, 0.25);
  t.cyl(
    group,
    t.paint('#d4a017', 0.5),
    0.03,
    0.06,
    lsX,
    top + 0.12,
    0.25,
    'y',
    12,
  );
  t.cyl(group, dark, 0.012, 0.035, lsX, top + 0.165, 0.25, 'y', 8);
  t.rod(
    group,
    dark,
    [lsX, top + 0.18, 0.25],
    [lsX, top + 0.22, W / 2 + 0.06],
    0.006,
    6,
  );
  t.rod(
    group,
    dark,
    [lsX, top + 0.22, W / 2 + 0.06],
    [jbX - 0.05, top + 0.22, W / 2 + 0.06],
    0.006,
    6,
  );

  // The junction box on the right front post: grey GRP, four glands under
  // it, the field cables in and the multicore out to the store's panel.
  const jb = new Group();
  jb.position.set(jbX, jbY, jbZ);
  group.add(jb);
  t.box(jb, t.paint('#9aa09e', 0.6), 0.16, 0.2, 0.09, 0, 0, 0);
  t.box(jb, t.paint('#8a908e', 0.6), 0.165, 0.205, 0.01, 0, 0, 0.048);
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const)
    t.cyl(jb, galv, 0.006, 0.005, sx * 0.065, sy * 0.085, 0.054, 'z', 6);
  for (const gx of [-0.05, -0.017, 0.017, 0.05]) {
    t.cyl(jb, dark, 0.011, 0.025, gx, -0.112, 0, 'y', 8);
    t.cyl(jb, dark, 0.008, 0.012, gx, -0.13, 0, 'y', 6);
  }
  t.rod(jb, dark, [0.05, -0.135, 0], [0.05, -jbY + 0.3, 0], 0.009, 8);
  f.label(jb, `${tag}-JB`, 0, 0.06, 0.054, 0.016, '#1b1b1b', '#f4f3ee');

  // The local display: a loop-powered field indicator, after the
  // Kessler-Moody ones, on a bracket at eye height: five red digits of
  // litres, a bar of the contents, and its own gland underneath.
  const indicator = createLevelIndicator(kit, { tag, litres });
  indicator.object.position.set(
    Math.min(0.3, L / 2 - 0.15),
    Math.min(1.55, top - 0.12),
    W / 2 + 0.07,
  );
  group.add(indicator.object);

  // The outlet: the steel flange near the foot, a PVC-U union ball valve,
  // its red lever, and the draw-off on to the transfer pumps.
  const outX = -L / 2 + Math.min(0.45, L * 0.3);
  const outY = base + 0.18;
  t.cyl(group, galv, 0.1, 0.02, outX, outY, W / 2 + 0.01, 'z', 24);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    t.cyl(
      group,
      galv,
      0.009,
      0.02,
      outX + Math.cos(a) * 0.08,
      outY + Math.sin(a) * 0.08,
      W / 2 + 0.025,
      'z',
      6,
    );
  }
  t.rod(
    group,
    pvc,
    [outX, outY, W / 2 + 0.02],
    [outX, outY, W / 2 + 0.12],
    0.03,
    12,
  );
  const outlet = createChemicalBallValve(kit, {
    dn: 40,
    name: bound.outlet
      ? `${bound.outlet.tag} · ${bound.outlet.name}`
      : `${tag}-V2 outlet valve`,
    ...(bound.outlet?.binding ? { binding: bound.outlet.binding } : {}),
  });
  markChemicalValve(outlet.object, bound.outlet);
  outlet.object.rotation.y = Math.PI / 2;
  outlet.object.position.set(outX, outY, W / 2 + 0.17);
  group.add(outlet.object);
  valves.add(outlet);
  t.rod(
    group,
    pvc,
    [outX, outY, W / 2 + 0.25],
    [outX, outY, W / 2 + 0.38],
    0.03,
    12,
  );
  t.rod(
    group,
    pvc,
    [outX, outY, W / 2 + 0.38],
    [outX + outletSide * 0.4, outY, W / 2 + 0.38],
    0.03,
    12,
  );

  // Its plates: Chlorella's maker's plate on the front band; the product
  // label, CLP pictograms and all, on the front face; its tag on the end.
  const brand = brandLivery(kit, 'chlorella');
  const plate = f.printed(
    0.5 * k,
    0.16 * k,
    (c, w, h) => {
      c.fillStyle = brand.palette.main;
      c.fillRect(0, 0, w, h);
      drawBrandMark(c, brand.brand, 34, h / 2, 22);
      c.fillStyle = brand.palette.onMain;
      c.font = wordmarkFont(brand.brand, 34);
      c.textBaseline = 'middle';
      c.fillText(brand.brand.wordmark ?? brand.brand.name, 64, h / 2 - 10);
      c.font = '15px sans-serif';
      c.fillText(
        `HDPE · GALV FRAME · ${litres.toLocaleString('en-GB')} L · SG 1.3 MAX`,
        64,
        h / 2 + 22,
      );
    },
    512,
  );
  plate.mesh.position.set(-L / 8 - 0.1 * k, bands[1] + 0.13 * k, W / 2 + 0.03);
  group.add(plate.mesh);
  const hazard = createChemicalLabel(t, 0.5 * k, 0.36 * k, product, acid);
  hazard.position.set(-L / 8 - 0.1 * k, bands[1] - 0.22 * k, W / 2 + 0.003);
  group.add(hazard);
  f.label(
    group,
    tag,
    L / 2 + 0.003,
    bands[1] + 0.12 * k,
    0,
    0.07 * k,
    '#ffffff',
    '#2a2f31',
  ).rotation.y = Math.PI / 2;

  // The float indicator: a clear tube up through the lid, a red rod in it
  // riding on the float, a scale beside it, full at its top.
  let rod: Mesh | null = null;
  const travel = 0.3;
  if (floatGauge) {
    const gx = -L / 2 + 0.15;
    socket(gx, 0.2);
    const tube = new Mesh(
      new CylinderGeometry(0.022, 0.022, travel + 0.06, 16, 1, true),
      new MeshStandardMaterial({
        color: '#dfe8ea',
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    kit.materials.push(tube.material as MeshStandardMaterial);
    tube.position.set(gx, top + 0.1 + (travel + 0.06) / 2, 0.2);
    group.add(tube);
    t.cyl(group, dark, 0.026, 0.02, gx, top + 0.16 + travel, 0.2, 'y', 16);
    rod = t.cyl(
      group,
      t.paint('#d8261f', 0.4),
      0.012,
      1,
      gx,
      top,
      0.2,
      'y',
      10,
    );
    rod.userData.live = true;
    const sc = f.printed(
      0.05,
      travel,
      (c, w, h) => {
        c.fillStyle = '#f4f3ee';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#1b1b1b';
        c.font = 'bold 18px sans-serif';
        for (let p = 0; p <= 4; p++) {
          const y = h - (p / 4) * (h - 10) - 5;
          c.fillRect(0, y - 1, 18, 3);
          c.fillText(['E', '¼', '½', '¾', 'F'][p], 24, y + 7);
        }
      },
      64,
    );
    sc.mesh.position.set(gx + 0.05, top + 0.13 + travel / 2, 0.2);
    group.add(sc.mesh);
  }
  const setRod = (v: number) => {
    if (!rod) return;
    const h = 0.12 + v * travel;
    rod.scale.y = h;
    rod.position.y = top + h / 2;
  };
  setRod(0);

  return {
    object: group,
    /** Where its fill line ends at its inlet valve, for the delivery main. */
    fillAt: [fillX, 0.45, fillZ] as const,
    /** Its fill and outlet valves, which turn. */
    parts: valves,
    /** Its contents, a fraction of full, as its transmitter reads them. */
    setLevel(fraction: number) {
      const v = Math.max(0, Math.min(1, fraction));
      setRod(v);
      indicator.set(v);
    },
  };
}

/** The footprint a framed tank stands on, for its bund and spacing. */
export const FRAMED_TANK = { L: 2.3, W: 1.15, H: 1.75 } as const;

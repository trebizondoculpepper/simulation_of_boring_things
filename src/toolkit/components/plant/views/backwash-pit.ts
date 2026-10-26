import { createBrandBand } from '../../core/views/brand-badge';
import { partAudio } from '../../core/audio/part-audio';
import { pumpSound } from './pump-sound';
import { BOOSTER_PUMP } from '../logic/pump-sound';
import { markComponent } from '../../core/views/component-identity';
import {
  Group,
  Object3D,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { FINISH, plantTools } from './plant-tools';
import { createGratingDeck } from './railings';
import { createUltrasonicLevel } from './ultrasonic-level';
import { createStaffGauge } from './staff-gauge';
import { createTankLadder } from './tank-ladder';
import { createCanvasTexture } from '../../core/views/screens';
import { createLifebuoy } from '../../general-safety/views/lifebuoy';
import { createSafetySign } from '../../general-safety/views/safety-signs';
import { slabAround } from '../../../gallery/logic/slab-openings';

/**
 * Its guard rail (the owner, 2026-10-26): this far outside its walls'
 * outer face, and its gate, along its north side from its middle, this
 * wide; the davit outside it on the east.
 */
export const PIT_RAIL = {
  off: 0.15,
  /**
   * Its gate on its east side, beside the hatch (the owner, 2026-10-26),
   * along that side from the pit's middle (+z south), this wide.
   */
  gate: { at: 0.5, width: 1.0 },
} as const;

/** A float switch, as the pit hangs it: its name, its height above the pit's floor, and its colour. */
export interface PitFloatSpec {
  name: string;
  height: number;
  colour: string;
}

export interface BackwashPitSpec {
  /** Its inside, metres: length along x, width along z, depth floor to slab. */
  length: number;
  width: number;
  depth: number;
  /** Its top water level above its floor. */
  topWater: number;
  /** Its walls' thickness. */
  wall: number;
  /** Its settlement sump, in its floor under its pump. */
  sump: { length: number; width: number; depth: number };
  /** The hatch over its sump, square. */
  hatch: number;
  /** Its float switches, deepest first. */
  floats: readonly PitFloatSpec[];
}

/**
 * The wet hall's backwash pit (prompt 036; the owner, 2026-10-26): a
 * sealed cast concrete pit below the floor, serviced from above only. Its
 * board-marked walls and floor, the settlement sump in its floor's east
 * corner under its submersible pump; its opening covered by galvanised
 * gratings flush with the floor, walked over and seen through, with a
 * solid hatch over the sump (CONFINED SPACE, entry by permit only) and
 * beside it the pump's davit for lifting it out on its chain. Under the
 * gratings, a staff gauge on its north wall and the ultrasonic level
 * transmitter on its bracket, looking down at the water, which stands at
 * the world's level. Its own frame: the hall's floor at y = 0, its middle
 * on its axis, x along its length, +z south.
 */
/**
 * Where its pump station's discharge leaves it (the owner, 2026-10-26), in
 * its own frame: its risers rise through the gratings this far west of
 * the hatch, join in a header this high over the floor, and its outlet
 * stands at `y`, facing up, for the sewer's line.
 */
export const PIT_DISCHARGE = {
  x: (length: number, hatch: number) => length / 2 - hatch - 0.2,
  headerY: 0.35,
  y: 0.5,
} as const;

export function createBackwashPit(kit: PanelKit, p: BackwashPitSpec) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Backwash pit';
  const concrete = t.paint('#9a9890', 0.95);
  const dark = t.paint('#6f6d66', 0.95);
  const L = p.length;
  const W = p.width;
  const D = p.depth;
  const w = p.wall;
  // Its walls, down from the underside of the hall's slab (0.1 m thick):
  // their tops under it, not in its face, which flickered.
  const slab = 0.1;
  const wallH = D - slab;
  for (const side of [-1, 1]) {
    t.box(
      group,
      concrete,
      L + 2 * w,
      wallH,
      w,
      0,
      -slab - wallH / 2,
      side * (W / 2 + w / 2),
    );
    t.box(
      group,
      concrete,
      w,
      wallH,
      W,
      side * (L / 2 + w / 2),
      -slab - wallH / 2,
      0,
    );
  }
  // The slab's edge round the opening, its cut face lining the pit's top.
  for (const side of [-1, 1]) {
    t.box(
      group,
      concrete,
      L,
      slab,
      0.002,
      0,
      -slab / 2,
      side * (W / 2 - 0.001),
    );
    t.box(
      group,
      concrete,
      0.002,
      slab,
      W,
      side * (L / 2 - 0.001),
      -slab / 2,
      0,
    );
  }
  // Its floor, round its sump in the south-east corner.
  const sump = {
    minX: L / 2 - p.sump.length,
    maxX: L / 2,
    minZ: W / 2 - p.sump.width,
    maxZ: W / 2,
  };
  for (const r of slabAround(L, W, [sump]))
    t.box(
      group,
      dark,
      r.maxX - r.minX,
      0.3,
      r.maxZ - r.minZ,
      (r.minX + r.maxX) / 2,
      -D - 0.15,
      (r.minZ + r.maxZ) / 2,
    );
  const sd = p.sump.depth;
  const sx = (sump.minX + sump.maxX) / 2;
  const sz = (sump.minZ + sump.maxZ) / 2;
  t.box(group, dark, p.sump.length, 0.3, p.sump.width, sx, -D - sd - 0.15, sz);
  t.box(group, dark, 0.2, sd, p.sump.width, sump.minX - 0.1, -D - sd / 2, sz);
  t.box(group, dark, p.sump.length, sd, 0.2, sx, -D - sd / 2, sump.minZ - 0.1);
  // Its water: dirty backwash, murky brown-green, at the world's level.
  const waterMaterial = new MeshStandardMaterial({
    color: '#5c5a3c',
    roughness: 0.35,
    transparent: true,
    opacity: 0.85,
  });
  kit.materials.push(waterMaterial);
  const water = new Mesh(new PlaneGeometry(L, W), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.name = 'Backwash in the pit';
  group.add(water);
  // Its staff gauge on its north wall, its zero at its floor.
  const gauge = createStaffGauge(kit, Math.ceil(D));
  gauge.position.set(-L / 2 + 0.6, -D, -W / 2 + 0.01);
  group.add(gauge);
  // The gratings over its opening, flush with the floor; a solid hatch
  // over its sump, and its kerb round them.
  const hatch = { length: p.hatch, width: p.hatch };
  const hatchArea = {
    minX: L / 2 - hatch.length,
    maxX: L / 2,
    minZ: W / 2 - hatch.width,
    maxZ: W / 2,
  };
  for (const r of slabAround(L, W, [hatchArea])) {
    const deck = createGratingDeck(kit, r.maxX - r.minX, r.maxZ - r.minZ);
    deck.position.set((r.minX + r.maxX) / 2, -0.005, (r.minZ + r.maxZ) / 2);
    group.add(deck);
  }
  const steel = t.paint('#8d9392', 0.45, 0.6);
  // Its hatch lid, hinged along its outer (south) edge, by the pit's wall,
  // lifting open toward it (the owner, 2026-10-26); its handle inboard.
  const lid = new Group();
  lid.name = 'Backwash pit hatch';
  lid.position.set((hatchArea.minX + hatchArea.maxX) / 2, 0, hatchArea.maxZ);
  group.add(lid);
  // Painted chequer plate: raised lozenges in a herringbone, as a
  // galvanised tread-plate hatch is (the owner, 2026-10-26).
  const tread = createCanvasTexture(128, 128);
  {
    const c = tread.context;
    c.fillStyle = '#d4b21e';
    c.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const cx = i * 32 + 16;
        const cy = j * 32 + 16;
        const turn = (i + j) % 2 ? Math.PI / 4 : -Math.PI / 4;
        c.save();
        c.translate(cx, cy);
        c.rotate(turn);
        c.fillStyle = '#9c8212';
        c.fillRect(-11, -2.5, 22, 5);
        c.fillStyle = '#f0d24a';
        c.fillRect(-11, -2.5, 22, 2);
        c.restore();
      }
    tread.texture.wrapS = tread.texture.wrapT = RepeatWrapping;
    tread.texture.repeat.set(hatch.length / 0.12, hatch.width / 0.12);
    tread.texture.needsUpdate = true;
    kit.textures.push(tread.texture);
  }
  const treadPaint = new MeshStandardMaterial({
    map: tread.texture,
    roughness: 0.55,
    metalness: 0.3,
  });
  kit.materials.push(treadPaint);
  const lidPlate = t.box(
    lid,
    treadPaint,
    hatch.length,
    0.02,
    hatch.width,
    0,
    -0.01,
    -hatch.width / 2,
  );
  const handle = t.box(
    lid,
    t.paint('#2b2e2f', 0.6),
    0.2,
    0.02,
    0.03,
    0,
    0.01,
    -hatch.width + 0.08,
  );
  const sign = createSafetySign(
    kit,
    ['confined'],
    ['DANGER', 'Confined space', 'Entry by permit only'],
  );
  sign.rotation.x = -Math.PI / 2;
  sign.scale.setScalar(0.8);
  sign.position.set(0, 0.003, -hatch.width / 2);
  lid.add(sign);
  // Its steel angle frame round the opening, standing 10 mm proud of the
  // floor, not flush with it (flush, it flickered against the slab).
  for (const side of [-1, 1]) {
    t.box(group, steel, L + 0.1, 0.03, 0.05, 0, -0.005, side * (W / 2 + 0.025));
    t.box(group, steel, 0.05, 0.03, W, side * (L / 2 + 0.025), -0.005, 0);
  }
  // A guard rail round the whole pit (the owner, 2026-10-26): a pit of
  // dirty water is hard to get out of, and its covering could fail, so no
  // one walks on it. Yellow, just outside its frame, a top rail at 1.1 m,
  // a knee rail at 0.5 m and a toe board; in its north side, toward the
  // aisle, a self-closing gate for its maintenance, shut.
  const rail = PIT_RAIL;
  const leaf = new Group();
  leaf.name = 'Backwash pit gate';
  // What bars the walker, in its own frame: its rail's sides (its gate's
  // gap apart), its davit's foot.
  const fixedSolids: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }[] = [];
  const gateGap = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  {
    const yellow = t.paint('#e3b51f', 0.5);
    const gateColour = t.paint('#d9a514', 0.5);
    const x0 = -L / 2 - w - rail.off;
    const x1 = L / 2 + w + rail.off;
    const z0 = -W / 2 - w - rail.off;
    const z1 = W / 2 + w + rail.off;
    const run = (a: [number, number], b: [number, number], paint = yellow) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const cx = (a[0] + b[0]) / 2;
      const cz = (a[1] + b[1]) / 2;
      const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
      for (const h of [1.1, 0.5])
        t.box(
          group,
          paint,
          alongX ? len : 0.04,
          0.04,
          alongX ? 0.04 : len,
          cx,
          h,
          cz,
        );
      t.box(
        group,
        paint,
        alongX ? len : 0.01,
        0.1,
        alongX ? 0.01 : len,
        cx,
        0.05,
        cz,
      );
    };
    const post = (x: number, z: number) =>
      t.cyl(group, yellow, 0.024, 1.12, x, 0.56, z, 'y', 10);
    // Posts at most 1.8 m apart along each side.
    const posts = (from: number, to: number) => {
      const n = Math.max(1, Math.ceil((to - from) / 1.8));
      return Array.from(
        { length: n + 1 },
        (_, i) => from + ((to - from) * i) / n,
      );
    };
    for (const x of posts(x0, x1)) {
      post(x, z0);
      post(x, z1);
    }
    for (const z of posts(z0, z1)) {
      post(x0, z);
      post(x1, z);
    }
    // Its sides; its east side either side of its gate.
    const g0 = rail.gate.at - rail.gate.width / 2;
    const g1 = rail.gate.at + rail.gate.width / 2;
    const r = 0.05;
    fixedSolids.push(
      { minX: x0 - r, maxX: x1 + r, minZ: z0 - r, maxZ: z0 + r },
      { minX: x0 - r, maxX: x1 + r, minZ: z1 - r, maxZ: z1 + r },
      { minX: x0 - r, maxX: x0 + r, minZ: z0, maxZ: z1 },
      { minX: x1 - r, maxX: x1 + r, minZ: z0, maxZ: g0 },
      { minX: x1 - r, maxX: x1 + r, minZ: g1, maxZ: z1 },
    );
    Object.assign(gateGap, { minX: x1 - r, maxX: x1 + r, minZ: g0, maxZ: g1 });
    run([x0, z0], [x1, z0]);
    run([x1, z0], [x1, g0]);
    run([x1, g1], [x1, z1]);
    run([x0, z1], [x1, z1]);
    run([x0, z0], [x0, z1]);
    // Its gate (the owner, 2026-10-26): a self-closing swing gate beside
    // the hatch, shut, opening outward. Its posts either side, its leaf a
    // frame with a top rail, knee rail and bars, hung on its spring hinge
    // on its south post, its latch on its north.
    {
      post(x1, g0);
      post(x1, g1);
      leaf.position.set(x1, 0, g1);
      group.add(leaf);
      const lw = rail.gate.width - 0.08;
      for (const h of [1.05, 0.55, 0.12])
        t.box(leaf, gateColour, 0.035, 0.035, lw, 0, h, -lw / 2 - 0.04);
      for (const dz of [-0.04, -lw - 0.04, -lw / 2 - 0.04])
        t.box(leaf, gateColour, 0.035, 0.95, 0.035, 0, 0.6, dz);
      // Its spring hinge on the south post, its latch on the north.
      t.cyl(leaf, t.paint('#2b2e2f', 0.6), 0.03, 0.18, 0, 0.9, 0, 'y', 10);
      t.box(
        group,
        t.paint('#2b2e2f', 0.6),
        0.06,
        0.08,
        0.05,
        x1,
        0.95,
        g0 + 0.03,
      );
    }
    // Its warnings on the rail, facing out on every side (the owner,
    // 2026-10-26), between its top and knee rails: the pit's danger, and
    // that its covers carry no one; at its gate, entry by permit only.
    const hang = (
      pictograms: Parameters<typeof createSafetySign>[1],
      lines: Parameters<typeof createSafetySign>[2],
      x: number,
      z: number,
      yaw: number,
    ) => {
      const holder = new Group();
      holder.position.set(x, 0, z);
      holder.rotation.y = yaw;
      group.add(holder);
      const sign = createSafetySign(kit, pictograms, lines);
      // A rail sign, 260 × 390 mm.
      sign.scale.setScalar(1.3);
      sign.position.y = 0.8;
      holder.add(sign);
      // Wired to its top and knee rails at its corners (the owner,
      // 2026-10-26: it seemed to float).
      for (const sx of [-0.12, 0.12])
        for (const [from, to] of [
          [0.97, 1.1],
          [0.63, 0.5],
        ])
          t.rod(holder, wire, [sx, from, -0.004], [sx, to, -out], 0.0015, 4);
    };
    const danger = ['DANGER', 'Deep pit', 'Risk of falling'] as const;
    const covers = [
      'Do not stand',
      'on the covers',
      'Not load-bearing',
    ] as const;
    const out = 0.03;
    const wire = t.paint('#9aa0a2', 0.4, 0.8);
    // North, toward the aisle.
    hang(['general'], danger, -1.8, z0 - out, Math.PI);
    hang(['no-entry'], covers, 1.4, z0 - out, Math.PI);
    // A lifebuoy on the rail, toward the aisle, near the gate.
    {
      const buoy = createLifebuoy(kit);
      buoy.rotation.y = Math.PI;
      buoy.position.set(x1 - 0.7, 0.75, z0 - out);
      group.add(buoy);
    }
    // South.
    hang(['general'], danger, -1.2, z1 + out, 0);
    hang(['no-entry'], covers, 1.2, z1 + out, 0);
    // East, by its gate: the gate's own, entry by permit, and the danger.
    hang(
      ['confined'],
      ['Authorised persons only', 'Entry by permit'],
      x1 + out,
      g0 - 0.5,
      Math.PI / 2,
    );
    hang(['general'], danger, x1 + out, -1.9, Math.PI / 2);
    // West.
    hang(['general'], danger, x0 - out, -0.8, -Math.PI / 2);
    hang(['no-entry'], covers, x0 - out, 0.8, -Math.PI / 2);
  }
  // The pump's davit outside the rail on the east, its arm reaching over
  // it to the hatch over the sump, its chain block hanging from it.
  // Painted yellow and marked with its safe working load, as lifting gear
  // is; its post on a 400 mm square base plate, 25 mm thick, held down by
  // four anchor bolts with their nuts and washers; a gusset where its arm
  // meets its post, and a diagonal knee brace under the arm (the owner,
  // 2026-10-26: it read as an arch stuck into the concrete).
  {
    const davitX = L / 2 + w + rail.off + 0.3;
    const hx = (hatchArea.minX + hatchArea.maxX) / 2;
    const davitZ = (hatchArea.minZ + hatchArea.maxZ) / 2;
    const reach = davitX - hx;
    const yellow = t.paint('#e3b51f', 0.5);
    const dark = t.paint('#2b2e2f', 0.6);
    const armY = 1.76;
    // Its base plate and its four anchor bolts.
    t.box(group, yellow, 0.4, 0.025, 0.4, davitX, 0.0125, davitZ);
    fixedSolids.push({
      minX: davitX - 0.2,
      maxX: davitX + 0.2,
      minZ: davitZ - 0.2,
      maxZ: davitZ + 0.2,
    });
    for (const dx of [-0.15, 0.15])
      for (const dz of [-0.15, 0.15]) {
        t.cyl(
          group,
          dark,
          0.022,
          0.006,
          davitX + dx,
          0.028,
          davitZ + dz,
          'y',
          12,
        );
        t.cyl(
          group,
          dark,
          0.016,
          0.022,
          davitX + dx,
          0.042,
          davitZ + dz,
          'y',
          6,
        );
        t.cyl(
          group,
          dark,
          0.008,
          0.02,
          davitX + dx,
          0.062,
          davitZ + dz,
          'y',
          8,
        );
      }
    // Its post, and its arm over the rail to the hatch.
    t.cyl(
      group,
      yellow,
      0.06,
      armY + 0.04,
      davitX,
      (armY + 0.04) / 2,
      davitZ,
      'y',
      14,
    );
    t.box(
      group,
      yellow,
      reach + 0.12,
      0.1,
      0.08,
      davitX - reach / 2,
      armY,
      davitZ,
    );
    // The gusset where they meet, and the knee brace under the arm.
    t.box(group, yellow, 0.22, 0.22, 0.012, davitX - 0.11, armY - 0.11, davitZ);
    {
      const from = [davitX, armY - 0.7] as const;
      const to = [davitX - 0.6, armY - 0.05] as const;
      const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
      const brace = t.box(
        group,
        yellow,
        len,
        0.05,
        0.05,
        (from[0] + to[0]) / 2,
        (from[1] + to[1]) / 2,
        davitZ,
      );
      brace.rotation.z = Math.atan2(to[1] - from[1], to[0] - from[0]);
    }
    // Bare: nothing hangs from its arm; its lifting gear is brought and
    // hung on it only for a lift (the owner, 2026-10-26).
    // Its mark.
    const swl = createMicroLabel(kit, 'PUMP DAVIT  SWL 250 kg', {
      height: 0.03,
      ink: '#151515',
      plate: '#e3b51f',
    });
    // On both faces of its arm, along it.
    swl.position.set(davitX - reach / 2, armY, davitZ + 0.041);
    const back = swl.clone();
    back.rotation.y = Math.PI;
    back.position.z = davitZ - 0.041;
    group.add(back);
    group.add(swl);
  }
  // The ultrasonic level transmitter under the gratings, on a bracket
  // from its north wall, looking down at the water.
  const level = createUltrasonicLevel(kit);
  level.group.position.set(-L / 2 + 1.0, -0.42, -W / 2 + 0.45);
  group.add(level.group);
  t.box(group, steel, 0.08, 0.05, 0.5, -L / 2 + 1.0, -0.12, -W / 2 + 0.25);
  // Its pump station (the owner, 2026-10-26: emptied by pumps at its
  // bottom, pushing up, not drawn from above): a duty and standby pair of
  // submersible pumps in its sump, west of its ladder, each docked on a
  // duckfoot bend fixed to the sump's floor and held on twin guide rails
  // up to the hatch frame, so the davit lifts it out through the hatch.
  // From each duckfoot its riser climbs out of the sump, runs west under
  // the gratings clear of the hatch and rises through them, a swing
  // non-return valve on it whose arm lifts while its pump pushes; the two
  // join in a short header over the floor, its outlet up to the sewer's
  // line (`PIT_DISCHARGE`).
  const station = (() => {
    const sumpFloor = -D - p.sump.depth;
    const px = L / 2 - 0.75;
    const zs = [W / 2 - 0.3, W / 2 - 0.9];
    const rx = PIT_DISCHARGE.x(L, p.hatch);
    const headerY = PIT_DISCHARGE.headerY;
    const body = t.paint('#2f4f6f', 0.45, 0.4);
    const black = t.paint('#1d1f21', 0.6);
    const rail = t.paint(FINISH.galvanised, 0.4, 0.6);
    const pipeColour = FINISH.galvanised;
    const arms: Group[] = [];
    zs.forEach((z, k) => {
      // The duckfoot bend, bolted to the sump floor.
      t.box(group, black, 0.3, 0.04, 0.3, px - 0.1, sumpFloor + 0.02, z);
      t.cyl(group, black, 0.06, 0.2, px - 0.22, sumpFloor + 0.14, z, 'y', 14);
      // The pump: its volute and its motor above, its lifting hoop.
      t.cyl(group, body, 0.13, 0.16, px, sumpFloor + 0.13, z, 'y', 24);
      t.cyl(group, body, 0.11, 0.42, px, sumpFloor + 0.42, z, 'y', 24);
      t.cyl(group, black, 0.115, 0.03, px, sumpFloor + 0.64, z, 'y', 24);
      t.rod(
        group,
        rail,
        [px - 0.06, sumpFloor + 0.66, z],
        [px, sumpFloor + 0.74, z],
        0.008,
      );
      t.rod(
        group,
        rail,
        [px + 0.06, sumpFloor + 0.66, z],
        [px, sumpFloor + 0.74, z],
        0.008,
      );
      const mark = createBrandBand(kit, 'grundflow', {
        radius: 0.11,
        height: 0.03,
      });
      mark.position.set(px, sumpFloor + 0.45, z);
      group.add(mark);
      // Its twin guide rails, up to a bracket under the hatch frame.
      for (const dz of [-0.05, 0.05])
        t.rod(
          group,
          rail,
          [px - 0.22, sumpFloor + 0.24, z + dz],
          [px - 0.22, -0.06, z + dz],
          0.012,
        );
      t.box(group, rail, 0.06, 0.03, 0.16, px - 0.22, -0.05, z);
      // Its riser: up out of the sump, west under the gratings, up
      // through them to the header.
      t.pipe(
        group,
        80,
        [
          [px - 0.22, sumpFloor + 0.24, z],
          [px - 0.22, -D + 0.4, z],
          [rx, -D + 0.4, z],
          [rx, headerY, z],
        ],
        pipeColour,
      );
      // Its swing non-return valve, above the gratings: its body, its
      // arm and weight on its side, lifting as water goes through.
      t.cyl(group, t.paint('#3a5f8a', 0.45), 0.065, 0.16, rx, 0.17, z, 'y', 20);
      const arm = new Group();
      arm.position.set(rx + 0.07, 0.17, z);
      group.add(arm);
      t.box(arm, black, 0.012, 0.012, 0.12, 0, 0, 0.06);
      t.box(arm, black, 0.04, 0.04, 0.04, 0, 0, 0.12);
      arms.push(arm);
      void k;
    });
    // The header joining the two risers, and its outlet up.
    t.pipe(
      group,
      80,
      [
        [rx, headerY, zs[0]],
        [rx, headerY, zs[1]],
      ],
      pipeColour,
    );
    const zm = (zs[0] + zs[1]) / 2;
    t.pipe(
      group,
      80,
      [
        [rx, headerY, zm],
        [rx, PIT_DISCHARGE.y, zm],
      ],
      pipeColour,
    );
    // Each pump's motor, heard from the sump while it runs.
    const motors = zs.map((z) => {
      const m = new Group();
      m.position.set(px, sumpFloor + 0.4, z);
      group.add(m);
      return m;
    });
    const sound = pumpSound(BOOSTER_PUMP);
    const heard = [false, false];
    return {
      /** Which pumps run (duty first): their checks open, their motors heard. */
      set(running: readonly boolean[]) {
        running.forEach((on, k) => {
          arms[k].rotation.x = on ? -0.6 : 0;
          if (on !== heard[k]) {
            heard[k] = on;
            partAudio.hold(motors[k], on ? sound : null, motors[k]);
          }
        });
      },
      dispose() {
        for (const m of motors) partAudio.hold(m, null);
      },
    };
  })();
  // Its way out (the owner, 2026-10-26: no one who fell in could climb
  // out of it): a fixed stainless ladder down its east wall under its
  // hatch, at the hatch's north edge clear of the sump, from just under
  // the hatch to its floor; its handholds stop under the hatch, which
  // closes over it.
  {
    const ladder = createTankLadder(kit, {
      depth: D - 0.05,
      standOff: 0.18,
      extension: -0.05,
    });
    ladder.rotation.y = -Math.PI / 2;
    // Centred along the hatch (the owner, 2026-10-26).
    ladder.position.set(L / 2, -0.05, W / 2 - p.hatch / 2);
    group.add(ladder);
  }
  // Its float switches (the owner, 2026-10-26), in a row by its sump on
  // a bracket from its east wall under the gratings: each on its cable to
  // its level, hanging when dry, tilted up on the water when it reaches
  // it; each a component, saying only what anyone looking in would see.
  const floats = p.floats.map((f, i) => {
    const x = L / 2 - 0.25;
    const z = W / 2 - p.hatch - 0.3 - i * 0.3;
    const hangFrom = -0.25;
    const at = -D + f.height;
    const holder = new Group();
    holder.position.set(x, 0, z);
    group.add(holder);
    const cable = t.paint('#1b1d1e', 0.7);
    t.cyl(
      holder,
      cable,
      0.004,
      hangFrom - at,
      0,
      (hangFrom + at) / 2,
      0,
      'y',
      6,
    );
    const body = new Group();
    body.position.set(0, at, 0);
    holder.add(body);
    t.cyl(body, t.paint(f.colour, 0.45), 0.045, 0.16, 0, -0.08, 0, 'y', 14);
    let up = false;
    markComponent(holder, {
      name: `Backwash pit float switch, ${f.name}`,
      status: () =>
        up ? 'Tilted up, on the water' : 'Hanging on its cable, dry',
    });
    return {
      set(depth: number) {
        up = depth >= f.height;
        // Tilted up on the water, or hanging straight down.
        body.rotation.z = up ? 1.2 : 0;
        body.position.y = up ? Math.min(at + 0.06, -D + depth) : at;
      },
    };
  });
  t.box(
    group,
    steel,
    0.5,
    0.04,
    p.floats.length * 0.3 + 0.1,
    L / 2 - 0.25,
    -0.25,
    W / 2 - p.hatch - 0.3 - ((p.floats.length - 1) * 0.3) / 2,
  );
  // Its name on its kerb.
  const name = createMicroLabel(kit, 'WH-T2  BACKWASH PIT', {
    height: 0.06,
    ink: '#151515',
    plate: '#e3b51f',
  });
  name.rotation.x = -Math.PI / 2;
  name.position.set(-L / 2 + 1.2, 0.003, W / 2 + 0.15);
  group.add(name);
  // Its gate and hatch, each opened or shut by a click, swinging there
  // over a second; local, not world state, like a door's leaf.
  const gate = { open: false, angle: 0 };
  const cover = { open: false, angle: 0 };
  const GATE_OPEN = 1.6;
  const LID_OPEN = 1.75;
  const uses = new Map<Object3D, () => void>();
  leaf.traverse((o) => uses.set(o, () => (gate.open = !gate.open)));
  for (const o of [lid, lidPlate, handle, sign])
    o.traverse((c) => uses.set(c, () => (cover.open = !cover.open)));
  const toward = (now: number, target: number, step: number) =>
    now < target ? Math.min(target, now + step) : Math.max(target, now - step);
  return {
    group,
    uses,
    /** Swing its gate and hatch toward where they were left. */
    update(delta: number) {
      gate.angle = toward(gate.angle, gate.open ? GATE_OPEN : 0, delta * 1.6);
      cover.angle = toward(
        cover.angle,
        cover.open ? LID_OPEN : 0,
        delta * 1.75,
      );
      leaf.rotation.y = -gate.angle;
      lid.rotation.x = cover.angle;
    },
    /** Whether its gate and hatch stand open. */
    gateOpen: () => gate.angle > 0.6,
    hatchOpen: () => cover.angle > 0.05,
    /**
     * What bars the walker now, in its own frame: its rail and davit; its
     * gate's gap while shut; its hatch's opening while open (no one steps
     * into the pit; its ladder is for a permitted entry, not modelled).
     */
    solids() {
      return [
        ...fixedSolids,
        ...(gate.angle > 0.6 ? [] : [gateGap]),
        ...(cover.angle > 0.05 ? [hatchArea] : []),
      ];
    },
    /** Which of its sump pumps run, duty first. */
    setPumps: (running: readonly boolean[]) => station.set(running),
    dispose: () => station.dispose(),
    /** Its water's depth above its floor, metres. */
    setDepth(metres: number) {
      const d = Math.max(0.02, Math.min(p.topWater, metres));
      water.position.y = -D + d;
      water.visible = metres > 0.01;
      level.show(metres);
      for (const f of floats) f.set(metres);
    },
  };
}

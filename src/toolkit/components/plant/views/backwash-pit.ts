import { markComponent } from '../../core/views/component-identity';
import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { plantTools } from './plant-tools';
import { createGratingDeck } from './railings';
import { createUltrasonicLevel } from './ultrasonic-level';
import { createStaffGauge } from './staff-gauge';
import { createTankLadder } from './tank-ladder';
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
  t.box(
    group,
    t.paint('#d4b21e', 0.5),
    hatch.length,
    0.02,
    hatch.width,
    (hatchArea.minX + hatchArea.maxX) / 2,
    -0.01,
    (hatchArea.minZ + hatchArea.maxZ) / 2,
  );
  const sign = createSafetySign(
    kit,
    ['confined'],
    ['DANGER', 'Confined space', 'Entry by permit only'],
  );
  sign.rotation.x = -Math.PI / 2;
  sign.scale.setScalar(0.8);
  sign.position.set(
    (hatchArea.minX + hatchArea.maxX) / 2,
    0.002,
    (hatchArea.minZ + hatchArea.maxZ) / 2,
  );
  group.add(sign);
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
      const leaf = new Group();
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
      const sign = createSafetySign(kit, pictograms, lines);
      sign.scale.setScalar(0.85);
      sign.position.set(x, 0.8, z);
      sign.rotation.y = yaw;
      group.add(sign);
    };
    const danger = ['DANGER', 'Deep pit', 'Risk of falling'] as const;
    const covers = [
      'Do not stand',
      'on the covers',
      'Not load-bearing',
    ] as const;
    const out = 0.03;
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
    // Its chain block over the hatch, and its mark.
    t.cyl(group, dark, 0.04, 0.14, hx, armY - 0.12, davitZ, 'y', 10);
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
    ladder.position.set(L / 2, -0.05, W / 2 - p.hatch + 0.15);
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
  return {
    group,
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

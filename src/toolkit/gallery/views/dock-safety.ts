import { computed } from '@preact/signals-core';
import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { markComponent } from '../../components/core/views/component-identity';
import { createExtinguisher } from '../../components/fire/views/fire-fittings';
import {
  callPoint,
  sounderBeacon,
} from '../../components/fire/parts/fire-parts';
import type { Part } from '../../components/core/parts/parts';
import {
  createFireActionNotice,
  createLawPoster,
  createNeverMixNotice,
  createSpillageNotice,
} from '../../components/general-safety/views/safety-notices';
import { createSafetySign } from '../../components/general-safety/views/safety-signs';
import { zoneInAlarm } from '../../../game/plant/fire-alarm';
import { roomWorld } from '../../save/world-store';
import type { ShellAperture } from '../logic/shell-rooms';
import { dockChannel, hazardStripes } from './dock-fittings';
import { YARD_LEVEL } from './dock-outside';

/**
 * The loading dock's safety (prompt 073; the owner, 2026-10-26: all a real
 * dock would have, after HSE's and the loading-bay trade's guidance), rough:
 *
 * - each channel's edges: a non-slip strip at the drop, a solid yellow
 *   line set back from it; removable posts and chain along them, the drop
 *   guarded while no lorry stands in;
 * - wheel guides along each channel's floor, and a pair of wheel chocks on
 *   its wall by the opening;
 * - a dock traffic light (red, green) beside each opening, inside for the
 *   loaders and outside for the driver, showing red with no lorry in;
 * - signs: vehicles, the edge, hi-vis, safety footwear, no smoking;
 * - two fire points (CO2 and foam, the fire action notice, a working
 *   manual call point) by the ways in, a sounder-beacon; the law poster;
 *   by the acid store's door, the never-mix and spillage notices.
 *
 * Metres, the dock's middle at the origin, its floor at y = 0, x east,
 * z south; its outside wall's inside face at z = `wallZ` (north).
 */

interface DockFrame {
  wallZ: number;
  /** Half its width and depth, inside the walls. */
  hw: number;
  hd: number;
  thickness: number;
  apertures: readonly ShellAperture[];
}

/** Its fire points: by the corridor's doors and by the acid store's. */
export function dockFirePoints(f: { hw: number; hd: number }) {
  return [
    { id: 'lb-mcp-1', x: -2.2, z: f.hd - 0.005, yaw: Math.PI },
    { id: 'lb-mcp-2', x: -f.hw + 0.005, z: 1.0, yaw: Math.PI / 2 },
  ] as const;
}

export function createDockSafety(kit: PanelKit, f: DockFrame) {
  const group = new Group();
  group.name = 'loading dock safety';
  const paint = (color: string, roughness = 0.7, metalness = 0) => {
    const m = new MeshStandardMaterial({ color, roughness, metalness });
    kit.materials.push(m);
    return m;
  };
  const box = (
    parent: Object3D,
    m: Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const grit = paint('#3b3d3f', 1);
  const yellow = paint('#e3b51f', 0.6);
  const hazard = hazardStripes(kit);
  const chainM = paint('#e3b51f', 0.5, 0.4);
  const black = paint('#151617', 0.8);

  for (const o of f.apertures) {
    const c = dockChannel(o, f.wallZ);
    const edges = new Group();
    edges.name = 'Channel edge: non-slip strip, yellow line, posts and chain';
    // Along each side, and across the end.
    const runs: {
      along: 'z' | 'x';
      at: number;
      from: number;
      to: number;
      out: number;
    }[] = [
      { along: 'z', at: c.minX, from: c.minZ, to: c.maxZ, out: -1 },
      { along: 'z', at: c.maxX, from: c.minZ, to: c.maxZ, out: 1 },
      { along: 'x', at: c.maxZ, from: c.minX, to: c.maxX, out: 1 },
    ];
    for (const r of runs) {
      const len = r.to - r.from + (r.along === 'x' ? 0.3 : 0);
      const mid = (r.from + r.to) / 2;
      const strip = (m: Material, off: number, width: number) =>
        r.along === 'z'
          ? box(edges, m, width, 0.004, len, r.at + r.out * off, 0.002, mid)
          : box(edges, m, len, 0.004, width, mid, 0.002, r.at + r.out * off);
      strip(grit, 0.075, 0.15);
      strip(yellow, 0.5, 0.1);
      // Removable posts every 1.5 m, 0.25 m back, a chain between them at
      // 1.1 m and 0.6 m (guarding the drop while the bay is empty).
      const n = Math.max(1, Math.round((r.to - r.from) / 1.5));
      const posts: Vector3[] = [];
      for (let k = 0; k <= n; k++) {
        const s = r.from + ((r.to - r.from) * k) / n;
        const p =
          r.along === 'z'
            ? new Vector3(r.at + r.out * 0.25, 0, s)
            : new Vector3(s, 0, r.at + r.out * 0.25);
        // The corner posts are shared; and none in the opening's line.
        if (r.along === 'x' && (k === 0 || k === n)) continue;
        if (r.along === 'z' && k === 0) continue;
        posts.push(p);
        const post = new Mesh(
          new CylinderGeometry(0.03, 0.03, 1.15, 8),
          hazard,
        );
        post.position.set(p.x, 0.575, p.z);
        edges.add(post);
        box(edges, black, 0.14, 0.03, 0.14, p.x, 0.015, p.z);
      }
      for (let k = 1; k < posts.length; k++)
        for (const y of [1.1, 0.6]) {
          const a = posts[k - 1];
          const b = posts[k];
          const d = b.clone().sub(a);
          const link = new Mesh(
            new CylinderGeometry(0.008, 0.008, d.length(), 4),
            chainM,
          );
          link.position.set((a.x + b.x) / 2, y - 0.04, (a.z + b.z) / 2);
          link.rotation.set(
            r.along === 'z' ? Math.PI / 2 : 0,
            0,
            r.along === 'x' ? Math.PI / 2 : 0,
          );
          edges.add(link);
        }
    }
    group.add(edges);
    // Wheel guides along the channel's floor, the lorry's wheels between.
    for (const s of [c.minX + 0.35, c.maxX - 0.35])
      box(
        group,
        hazard,
        0.2,
        0.15,
        c.maxZ - c.minZ - 0.6,
        s,
        YARD_LEVEL + 0.075,
        (c.minZ + c.maxZ) / 2 - 0.3,
      );
    // Wheel chocks hung on the channel's side wall by the opening.
    const chocks = new Group();
    chocks.name = 'Wheel chocks';
    for (const dz of [0, 0.32]) {
      const chock = box(
        chocks,
        paint('#d8b41c', 0.8),
        0.12,
        0.2,
        0.28,
        c.minX + 0.07,
        YARD_LEVEL + 0.9,
        c.minZ + 0.8 + dz,
      );
      chock.rotation.x = 0.35;
    }
    group.add(chocks);
    // The dock traffic light: inside beside the opening's left guide, and
    // outside for the driver; red lit, no lorry in.
    const light = (x: number, y: number, z: number, yaw: number) => {
      const housing = new Group();
      housing.name = 'Dock traffic light';
      housing.position.set(x, y, z);
      housing.rotation.y = yaw;
      box(housing, black, 0.18, 0.4, 0.1, 0, 0, 0.05);
      const red = new MeshBasicMaterial({ color: '#ff2a1e' });
      const green = new MeshBasicMaterial({ color: '#173d1e' });
      kit.materials.push(red, green);
      for (const [m, dy] of [
        [red, 0.09],
        [green, -0.09],
      ] as const) {
        const lens = new Mesh(new CircleGeometry(0.055, 20), m);
        lens.position.set(0, dy, 0.101);
        housing.add(lens);
      }
      group.add(housing);
    };
    const lx = o.at - o.w / 2 - 0.35;
    light(lx, 2.4, f.wallZ + 0.005, 0);
    light(lx, YARD_LEVEL + 2.6, f.wallZ - f.thickness - 0.005, Math.PI);
  }

  // Signs on the outside wall's two ends, facing in.
  const signRow = (
    x: number,
    rows: readonly [
      readonly Parameters<typeof createSafetySign>[1][number][],
      readonly string[],
    ][],
  ) => {
    const row = new Group();
    row.position.set(x, 1.65, f.wallZ + 0.005);
    rows.forEach(([p, lines], i) => {
      const sign = createSafetySign(kit, p, lines);
      sign.position.x = (i - (rows.length - 1) / 2) * 0.42;
      row.add(sign);
    });
    group.add(row);
  };
  const endX = f.hw - (f.hw - (f.apertures[1]?.at ?? 3) - 1.75) / 2;
  signRow(-endX, [
    [['general'], ['Danger', 'Vehicles reversing']],
    [['general'], ['Caution', 'Edge drop']],
  ]);
  signRow(endX, [
    [['mandatory'], ['Hi-vis clothing', 'must be worn']],
    [['boots'], ['Safety footwear', 'must be worn']],
    [['no-smoking'], ['No smoking']],
  ]);

  // Fire points: CO2 and foam, the floor before them kept clear, the fire
  // action notice above.
  for (const p of dockFirePoints(f)) {
    const point = new Group();
    point.position.set(p.x, 0.3, p.z);
    point.rotation.y = p.yaw;
    for (const [k, dx] of [
      ['co2', -0.22],
      ['foam', 0.22],
    ] as const) {
      const e = createExtinguisher(kit, k);
      e.group.position.x = dx;
      point.add(e.group);
    }
    const red = paint('#c4231c', 0.6);
    box(point, red, 1.0, 0.004, 0.06, 0, -0.3 + 0.002, 0.8);
    box(point, red, 0.06, 0.004, 0.8, -0.5, -0.3 + 0.002, 0.4);
    box(point, red, 0.06, 0.004, 0.8, 0.5, -0.3 + 0.002, 0.4);
    const notice = createFireActionNotice(kit);
    notice.position.set(0, 1.45, 0.005);
    point.add(notice);
    group.add(point);
  }
  // The law poster by the corridor's doors; the chemical notices by the
  // acid store's.
  const law = createLawPoster(kit);
  law.position.set(2.6, 1.6, f.hd - 0.005);
  law.rotation.y = Math.PI;
  group.add(law);
  for (const [make, z] of [
    [createNeverMixNotice, -0.6],
    [createSpillageNotice, -1.25],
  ] as const) {
    const n = make(kit);
    n.position.set(-f.hw + 0.005, 1.6, z);
    n.rotation.y = Math.PI / 2;
    group.add(n);
  }
  // Rough, for now (prompt 073): set decoration until its parts are modelled.
  markComponent(group, { decorative: true });
  return { group };
}

/** Its fire alarm: a manual call point at each fire point, a sounder-beacon. */
export function dockFireAlarm(
  kit: PanelKit,
  f: { hw: number; hd: number },
): Part[] {
  const store = roomWorld();
  const alarm = computed(() =>
    zoneInAlarm(store.world.value.fireAlarm, 'loading_bay'),
  );
  const parts: Part[] = [];
  for (const p of dockFirePoints(f)) {
    const latched = computed(() => store.world.value.fireAlarm.latched[p.id]);
    const cp = callPoint(kit, {
      latched,
      press: () =>
        store.dispatch({
          type: 'fire-alarm',
          action: { act: 'press', point: p.id },
        }),
      reset: () =>
        store.dispatch({
          type: 'fire-alarm',
          action: { act: 'reset', point: p.id },
        }),
    });
    const at = new Vector3(0.62, 0, 0).applyAxisAngle(
      new Vector3(0, 1, 0),
      p.yaw,
    );
    cp.object.position.set(p.x + at.x, 1.4, p.z + at.z);
    cp.object.rotation.y = p.yaw;
    parts.push(cp);
  }
  const s = sounderBeacon(kit, { sounding: alarm });
  s.object.position.set(2.6, 3.2, f.hd - 0.005);
  s.object.rotation.y = Math.PI;
  parts.push(s);
  return parts;
}

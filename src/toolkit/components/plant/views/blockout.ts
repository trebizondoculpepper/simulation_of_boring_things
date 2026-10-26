import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  SphereGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import type { BrandId } from '../../core/logic/brands';
import { createEngravedPlate } from '../../core/views/plant-signs';
import { createSectionalTank } from './balance-plant';
import { createHumanLadder } from '../../architectural/views/human-ladder';

/**
 * Blocking out a room before its machines are modelled: a real tank of
 * any size, and a placeholder for any machine not yet modelled, a plain
 * box at the size it must take, its name on its front, to be replaced by
 * the real model.
 * Floor ones stand on the floor at the middle of their footprint, front
 * toward +z; wall ones hang from the wall's face at the middle of their
 * back, front toward +z, as the plant exhibits do.
 */

function labelCard(kit: PanelKit, text: string, w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(32, Math.round((512 * h) / w));
  const c = canvas.getContext('2d');
  if (c) {
    c.fillStyle = '#f4f2ea';
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = '#16191a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const lines = text.split('\n');
    const size = Math.min(
      canvas.height / (lines.length + 0.6),
      canvas.width / 14,
    );
    c.font = `bold ${size}px Arial, Helvetica, sans-serif`;
    lines.forEach((line, i) =>
      c.fillText(
        line,
        canvas.width / 2,
        (canvas.height * (i + 1)) / (lines.length + 1),
        canvas.width * 0.94,
      ),
    );
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  kit.textures.push(map);
  const material = new MeshBasicMaterial({ map });
  // A placeholder's own label, left as it is with the power off.
  material.userData.unpowered = true;
  kit.materials.push(material);
  return new Mesh(new PlaneGeometry(w, h), material);
}

/** A colour of its own for each name: the same name, the same colour. */
export function placeholderColour(name: string) {
  let hash = 2166136261;
  for (const ch of name) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  const hue = (hash >>> 0) % 360;
  return `hsl(${hue}, 45%, 52%)`;
}

const fmt = (v: number) => (Math.round(v * 10) / 10).toString();

/** How far a tank's caged ladder stands out from its face, metres. */
export const TANK_LADDER = 0.7;

/**
 * A tank of any size (the tank helper): a GRP sectional tank of 1 m
 * panels on its steel bearers (`createSectionalTank`), as balance, break
 * and backwash tanks are, its panels the whole metres that fit `w` × `d`
 * × `h`, with a caged ladder up its face to the roof hatch when it is
 * taller than a reach; or, `shape` 'vessel', an upright GRP vessel of
 * the largest diameter that fits, domed, on a plinth, as a contact tank
 * is. Each with its plate: its name and capacity. A sectional tank has a
 * contents gauge on its face: a clear sight tube on brackets, its water
 * column standing at the tank's level (`setLevel`, a share of full).
 */
export function createTank(
  kit: PanelKit,
  {
    w,
    d,
    h,
    label,
    shape = 'sectional',
    brand = 'gorskiy',
  }: {
    w: number;
    d: number;
    h: number;
    label: string;
    shape?: 'sectional' | 'vessel';
    brand?: BrandId;
  },
) {
  const group = new Group() as Group & {
    /** Its contents, a share of full, on its sight gauge (sectional only). */
    setLevel(share: number): void;
  };
  group.name = `${label} (tank)`;
  group.setLevel = () => {};
  if (shape === 'sectional') {
    const ny = Math.max(1, Math.floor(h - 0.35 + 1e-6));
    // Taller than a reach: a caged ladder up its face, in its footprint.
    const ladderDepth = ny >= 2 ? TANK_LADDER : 0;
    const nx = Math.max(1, Math.floor(w - 0.1 + 1e-6));
    const nz = Math.max(1, Math.floor(d - 0.2 - ladderDepth + 1e-6));
    const tank = createSectionalTank(kit, { nx, nz, ny, brand });
    const back = -ladderDepth / 2;
    tank.group.position.z = back;
    group.add(tank.group);
    const plate = createEngravedPlate(kit, [`${label}  ${nx * nz * ny} m³`], {
      colour: 'white',
      width: Math.min(nx * 0.8, 1.6),
      height: 0.07,
    });
    plate.position.set(
      0,
      tank.lift + Math.min(1.5, ny - 0.3),
      back + nz / 2 + 0.02,
    );
    group.add(plate);
    if (ladderDepth) {
      const ladder = createHumanLadder('caged', tank.top + 0.05, { kit }).group;
      ladder.position.set(-nx / 2 + 0.45, 0, back + nz / 2 + 0.02);
      group.add(ladder);
    }
    // The contents gauge: a clear tube at the face's right-hand edge, on
    // brackets, its water column at the tank's level, a scale beside it.
    const bottom = tank.lift + 0.08;
    const span = tank.top - 0.08 - bottom;
    const gx = nx / 2 - 0.09;
    const gz = back + nz / 2 + 0.07;
    const clearTube = new MeshStandardMaterial({
      color: '#dfeff2',
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
    });
    const water = new MeshStandardMaterial({
      color: '#3b7fc4',
      roughness: 0.3,
    });
    const steelBracket = new MeshStandardMaterial({
      color: '#8d9396',
      roughness: 0.5,
      metalness: 0.5,
    });
    kit.materials.push(clearTube, water, steelBracket);
    const tube = new Mesh(
      new CylinderGeometry(0.018, 0.018, span, 14),
      clearTube,
    );
    tube.position.set(gx, bottom + span / 2, gz);
    group.add(tube);
    for (const y of [bottom, bottom + span]) {
      const bracket = new Mesh(new BoxGeometry(0.03, 0.03, 0.06), steelBracket);
      bracket.position.set(gx, y, gz - 0.035);
      group.add(bracket);
    }
    for (let k = 0; k <= 4; k++) {
      const tick = new Mesh(new BoxGeometry(0.025, 0.004, 0.004), steelBracket);
      tick.position.set(gx - 0.035, bottom + (span * k) / 4, gz);
      group.add(tick);
    }
    const column = new Mesh(new CylinderGeometry(0.013, 0.013, 1, 12), water);
    column.userData.live = true;
    group.add(column);
    group.setLevel = (share) => {
      const h = Math.max(0.002, Math.min(1, share)) * span;
      column.scale.y = h;
      column.position.set(gx, bottom + h / 2, gz);
    };
    group.setLevel(0.65);
    return group;
  }
  // An upright vessel: its plinth, shell and dome, a manway on top.
  const dia = Math.min(w, d) - 0.1;
  const r = dia / 2;
  const grp = new MeshStandardMaterial({ color: '#7f9a7a', roughness: 0.6 });
  const plinthM = new MeshStandardMaterial({
    color: '#9c9a94',
    roughness: 0.8,
  });
  const steel = new MeshStandardMaterial({ color: '#6e7d5c', roughness: 0.6 });
  kit.materials.push(grp, plinthM, steel);
  const plinth = new Mesh(new BoxGeometry(dia + 0.1, 0.12, dia + 0.1), plinthM);
  plinth.position.y = 0.06;
  const dome = r * 0.3;
  const shellH = Math.max(0.5, h - 0.12 - dome - 0.15);
  const shell = new Mesh(new CylinderGeometry(r, r, shellH, 40), grp);
  shell.position.y = 0.12 + shellH / 2;
  const cap = new Mesh(
    new SphereGeometry(r, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    grp,
  );
  cap.scale.y = dome / r;
  cap.position.y = 0.12 + shellH;
  const manway = new Mesh(new CylinderGeometry(0.25, 0.25, 0.12, 24), steel);
  manway.position.y = 0.12 + shellH + dome + 0.04;
  group.add(plinth, shell, cap, manway);
  const volume = Math.PI * r * r * shellH;
  const plate = createEngravedPlate(
    kit,
    [`${label}  ${Math.round(volume * 10) / 10} m³`],
    { colour: 'white', width: Math.min(dia * 0.6, 1.2), height: 0.07 },
  );
  plate.position.set(0, 0.12 + Math.min(1.6, shellH * 0.6), r + 0.01);
  group.add(plate);
  return group;
}

/**
 * A placeholder for a machine not yet modelled: a box of its own colour
 * at the size it must take, its name and size on its front. `mount`
 * 'wall' hangs it from the wall at the middle of its back.
 */
export function createPlaceholder(
  kit: PanelKit,
  {
    w,
    d,
    h,
    label,
    mount = 'floor',
  }: {
    w: number;
    d: number;
    h: number;
    label: string;
    mount?: 'floor' | 'wall';
  },
) {
  const group = new Group();
  group.name = `${label} (placeholder)`;
  const material = new MeshStandardMaterial({
    color: placeholderColour(label),
    roughness: 0.7,
  });
  kit.materials.push(material);
  const body = new Mesh(new BoxGeometry(w, h, d), material);
  body.position.set(
    0,
    mount === 'floor' ? h / 2 : 0,
    mount === 'floor' ? 0 : d / 2,
  );
  group.add(body);
  const cardH = Math.min(0.5, h * 0.6);
  const card = labelCard(
    kit,
    `${label}\n${fmt(w)} × ${fmt(d)} × ${fmt(h)} m · PLACEHOLDER`,
    Math.min(w * 0.9, 2.4),
    cardH,
  );
  card.position.set(
    0,
    mount === 'floor' ? Math.min(h - cardH / 2 - 0.05, 1.5) : 0,
    (mount === 'floor' ? d / 2 : d) + 0.005,
  );
  group.add(card);
  return group;
}

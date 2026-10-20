import {
  BoxGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from 'three';
import type { Material } from 'three';
import { DOOR_HEIGHT } from '../game/facility-plan';
import { PORTALS } from '../game/doors';
import type { Portal } from '../game/doors';

interface DoorModel {
  portal: Portal;
  left: Group;
  right?: Group;
  leafWidth: number;
}

/** Doors stay in the scene even when the room behind them is unloaded. */
export function createDoors() {
  const group = new Group();
  group.name = 'self-closing-doors';
  const painted = new MeshStandardMaterial({
    color: '#d9e5e3',
    metalness: 0.2,
    roughness: 0.38,
  });
  const service = new MeshStandardMaterial({
    color: '#9aa9aa',
    metalness: 0.35,
    roughness: 0.47,
  });
  const frame = new MeshStandardMaterial({
    color: '#536d75',
    metalness: 0.6,
    roughness: 0.34,
  });
  const steel = new MeshStandardMaterial({
    color: '#c3cecb',
    metalness: 0.8,
    roughness: 0.24,
  });
  const frosted = new MeshPhysicalMaterial({
    color: '#d5e7e8',
    metalness: 0,
    roughness: 0.72,
    transmission: 0.82,
    thickness: 0.22,
    ior: 1.16,
    side: DoubleSide,
  });
  const materials: Material[] = [painted, service, frame, steel, frosted];
  const models: DoorModel[] = [];
  function part(
    parent: Group,
    material: Material,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
  ) {
    const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
  for (const portal of PORTALS) {
    const doorway = new Group();
    doorway.name = portal.id;
    doorway.position.set(portal.x, portal.floorY, portal.z);
    if (portal.axis === 'z') doorway.rotation.y = -Math.PI / 2;
    group.add(doorway);
    const half = portal.width / 2;
    for (const side of [-1, 1])
      part(
        doorway,
        frame,
        0.07,
        DOOR_HEIGHT,
        0.11,
        side * half,
        DOOR_HEIGHT / 2,
        0,
      );
    part(
      doorway,
      frame,
      portal.width + 0.14,
      0.08,
      0.11,
      0,
      DOOR_HEIGHT + 0.04,
      0,
    );
    const sliding = portal.kind === 'frosted-slide';
    if (sliding) {
      part(
        doorway,
        frame,
        portal.width * 2.8,
        0.045,
        0.1,
        0,
        DOOR_HEIGHT + 0.11,
        0.03,
      );
      part(doorway, steel, portal.width + 0.1, 0.025, 0.06, 0, 0.012, 0.03);
    }
    const double = sliding || portal.width > 1.55;
    const leafWidth = double ? portal.width / 2 - 0.035 : portal.width - 0.07;
    const leafHeight = DOOR_HEIGHT - 0.02;
    const body = sliding ? frosted : portal.public ? painted : service;
    const left = new Group();
    left.position.x = -half + 0.035;
    doorway.add(left);
    part(
      left,
      body,
      leafWidth,
      leafHeight,
      sliding ? 0.035 : 0.06,
      leafWidth / 2,
      DOOR_HEIGHT / 2,
      0,
    );
    if (sliding) {
      for (const y of [0.03, DOOR_HEIGHT - 0.03])
        part(left, frame, leafWidth, 0.035, 0.06, leafWidth / 2, y, 0);
      part(
        left,
        frame,
        0.035,
        DOOR_HEIGHT - 0.07,
        0.06,
        leafWidth - 0.018,
        DOOR_HEIGHT / 2,
        0,
      );
    } else part(left, steel, 0.035, 0.2, 0.09, leafWidth - 0.16, 1.05, 0.055);
    let right: Group | undefined;
    if (double) {
      right = new Group();
      right.position.x = half - 0.035;
      doorway.add(right);
      part(
        right,
        body,
        leafWidth,
        leafHeight,
        sliding ? 0.035 : 0.06,
        -leafWidth / 2,
        DOOR_HEIGHT / 2,
        0,
      );
      if (sliding) {
        for (const y of [0.03, DOOR_HEIGHT - 0.03])
          part(right, frame, leafWidth, 0.035, 0.06, -leafWidth / 2, y, 0);
        part(
          right,
          frame,
          0.035,
          DOOR_HEIGHT - 0.07,
          0.06,
          -leafWidth + 0.018,
          DOOR_HEIGHT / 2,
          0,
        );
      } else
        part(right, steel, 0.035, 0.2, 0.09, -leafWidth + 0.16, 1.05, 0.055);
    }
    models.push({ portal, left, right, leafWidth });
  }
  return {
    group,
    setOpen(id: string, open: number) {
      const model = models.find((item) => item.portal.id === id);
      if (!model) return;
      if (model.portal.kind === 'frosted-slide') {
        model.left.position.x =
          -model.portal.width / 2 + 0.035 - open * model.leafWidth;
        if (model.right)
          model.right.position.x =
            model.portal.width / 2 - 0.035 + open * model.leafWidth;
      } else {
        model.left.rotation.y = open * 1.53;
        if (model.right) model.right.rotation.y = -open * 1.53;
      }
    },
    dispose() {
      group.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      for (const material of materials) material.dispose();
    },
  };
}

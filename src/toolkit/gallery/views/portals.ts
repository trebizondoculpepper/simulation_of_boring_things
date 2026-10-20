import {
  AlwaysDepth,
  AlwaysStencilFunc,
  BoxGeometry,
  EqualStencilFunc,
  Group,
  Mesh,
  MeshBasicMaterial,
  NoBlending,
  PlaneGeometry,
  ReplaceStencilOp,
  ShaderMaterial,
} from 'three';
import type { Material, Object3D, Texture } from 'three';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import { springDoor } from '../../components/architectural/parts/building-parts';
import { SPRING_OPENING } from '../../components/architectural/views/spring-door';
import { registerJoint } from '../logic/door-joins';
import {
  DEV_ROOM_COLOURS,
  DEV_ROOM_NAMES,
  WALL_THICKNESS,
  enterDevRoom,
} from '../logic/dev-room-links';
import type { RoomId, Portal } from '../logic/dev-room-links';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createPs1Material } from '../../components/core/parts/ps1-material';

/** How close to its wall a walker's centre must come to touch a portal, metres. */
export const PORTAL_REACH = WALL_THICKNESS / 2 + 0.25 + 0.15;
/** How far in front of a portal an arrival stands, metres. */
export const ARRIVAL_DISTANCE = 1.2;

/** The direction into the room from each wall, and the yaw facing it. */
const INWARD: Record<Portal['side'], { x: number; z: number; yaw: number }> = {
  north: { x: 0, z: 1, yaw: Math.PI },
  south: { x: 0, z: -1, yaw: 0 },
  west: { x: 1, z: 0, yaw: Math.PI / 2 },
  east: { x: -1, z: 0, yaw: -Math.PI / 2 },
};

/** How deep the dark lobby behind a room's door is, metres. */
const LOBBY = 1.6;
/** How near the doorway's face, and within how much of its middle, one goes through. */
const THROUGH = { face: 0.6, half: 0.5 };

/**
 * Stencil drawing for a doorway in a wall the room built solid: the
 * doorway marks where it is seen (`mask`), the depth there is pushed back
 * (`deepen`), and the lobby and the door's swinging leaf are drawn only
 * there, so the wall looks cut through without being changed. Needs the
 * renderer's stencil buffer (`createRenderer` has one).
 */
const DOORWAY_ORDER = 10;
function doorwayMaterials() {
  const mask = new MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: AlwaysStencilFunc,
    stencilZPass: ReplaceStencilOp,
  });
  const deepen = new ShaderMaterial({
    vertexShader: /* glsl */ `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        // As far off as can be: what is behind the doorway may be drawn.
        gl_Position.z = gl_Position.w;
      }
    `,
    fragmentShader: /* glsl */ `void main() { gl_FragColor = vec4(0.0); }`,
    colorWrite: false,
    depthFunc: AlwaysDepth,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: EqualStencilFunc,
  });
  /** Nothing at all, not even the background: the canvas made see-through. */
  const hole = new MeshBasicMaterial({
    color: '#000000',
    opacity: 0,
    blending: NoBlending,
    toneMapped: false,
    depthWrite: false,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: EqualStencilFunc,
  });
  /** Make `material` draw only in the doorway. */
  const within = <T extends Material>(material: T) => {
    material.stencilWrite = true;
    material.stencilRef = 1;
    material.stencilFunc = EqualStencilFunc;
    return material;
  };
  return { mask, deepen, hole, within };
}

/**
 * A room's ways out (`portals`), each a double-action spring door in the
 * wall, as on the corridor (the `springDoor` part), under the name of
 * the room it leads to on that room's colour. A use pushes it open, away
 * from you, onto a dark lobby (drawn into the solid wall through a
 * stencil, `doorwayMaterials`); it eases shut on its spring, and stays
 * open while you stand in its doorway; walk through it while it is open
 * and you are in that room, in front of its door back. The training
 * room, the Rhombus and the warehouse rooms have doors of their own.
 * `update` takes the time and where the walker is; `arrival` says where to
 * stand having come from a room. Built in scene units, `metre` per metre,
 * on a floor at `floorY`.
 */
export function createPortals(
  from: RoomId,
  portals: readonly Portal[],
  floorY: number,
  metre: number,
  {
    /**
     * The room cuts a real opening in its wall for each door
     * (`cutDoorways`), so its lobby is built, not drawn into the wall,
     * and the door is solid while shut (`solids`): for a room drawn
     * without a stencil buffer (the Rhombus, under WebGPU).
     */
    opening = false,
  }: { opening?: boolean } = {},
) {
  const group = new Group();
  group.name = 'Portals';
  const materials: Material[] = [];
  const textures: Texture[] = [];
  // The doors stand in the wall's face, 2 mm proud of it.
  const face = (WALL_THICKNESS / 2) * metre + 0.002 * metre;
  let leaving = false;
  const uses = new Map<Object3D, (direction?: number) => void>();
  // The spring doors, their parts and the doorway's stencil materials.
  const kit = createPanelKit();
  const parts = createPartSet();
  const doorway = doorwayMaterials();
  materials.push(doorway.mask, doorway.deepen, doorway.hole);
  const doors: {
    portal: Portal;
    part: ReturnType<typeof springDoor>;
    /** Whether the room beyond is seen through it now, drawn underneath. */
    seeing: boolean;
    /** How far in front of it the walker was last frame, metres. */
    was: number;
  }[] = [];
  const withdraw: (() => void)[] = [];
  const travel = (to: RoomId, through = false) => {
    if (leaving) return;
    leaving = true;
    enterDevRoom(to, from, through);
  };
  for (const portal of portals) {
    const inward = INWARD[portal.side];
    const frame = new Group();
    frame.position.set(
      portal.x + inward.x * face,
      floorY,
      portal.z + inward.z * face,
    );
    // Planes face +z; turn each to face into the room.
    frame.rotation.y = Math.atan2(inward.x, inward.z);
    group.add(frame);
    // A spring door in the wall, built in metres.
    const door = new Group();
    door.scale.setScalar(metre);
    frame.add(door);
    const part = parts.add(
      // It opens into the room, as the corridor's door it stands for
      // does: pulled from in here.
      springDoor(kit, { name: `${DEV_ROOM_NAMES[portal.to]} door`, opens: -1 }),
    );
    door.add(part.object);
    for (const [object, use] of part.uses) uses.set(object, use);
    const entry = { portal, part, seeing: false, was: Infinity };
    doors.push(entry);
    // Hung the other way about to the door it faces across the doorway
    // (the corridor's), so the two are one door: the same hinge, the same
    // swing. A mirror image swings the same way.
    part.object.scale.x = -1;
    const leaf = (() => {
      let found: Object3D | null = null;
      part.object.traverse((o) => {
        if (!found && o.userData.live) found = o;
      });
      return found as Object3D | null;
    })();
    /** What the doorway shows: its dark lobby, or the room beyond. */
    const lobbyFaces: Mesh[] = [];
    let hole: Mesh | null = null;
    // The leaf swings into the room, in front of the wall: drawn as it is.
    // The doorway, and the dark lobby behind it.
    const { width: w, height: h } = SPRING_OPENING;
    if (opening) {
      // A real lobby, through a real opening, its back wall a little
      // beyond the room's wall.
      const dark = createPs1Material({ color: '#0d0e0f', roughness: 1 });
      materials.push(dark);
      const t = WALL_THICKNESS;
      for (const [bw, bh, bd, x, y, z] of [
        [w + 0.2, h + 0.1, 0.05, 0, (h + 0.1) / 2, -t - LOBBY],
        [
          0.05,
          h + 0.1,
          LOBBY + t,
          -w / 2 - 0.05,
          (h + 0.1) / 2,
          -(LOBBY + t) / 2,
        ],
        [
          0.05,
          h + 0.1,
          LOBBY + t,
          w / 2 + 0.05,
          (h + 0.1) / 2,
          -(LOBBY + t) / 2,
        ],
        [w + 0.2, 0.05, LOBBY + t, 0, h + 0.1, -(LOBBY + t) / 2],
        [w + 0.2, 0.05, LOBBY + t, 0, 0, -(LOBBY + t) / 2],
      ] as const) {
        const box = new Mesh(new BoxGeometry(bw, bh, bd), dark);
        box.position.set(x, y, z);
        box.raycast = () => {};
        door.add(box);
      }
    } else {
      const mask = new Mesh(new PlaneGeometry(w, h), doorway.mask);
      mask.position.set(0, h / 2, 0);
      mask.renderOrder = DOORWAY_ORDER;
      mask.raycast = () => {};
      door.add(mask);
      const deepen = new Mesh(new PlaneGeometry(w, h), doorway.deepen);
      deepen.position.copy(mask.position);
      deepen.renderOrder = DOORWAY_ORDER + 1;
      deepen.raycast = () => {};
      door.add(deepen);
      const dark = doorway.within(new MeshBasicMaterial({ color: '#0d0e0f' }));
      materials.push(dark);
      const lobby = (
        pw: number,
        ph: number,
        x: number,
        y: number,
        z: number,
        rx: number,
        ry: number,
      ) => {
        const face = new Mesh(new PlaneGeometry(pw, ph), dark);
        face.position.set(x, y, z);
        face.rotation.set(rx, ry, 0);
        face.renderOrder = DOORWAY_ORDER + 2;
        face.raycast = () => {};
        door.add(face);
        lobbyFaces.push(face);
      };
      lobby(w, h, 0, h / 2, -LOBBY, 0, 0);
      lobby(LOBBY, h, -w / 2, h / 2, -LOBBY / 2, 0, Math.PI / 2);
      lobby(LOBBY, h, w / 2, h / 2, -LOBBY / 2, 0, -Math.PI / 2);
      lobby(w, LOBBY, 0, h, -LOBBY / 2, Math.PI / 2, 0);
      lobby(w, LOBBY, 0, 0, -LOBBY / 2, -Math.PI / 2, 0);
      // Or, seeing through it, nothing: transparent, so the room drawn
      // underneath shows.
      hole = new Mesh(new PlaneGeometry(w, h), doorway.hole);
      hole.position.set(0, h / 2, 0);
      hole.renderOrder = DOORWAY_ORDER + 2;
      hole.raycast = () => {};
      hole.visible = false;
      door.add(hole);
      const doorFrame = {
        x: frame.position.x,
        z: frame.position.z,
        yaw: frame.rotation.y,
      };
      withdraw.push(
        registerJoint(from, portal.to, {
          frame: doorFrame,
          open: () => part.door.open,
          angle: () => part.door.angle,
          swingTo: (angle) => part.door.swingTo(angle),
          opening: () => {
            // Through the wall and well beyond, the doorway's width.
            const half = (SPRING_OPENING.width / 2) * metre;
            const a = { u: -half, v: -3 * metre };
            const b = { u: half, v: 0.4 * metre };
            const cs = [
              [a.u, a.v],
              [b.u, b.v],
            ].map(([u, v]) => ({
              x: portal.x + inward.z * u + inward.x * (v + face),
              z: portal.z - inward.x * u + inward.z * (v + face),
            }));
            return {
              minX: Math.min(cs[0].x, cs[1].x),
              maxX: Math.max(cs[0].x, cs[1].x),
              minZ: Math.min(cs[0].z, cs[1].z),
              maxZ: Math.max(cs[0].z, cs[1].z),
            };
          },
          see: (on) => {
            entry.seeing = on;
            for (const f of lobbyFaces) f.visible = !on;
            if (hole) hole.visible = on;
          },
          peek: (on) => {
            if (leaf) leaf.visible = !on;
          },
        }),
      );
    }
    // The name of the room it leads to over it, on that room's colour.
    const sign = createMicroLabel(kit, DEV_ROOM_NAMES[portal.to], {
      height: 0.075,
      ink: '#101214',
      plate: DEV_ROOM_COLOURS[portal.to],
      maxWidth: 1.6,
    });
    sign.position.set(0, h + 0.32, 0.1);
    door.add(sign);
  }
  return {
    group,
    /** A click on a portal travels, as walking into it does. */
    uses,
    /**
     * What a room that cuts real openings walks against: each door's
     * doorway while it is shut, and its lobby's sides. A room that draws
     * its doorways into a solid wall needs nothing.
     */
    solids: (): Footprint[] =>
      !opening
        ? []
        : doors.flatMap(({ portal, part }) => {
            const inward = INWARD[portal.side];
            const half = (SPRING_OPENING.width / 2) * metre;
            const t = (WALL_THICKNESS / 2) * metre;
            const deep = (LOBBY + WALL_THICKNESS) * metre;
            // In the door's frame: across (u) and into the room (v).
            const rect = (u0: number, u1: number, v0: number, v1: number) => {
              const xs = inward.x
                ? [portal.x + inward.x * v0, portal.x + inward.x * v1]
                : [portal.x + u0, portal.x + u1];
              const zs = inward.x
                ? [portal.z + u0, portal.z + u1]
                : [portal.z + inward.z * v0, portal.z + inward.z * v1];
              return {
                minX: Math.min(...xs),
                maxX: Math.max(...xs),
                minZ: Math.min(...zs),
                maxZ: Math.max(...zs),
              };
            };
            const sides = [
              rect(-half - 0.1 * metre, -half, -deep, t),
              rect(half, half + 0.1 * metre, -deep, t),
              rect(-half, half, -deep - 0.1 * metre, -deep),
            ];
            return part.door.open
              ? sides
              : [...sides, rect(-half, half, -t, t)];
          }),
    /** Where to stand, having come from `previous`: in front of its portal. */
    arrival(previous: string | null) {
      const portal = portals.find((p) => p.to === previous);
      if (!portal) return null;
      leaving = false;
      // Come back through its door: shut behind you now.
      for (const d of doors) {
        d.part.door.snapShut();
        d.was = Infinity;
      }
      const inward = INWARD[portal.side];
      const reach = (WALL_THICKNESS / 2 + ARRIVAL_DISTANCE) * metre;
      return {
        x: portal.x + inward.x * reach,
        z: portal.z + inward.z * reach,
        yaw: inward.yaw,
        pitch: 0,
      };
    },
    /** Travel if the walker, at (x, z), has walked into a portal. */
    update(delta: number, x: number, z: number) {
      parts.update(delta);
      // A door is held open while someone stands in its doorway, and
      // walking through it while it is open goes to its room.
      for (const entry of doors) {
        const { portal, part } = entry;
        const inward = INWARD[portal.side];
        const off =
          ((x - portal.x) * inward.x + (z - portal.z) * inward.z) / metre -
          WALL_THICKNESS / 2;
        const along =
          Math.abs((x - portal.x) * inward.z - (z - portal.z) * inward.x) /
          metre;
        const inDoorway = along <= THROUGH.half && off <= THROUGH.face;
        part.hold(inDoorway && part.door.open);
        const was = entry.was;
        entry.was = off;
        if (leaving || !inDoorway || !part.door.open) continue;
        if (entry.seeing) {
          // Seen through, it is walked through: over its threshold, the
          // room beyond takes over without a break.
          if (was > 0 && off <= 0) {
            travel(portal.to, true);
            return;
          }
        } else if (off >= -0.05) {
          travel(portal.to);
          return;
        }
      }
    },
    dispose() {
      for (const w of withdraw) w();
      parts.dispose();
      disposeKit(kit, group);
      group.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}

export type Portals = ReturnType<typeof createPortals>;

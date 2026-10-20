import { pcbMaterials } from './pcb-textures';
import type { PcbTexture } from './pcb-textures';
import { BoxGeometry, Color, Group, Mesh, CylinderGeometry } from 'three';
import type { Material } from 'three';
import type { MachineComponentKind } from '../logic/machine-components';
import { cardDesignation } from '../logic/machine-components';
import {
  createMicroLabel,
  kitGlow,
  kitPaint,
} from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import type { PanelKit } from '../../core/views/eighties-controls';

/** True-size envelopes; sources and dimensional derivations in doc/research/machine-components.md. */
export const MACHINE_ENVELOPES = {
  breaker: [0.105, 0.161, 0.086],
  relay: [0.029, 0.025, 0.0124],
  terminal: [0.0062, 0.0425, 0.047],
  plc: [0.03175, 0.254, 0.178],
  'drive-power': [0.094, 0.034, 0.0305],
} as const;

/** Device face at +z; the part supplies the action for its lever or body. */
export function createMachineDeviceView(
  kit: PanelKit,
  kind: MachineComponentKind,
  label: string,
) {
  const envelope = kind.startsWith('plc-')
    ? MACHINE_ENVELOPES.plc
    : MACHINE_ENVELOPES[kind as keyof typeof MACHINE_ENVELOPES];
  const [slotWidth, height, depth] = envelope;
  const width = kind === 'plc-cpu' ? slotWidth * 2 : slotWidth;
  const group = new Group();
  const body = new Group();
  body.name = kind.startsWith('plc-') ? 'Withdrawable card' : 'Device body';
  group.add(body);
  // A card slides out on it: not merged with the still parts (`mergeTree`).
  if (kind.startsWith('plc-')) body.userData.live = true;
  const plastic = kitPaint(kit, kind === 'terminal' ? '#b7b6a8' : '#41464a');
  const dark = kitPaint(kit, '#1b1d1e');
  const metal = kitPaint(kit, '#a5aaa9', 0.6);
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: Material = plastic,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    body.add(mesh);
    return mesh;
  };
  /** Where along the card its circuit board's middle is (cards only). */
  let pcbCentre = depth / 2;
  if (kind.startsWith('plc-')) {
    // The withdrawn module exposes its card, not a solid plastic brick.
    box(width, height, 0.024, 0, 0, depth - 0.012);
    // The board stops short of the slot, with shoulders each side of a
    // narrower edge tab that carries the gold fingers down into it, so
    // only the tab enters the connector (whose opening is 196 mm long).
    const board = pcbMaterials(kit, kind as PcbTexture, 'x');
    const shoulder = 0.022;
    const pcb = new Mesh(
      new BoxGeometry(0.0016, height * 0.88, depth - 0.024 - shoulder),
      board,
    );
    pcb.name = 'Textured green daughterboard';
    pcb.position.set(0, 0, (shoulder + depth - 0.024) / 2);
    pcbCentre = pcb.position.z;
    body.add(pcb);
    const tab = new Mesh(new BoxGeometry(0.0016, 0.17, shoulder), board);
    tab.name = 'Daughterboard edge tab';
    tab.position.set(0, 0, shoulder / 2);
    body.add(tab);
    const gold = kitPaint(kit, '#bda85c', 0.6);
    for (const side of [-1, 1])
      for (let i = 0; i < 32; i++) {
        const finger = box(
          0.0002,
          0.0022,
          0.012,
          side * 0.0009,
          (i - 15.5) * 0.00508,
          0.007,
          gold,
        );
        finger.name = 'Gold card edge contact';
      }
    for (const y of [-0.06, 0, 0.06])
      for (const z of [0.045, 0.105]) {
        box(0.004, 0.024, 0.016, 0.003, y, z, dark);
        for (const side of [-1, 1])
          for (let i = 0; i < 6; i++)
            box(
              0.001,
              0.001,
              0.002,
              0.003,
              y - 0.009 + i * 0.0036,
              z + side * 0.009,
              metal,
            );
      }
  } else box(width, height, depth, 0, 0, depth / 2);
  const face = depth + 0.001;
  if (kind === 'breaker' || kind === 'drive-power') {
    const poles = 3;
    for (const sy of [-1, 1])
      for (let i = 0; i < poles; i++) {
        const x = ((i - (poles - 1) / 2) * width) / (poles + 1);
        box(
          (width / (poles + 1)) * 0.65,
          0.012,
          0.008,
          x,
          sy * (height / 2 - 0.008),
          face,
          metal,
        );
        box(
          0.001,
          0.006,
          0.001,
          x,
          sy * (height / 2 - 0.008),
          face + 0.005,
          dark,
        );
      }
  }

  const service = new Group();
  service.position.set(0, -height * 0.35, face);
  body.add(service);
  // Its lever or screw turns: not merged with the still parts.
  service.userData.live = true;
  const handle = new Mesh(
    new BoxGeometry(
      Math.min(0.018, width * 0.7),
      kind === 'breaker' ? 0.028 : 0.008,
      0.006,
    ),
    kind === 'breaker' ? metal : dark,
  );
  handle.name =
    kind === 'breaker' ? 'Breaker operating lever' : 'Service lever';
  handle.position.z = 0.003;
  service.add(handle);
  if (kind === 'terminal') {
    for (const y of [-0.012, 0.012]) {
      const screw = new Mesh(
        new CylinderGeometry(0.002, 0.002, 0.002, 12),
        metal,
      );
      screw.rotation.x = Math.PI / 2;
      screw.position.set(0, y, face);
      service.add(screw);
    }
    service.position.y = 0;
  } else {
    const mark = createMicroLabel(
      kit,
      kind.startsWith('plc-') ? cardDesignation(kind)!.face : label,
      {
        height:
          kind === 'relay' ? 0.0012 : kind.startsWith('plc-') ? 0.0016 : 0.0025,
        maxWidth: width * 0.8,
        ink: '#e8e5d9',
      },
    );
    mark.position.set(0, height * 0.25, face);
    if (kind.startsWith('plc-')) {
      // Pepperdyne's logo, from its one definition, screen-printed large on
      // the non-component side (-x) of every one of its boards, as its
      // branding (not on the faceplate, where a red mark would pass for a
      // lamp): 45 mm tall, centred on the board and, being too long to
      // run across it, running along it, reading upwards.
      const maker = createBrandBadge(kit, 'pepperdyne', {
        height: 0.045,
        ink: '#e4e8ca',
      });
      maker.rotation.y = -Math.PI / 2;
      maker.rotateZ(Math.PI / 2);
      maker.position.set(-0.0009, 0, pcbCentre);
      body.add(maker);
      const boardMark = createMicroLabel(kit, cardDesignation(kind)!.face, {
        height: 0.002,
        maxWidth: depth * 0.7,
        ink: '#e4e8ca',
      });
      boardMark.rotation.y = Math.PI / 2;
      boardMark.position.set(0.0055, height * 0.33, depth * 0.45);
      body.add(boardMark);
    }
    body.add(mark);
  }
  const green = kitGlow(kit, '#43b66b');
  const red = kitGlow(kit, '#e34331');
  // Lamps a kind does not have are not made at all, rather than made and
  // hidden: a line-up has hundreds of terminals, and each mesh costs
  // something every frame, seen or not.
  const status =
    kind.startsWith('plc-') || kind === 'relay' || kind === 'breaker'
      ? box(
          Math.min(0.008, width * 0.4),
          0.004,
          0.002,
          0,
          height * 0.12,
          face + 0.001,
          dark,
        )
      : null;
  // Its lamps change paint: not merged with the still parts (`mergeTree`).
  if (status) status.userData.live = true;
  if (kind === 'breaker' && status) {
    status.name = 'Breaker status indicator';
    const legend = createMicroLabel(kit, 'POWER / ON', {
      height: 0.002,
      maxWidth: width * 0.8,
      ink: '#e8e5d9',
    });
    legend.position.set(0, height * 0.12 - 0.008, face);
    body.add(legend);
  }
  // A card's red activity lamp, over its green one: while the card has
  // power it flickers in uneven bursts and pauses, as if it were busy with
  // random reads and writes; it is dark when the card is off or failed.
  const card = kind.startsWith('plc-');
  const activityMaterial = kitGlow(kit, '#ff3a26');
  const activityLit = new Color('#ff3a26');
  const activityDark = new Color('#2a0c08');
  activityMaterial.color.copy(activityDark);
  // The same size and shape as the green lamp, just above it.
  if (card)
    box(
      Math.min(0.008, width * 0.4),
      0.004,
      0.002,
      0,
      height * 0.12 + 0.0075,
      face + 0.001,
      activityMaterial,
    );
  let activityLevel = 0;
  let activityTarget = 0;
  let activityHold = 0;
  let burst = 0;
  const flicker = (busy: boolean, dt: number) => {
    if (!busy) {
      activityLevel = 0;
      activityMaterial.color.copy(activityDark);
      return;
    }
    activityHold -= dt;
    if (activityHold <= 0) {
      if (burst > 0) {
        // Within a burst: short accesses, on and off, at uneven strengths.
        burst--;
        activityTarget = activityTarget > 0 ? 0 : 0.45 + Math.random() * 0.55;
        activityHold = 0.015 + Math.random() * 0.09;
      } else {
        // Between bursts: a pause, sometimes a long one, then another burst.
        activityTarget = Math.random() < 0.25 ? 0.15 : 0;
        activityHold =
          Math.random() < 0.2
            ? 0.6 + Math.random() * 1.4
            : 0.05 + Math.random() * 0.35;
        burst = 2 + Math.floor(Math.random() * 14);
      }
    }
    // A lamp rises and falls quickly, but not instantly: a pulse, not a cut.
    activityLevel += (activityTarget - activityLevel) * Math.min(1, dt * 40);
    activityMaterial.color.copy(activityDark).lerp(activityLit, activityLevel);
  };
  const channels =
    kind === 'plc-input' || kind === 'plc-output'
      ? Array.from({ length: 16 }, (_, i) =>
          box(
            0.004,
            0.003,
            0.002,
            0,
            height * 0.02 - i * 0.007,
            face + 0.001,
            dark,
          ),
        )
      : [];
  for (const channel of channels) channel.userData.live = true;
  if (kind === 'plc-input' || kind === 'plc-output' || kind === 'plc-analog') {
    // The field wiring arm is distinct from the module's card ejector.
    box(
      width * 0.65,
      height * 0.42,
      0.009,
      0,
      -height * 0.22,
      face + 0.004,
      dark,
    );
    for (let i = 0; i < 18; i++)
      box(
        0.003,
        0.002,
        0.001,
        width * 0.18,
        -height * 0.03 - i * 0.005,
        face + 0.009,
        metal,
      );
  }
  if (kind === 'plc-cpu' || kind === 'plc-comms') {
    for (const y of [-height * 0.05, -height * 0.22]) {
      box(
        Math.min(width * 0.75, 0.026),
        0.012,
        0.004,
        0,
        y,
        face + 0.002,
        metal,
      );
      box(Math.min(width * 0.6, 0.021), 0.007, 0.002, 0, y, face + 0.005, dark);
    }
  }
  if (kind === 'drive-power') {
    box(width, height, 0.003, 0, 0, 0.0015, metal);
    for (const x of [-0.035, 0, 0.035]) {
      const terminal = new Mesh(
        new CylinderGeometry(0.003, 0.003, 0.003, 12),
        metal,
      );
      terminal.rotation.x = Math.PI / 2;
      terminal.position.set(x, 0, face + 0.002);
      body.add(terminal);
    }
  }
  return {
    group,
    service,
    set(
      on: boolean,
      failed: boolean,
      inserted: boolean,
      bits: readonly boolean[] = [],
      dt = 1,
      detached = false,
      supplied = true,
    ) {
      if (status && kind === 'breaker') {
        const indication = !supplied
          ? 'black'
          : on && !failed
            ? 'green'
            : 'red';
        status.material =
          indication === 'black' ? dark : indication === 'green' ? green : red;
        status.userData.indication = indication;
      } else if (status) status.material = failed ? red : on ? green : dark;
      if (card) flicker(on && !failed && inserted, dt);
      service.rotation.x =
        kind === 'breaker'
          ? failed
            ? 0
            : on
              ? -0.4
              : 0.4
          : inserted
            ? 0
            : -0.4;
      if (kind === 'breaker') {
        // A visible throw as well as a tilt: from above, equal opposing
        // tilts alone can look almost identical on a dark handle.
        service.position.y =
          -height * 0.35 + (failed ? 0 : on ? 0.009 : -0.009);
        service.userData.position = failed ? 'tripped' : on ? 'on' : 'off';
      }
      // Pulling an electronics module releases it from its backplane.
      const target =
        kind.startsWith('plc-') && !inserted && !detached ? depth + 0.04 : 0;
      if (detached) body.position.z = 0;
      body.position.z += (target - body.position.z) * Math.min(1, dt * 6);
      channels.forEach((channel, i) => {
        channel.material = on && bits[i] ? green : dark;
      });
    },
  };
}

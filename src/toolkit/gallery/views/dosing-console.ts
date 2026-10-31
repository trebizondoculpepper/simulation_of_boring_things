import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Object3D, Vector2 } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../components/core/views/eighties-controls';
import { tools } from '../../components/core/views/fitting-tools';
import { createCanvasTexture } from '../../components/core/views/screens';
import { panelMakerMark } from '../../components/core/views/panel-maker-mark';
import { createBrandBadge } from '../../components/core/views/brand-badge';
import { RedrawGate } from '../../../ui2d/aero/logic/aero-layout';
import type { SizeIndex } from '../../../game/plant/museum-4-doses';
import type { TankId } from '../../../game/plant/museum-4-lab';
import type {
  NarrationKind,
  ScenarioView,
} from '../../../game/plant/museum-4-challenge';
import {
  PRESS_GLOW,
  SCREEN,
  chemicalKey,
  chemicalScreen,
  chosenTank,
  doseKey,
  doseScreen,
  hitScreen,
  newConsole,
  pressConsole,
  releaseConsole,
  scenarioKey,
  scenarioScreen,
  settleConsole,
} from '../logic/dosing-console';
import type {
  ConsoleEffect,
  ConsoleState,
  ScreenId,
} from '../logic/dosing-console';
import {
  drawChemicalScreen,
  drawDoseScreen,
  drawScenarioScreen,
} from './dosing-console-screens';

/**
 * Hall 4's dosing console (mission 113, `doc/plans/113/b-console-physical.md`):
 * Penfold's desk, 2.4 m wide, its raked panel holding three touch screens
 * (scenario, chemical, dose) running Aqualis's ClearDose Studio, and a big
 * red DOSE mushroom button on the front ledge. Facing +z; its origin on
 * the floor at its middle. The screens redraw only when what they show
 * changes (`RedrawGate`); a touch arrives as a mesh and its UV through the
 * room's controls (`touch`), never a key of its own. The host says what
 * the challenge engine shows and takes what the console asks of it.
 */

export interface ConsoleHost {
  /** The engine's scenario view now. */
  scenario(): ScenarioView;
  /** The narration's words while they show, or null. */
  caption(): { kind: NarrationKind; text: string } | null;
  /** Doses left (null in free play) and whether DOSE would be taken. */
  left(): number | null;
  ready(): boolean;
  /** The card titles for the chooser. */
  titles: readonly string[];
  effect(e: ConsoleEffect): void;
  /** DOSE: whether it was taken. */
  dose(tank: TankId, size: SizeIndex): boolean;
  /** A sound for a touch: taken, refused. */
  sound?(kind: 'touch' | 'dose' | 'deny'): void;
}

export const CONSOLE = {
  w: 2.4,
  d: 0.85,
  /** The desk's top, m. */
  h: 0.86,
  /** The screens' panel's rake back from upright, rad. */
  rake: 0.42,
  screen: { w: 0.62, h: 0.465, gap: 0.1 },
} as const;

export function createDosingConsole(kit: PanelKit, host: ConsoleHost) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Dosing console';
  const laminate = t.paint('#d7dbdc', 0.7);
  const trim = t.paint('#a9b0b4', 0.35, 0.7);
  const black = t.paint('#15181b', 0.3);
  const { w, d, h } = CONSOLE;

  // ---- The desk -----------------------------------------------------------------
  t.box(group, laminate, w, h - 0.04, d, 0, (h - 0.04) / 2, 0);
  t.box(group, t.paint('#3a4148', 0.8), w - 0.06, 0.1, d - 0.12, 0, 0.05, 0.03);
  t.box(group, trim, w + 0.02, 0.04, d + 0.02, 0, h - 0.02, 0);
  // The raked panel, its foot at the back of the front ledge.
  const panel = new Group();
  panel.position.set(0, h, -0.12);
  panel.rotation.x = -CONSOLE.rake;
  group.add(panel);
  const ph = CONSOLE.screen.h + 0.16;
  t.box(panel, laminate, w, ph, 0.08, 0, ph / 2, -0.04);
  t.box(panel, trim, w + 0.02, 0.025, 0.1, 0, ph, -0.04);
  // Penfold built the desk: its mark in the panel's top right corner.
  const face = new Group();
  face.position.set(0, ph / 2, 0);
  panel.add(face);
  panelMakerMark(kit, face, { width: w, height: ph, z: 0.0005, size: 0.022 });

  // ---- The screens ----------------------------------------------------------------
  const ids: ScreenId[] = ['scenario', 'chemical', 'dose'];
  const S = CONSOLE.screen;
  const screens = ids.map((id, i) => {
    const x = (i - 1) * (S.w + S.gap);
    const y = ph / 2 + 0.02;
    t.box(panel, black, S.w + 0.05, S.h + 0.05, 0.02, x, y, 0.005);
    const { canvas, context, texture } = createCanvasTexture(
      SCREEN.w,
      SCREEN.h,
      'touch',
    );
    kit.textures.push(texture);
    const material = new MeshBasicMaterial({ map: texture, toneMapped: false });
    kit.materials.push(material);
    const mesh = new Mesh(new PlaneGeometry(S.w, S.h), material);
    mesh.position.set(x, y, 0.0165);
    mesh.name = `Dosing console ${id} screen`;
    panel.add(mesh);
    return { id, canvas, context, texture, mesh, gate: new RedrawGate() };
  });
  // The software's badge under the middle screen.
  const badge = createBrandBadge(kit, 'aqualis', { height: 0.022 });
  badge.position.set(0, 0.035, 0.002);
  panel.add(badge);

  // ---- DOSE ---------------------------------------------------------------------
  const plinth = t.box(
    group,
    t.paint('#e3b622', 0.5),
    0.2,
    0.03,
    0.16,
    0,
    h + 0.015,
    0.25,
  );
  plinth.name = 'DOSE plinth';
  t.cyl(group, black, 0.04, 0.05, 0, h + 0.055, 0.25, 'y', 24);
  const head = t.cyl(
    group,
    t.paint('#c8221a', 0.35),
    0.048,
    0.035,
    0,
    h + 0.095,
    0.25,
    'y',
    32,
  );
  head.name = 'DOSE button';
  const label = createMicroLabel(kit, 'DOSE', {
    height: 0.03,
    ink: '#f5f5f5',
    plate: '#141414',
  });
  label.position.set(0, h - 0.07, d / 2 + 0.002);
  group.add(label);
  const headRest = head.position.y;

  // ---- State and drawing ------------------------------------------------------------
  let state: ConsoleState = newConsole();
  let glow = 0;
  let pushed = 0;
  let lastKind: ScenarioView['kind'] | null = null;

  const models = () => ({
    scenario: scenarioScreen(
      state,
      host.scenario(),
      host.caption(),
      host.titles,
    ),
    chemical: chemicalScreen(state),
    dose: doseScreen(state, host.left(), host.ready()),
  });

  const draw = () => {
    const m = models();
    if (lastKind !== null && m.scenario.view.kind !== lastKind) {
      lastKind = m.scenario.view.kind;
      state = settleConsole(state);
      return draw();
    }
    lastKind = m.scenario.view.kind;
    for (const s of screens) {
      const key =
        s.id === 'scenario'
          ? scenarioKey(m.scenario)
          : s.id === 'chemical'
            ? chemicalKey(m.chemical)
            : doseKey(m.dose);
      if (!s.gate.needs(key)) continue;
      if (s.id === 'scenario') drawScenarioScreen(s.context, m.scenario);
      else if (s.id === 'chemical') drawChemicalScreen(s.context, m.chemical);
      else drawDoseScreen(s.context, m.dose);
      s.texture.needsUpdate = true;
    }
  };

  const screenOf = (o: Object3D) => screens.find((s) => s.mesh === o);
  const pixel = (uv: Vector2) =>
    [uv.x * SCREEN.w, (1 - uv.y) * SCREEN.h] as const;

  /** What a touch on `object` at `uv` would press, or null. */
  const regionAt = (object: Object3D, uv: Vector2 | undefined) => {
    const s = screenOf(object);
    if (!s || !uv) return null;
    return hitScreen(
      s.id,
      state,
      scenarioScreen(state, host.scenario(), host.caption(), host.titles),
      ...pixel(uv),
    );
  };

  const pressDose = () => {
    pushed = 0.25;
    if (host.dose(chosenTank(state), state.size)) host.sound?.('dose');
    else host.sound?.('deny');
  };

  draw();
  return {
    group,
    /** The meshes that take touches. */
    touchables: [...screens.map((s) => s.mesh), head] as Object3D[],
    get state() {
      return state;
    },
    /** A touch on `object` (a screen at `uv`, or DOSE): whether it did anything. */
    touch(object: Object3D, uv?: Vector2) {
      if (object === head) {
        pressDose();
        return true;
      }
      const id = regionAt(object, uv);
      if (!id) return false;
      const r = pressConsole(state, id, host.titles.length);
      state = r.state;
      glow = PRESS_GLOW;
      host.sound?.('touch');
      if (r.effect) host.effect(r.effect);
      draw();
      return true;
    },
    /** Press a region by its id, as a touch on it would (for checks and scripts). */
    press(id: string) {
      const r = pressConsole(state, id, host.titles.length);
      state = r.state;
      glow = PRESS_GLOW;
      if (r.effect) host.effect(r.effect);
      draw();
    },
    /** Whether a touch there would do anything (the crosshair). */
    aimed(object: Object3D, uv?: Vector2) {
      return object === head || regionAt(object, uv) !== null;
    },
    /** Set the console's state (the dev room's demonstrations). */
    set(next: Partial<ConsoleState>) {
      state = { ...state, ...next };
      draw();
    },
    update(dt: number) {
      if (glow > 0) {
        glow -= dt;
        if (glow <= 0) state = releaseConsole(state);
      }
      if (pushed > 0) pushed = Math.max(0, pushed - dt);
      head.position.y = headRest - (pushed > 0.1 ? 0.008 : 0);
      draw();
    },
  };
}

export type DosingConsole = ReturnType<typeof createDosingConsole>;

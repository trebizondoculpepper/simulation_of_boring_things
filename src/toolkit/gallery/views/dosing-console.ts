import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Object3D, Vector2 } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
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
  afterDose,
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
import { pressSound } from '../logic/console-sounds';
import {
  celebrationFrame,
  celebrationKey,
  celebrationOn,
} from '../logic/console-celebration';
import type { CelebrationKind } from '../logic/console-celebration';
import { drawCelebration } from './console-celebration';
import type { ConsoleSound } from '../logic/console-sounds';

/**
 * Hall 4's dosing console (mission 113, `doc/plans/113/b-console-physical.md`):
 * Penfold's stand, 2.4 m wide, its raked panel holding three touch screens
 * (scenario, chemical, dose) running Aqualis's ClearDose Studio on a slim
 * pedestal and plinth: no shelf and no physical buttons, DOSE being a
 * glossy button on the dose screen once a chemical and a size are picked
 * (the owner, 2026-10-31). Facing +z; its origin on the floor at its middle. The screens redraw only when what they show
 * changes (`RedrawGate`); a touch arrives as a mesh and its UV through the
 * room's controls (`touch`), never a key of its own. The host says what
 * the challenge engine shows and takes what the console asks of it.
 */

export interface ConsoleHost {
  /** The engine's scenario view now. */
  scenario(): ScenarioView;
  /** How close the water is to balanced, 0..1 (`water-closeness.ts`), or null; no bar if absent. */
  closeness?(): number | null;
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
  /** A sound for a press, DOSE taken or refused (`logic/console-sounds`). */
  sound?(kind: ConsoleSound): void;
}

export const CONSOLE = {
  w: 2.4,
  d: 0.5,
  /** The screens' panel's foot, m. */
  h: 0.86,
  /** The screens' panel's rake back from upright, rad. */
  rake: 0.42,
  screen: { w: 0.62, h: 0.465, gap: 0.1 },
} as const;

/** The screens' brightness: their white is this grey, under the bloom threshold. */
const SCREEN_LEVEL = 0xb8b8b8;

export function createDosingConsole(kit: PanelKit, host: ConsoleHost) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Dosing console';
  const laminate = t.paint('#d7dbdc', 0.7);
  const trim = t.paint('#a9b0b4', 0.35, 0.7);
  const black = t.paint('#15181b', 0.3);
  const { w, d, h } = CONSOLE;

  // ---- The stand ----------------------------------------------------------------
  // A low plinth, a slim pedestal, and the raked panel on it; no shelf.
  t.box(group, t.paint('#3a4148', 0.8), w - 0.1, 0.08, d, 0, 0.04, 0);
  t.box(
    group,
    laminate,
    w - 0.3,
    h - 0.1,
    0.24,
    0,
    0.08 + (h - 0.1) / 2,
    -0.02,
  );
  t.box(group, trim, w - 0.26, 0.03, 0.28, 0, h - 0.015, -0.02);
  // The raked panel, its foot along the pedestal's front.
  const panel = new Group();
  panel.position.set(0, h, 0.12);
  panel.rotation.x = -CONSOLE.rake;
  group.add(panel);
  const ph = CONSOLE.screen.h + 0.16;
  t.box(panel, laminate, w, ph, 0.08, 0, ph / 2, -0.04);
  t.box(panel, trim, w + 0.02, 0.025, 0.1, 0, ph, -0.04);
  t.box(panel, trim, w + 0.02, 0.025, 0.1, 0, 0, -0.04);
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
    // Dimmed so a white dialog sits below the halls' bloom threshold
    // (0.92) and stays readable, while the screen still looks lit.
    const material = new MeshBasicMaterial({
      map: texture,
      toneMapped: false,
      color: SCREEN_LEVEL,
    });
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

  // ---- State and drawing ------------------------------------------------------------
  let state: ConsoleState = newConsole();
  let glow = 0;
  let lastKind: ScenarioView['kind'] | null = null;
  /** A celebration or commiseration playing over the screens, and how far in, s. */
  let party: { kind: CelebrationKind; t: number } | null = null;
  const partyFrame = () =>
    party ? celebrationFrame(party.kind, party.t) : null;

  const models = () => ({
    scenario: scenarioScreen(
      state,
      host.scenario(),
      host.caption(),
      host.titles,
      host.closeness?.() ?? null,
    ),
    chemical: chemicalScreen(state),
    dose: doseScreen(state, host.left(), host.ready()),
  });

  const draw = () => {
    const m = models();
    if (lastKind !== null && m.scenario.view.kind !== lastKind) {
      const on = celebrationOn(lastKind, m.scenario.view.kind);
      if (on) party = { kind: on, t: 0 };
      lastKind = m.scenario.view.kind;
      state = settleConsole(state);
      return draw();
    }
    lastKind = m.scenario.view.kind;
    const f = partyFrame();
    const fk = celebrationKey(f);
    for (const [i, s] of screens.entries()) {
      const key =
        fk +
        (s.id === 'scenario'
          ? scenarioKey(m.scenario)
          : s.id === 'chemical'
            ? chemicalKey(m.chemical)
            : doseKey(m.dose));
      if (!s.gate.needs(key)) continue;
      if (s.id === 'scenario') drawScenarioScreen(s.context, m.scenario);
      else if (s.id === 'chemical') drawChemicalScreen(s.context, m.chemical);
      else drawDoseScreen(s.context, m.dose);
      if (f) drawCelebration(s.context, i, f);
      s.texture.needsUpdate = true;
    }
  };

  const screenOf = (o: Object3D) => screens.find((s) => s.mesh === o);
  const pixel = (uv: Vector2) =>
    [uv.x * SCREEN.w, (1 - uv.y) * SCREEN.h] as const;

  /** What a touch on `object` at `uv` would press, or null. */
  const regionAt = (object: Object3D, uv: Vector2 | undefined) => {
    const s = screenOf(object);
    // Touches wait while a celebration plays over the screens.
    if (!s || !uv || partyFrame()) return null;
    return hitScreen(
      s.id,
      state,
      scenarioScreen(state, host.scenario(), host.caption(), host.titles),
      ...pixel(uv),
    );
  };

  /** DOSE, the dose screen's button: the engine's dose, then both picks afresh. */
  const pressDose = () => {
    if (host.dose(chosenTank(state), state.size)) {
      host.sound?.('dose');
      state = afterDose(state);
    } else host.sound?.('dose-refused');
  };

  /** A press on region `id`, from a touch or a script. */
  const pressRegion = (id: string) => {
    const before = state;
    const r = pressConsole(state, id, host.titles.length);
    state = r.state;
    glow = PRESS_GLOW;
    if (r.effect?.type === 'dose') pressDose();
    else {
      if (r.effect) host.effect(r.effect);
      host.sound?.(pressSound(id, before, r.state, r.effect));
    }
    draw();
  };

  draw();
  return {
    group,
    /** The meshes that take touches. */
    touchables: screens.map((s) => s.mesh) as Object3D[],
    get state() {
      return state;
    },
    /** A touch on screen `object` at `uv`: whether it did anything. */
    touch(object: Object3D, uv?: Vector2) {
      const id = regionAt(object, uv);
      if (!id) return false;
      pressRegion(id);
      return true;
    },
    /** Press a region by its id, as a touch on it would (for checks and scripts). */
    press(id: string) {
      pressRegion(id);
    },
    /** Whether a touch there would do anything (the crosshair). */
    aimed(object: Object3D, uv?: Vector2) {
      return regionAt(object, uv) !== null;
    },
    /** Whether a celebration or commiseration is playing. */
    get celebrating() {
      return partyFrame() !== null;
    },
    /** Play a celebration (won) or commiseration (lost) from its start (the dev room's demonstrations). */
    celebrate(kind: CelebrationKind) {
      party = { kind, t: 0 };
      draw();
    },
    /** Set the console's state (the dev room's demonstrations). */
    set(next: Partial<ConsoleState>) {
      state = { ...state, ...next };
      draw();
    },
    update(dt: number) {
      if (party) {
        party.t += dt;
        if (!partyFrame()) party = null;
      }
      if (glow > 0) {
        glow -= dt;
        if (glow <= 0) state = releaseConsole(state);
      }
      draw();
    },
  };
}

export type DosingConsole = ReturnType<typeof createDosingConsole>;

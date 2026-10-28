import { computed, signal } from '@preact/signals-core';
import {
  AmbientLight,
  DirectionalLight,
  Group,
  Mesh,
  NeutralToneMapping,
  OrthographicCamera,
  PointLight,
  Raycaster,
  Scene,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import { createPartSet, pushButton } from '../../components/core/parts/parts';
import { listenMenu } from '../../controls/input/menu-input';
import { menuStep } from '../../controls/logic/menu-navigation';
import type { MenuTarget } from '../../controls/logic/menu-navigation';
import { useEnvironment } from '../../components/core/parts/render-style';
import {
  createPanelKit,
  kitGlow,
} from '../../components/core/views/eighties-controls';
import { createEngravedPlate } from '../../components/core/views/plant-signs';
import { withLetteringScale } from '../../components/core/views/lettering-resolution';
import { DESK_VIEW } from '../logic/iso-view';
import { CONFIRM_WINDOW } from '../logic/settings-panel';
import { layoutTitleBox, titlePress } from '../logic/title-box';
import type { TitleAction } from '../logic/title-box';
import { createMachinedMetal, polishParts } from './machined-metal';
import { markFrontCentre } from '../../components/core/audio/front-centre';
import {
  BEVEL,
  PLATE,
  fastenAt,
  plateGeometry,
  rackPaints,
} from './settings-panel-view';

/**
 * The title's menu as a Penfold box (mission 096, stage 2, the
 * default since 2026-10-28; the owner): one machined plate in the bottom
 * left of the screen, four illuminated push buttons in a column, each with
 * its engraved legend to its right, laid out on the rack grid
 * (`title-box.ts`), over the title's low-resolution attract sequence,
 * which plays on behind it untouched. Its canvas covers only the box, so
 * the rest of the title takes its own clicks. Lit and finished as the
 * settings panel is (machined metal, two lamps that lean after the
 * pointer); drawn only on change. NEW GAME lights and asks to be pressed
 * again when there is a save it would overwrite (for 3 s); CONTINUE is lit
 * when there is a save and refuses when there is none. A press is also the
 * gesture that lets the browser start sound.
 */

/** The box's scale on screen, CSS pixels a millimetre, and its margin from the corner. */
const SCALE = 1.7;
const CORNER = 24;

export interface TitleOverlayActions {
  newGame(): void;
  continueGame(): void;
  canContinue(): boolean;
  settings(): void;
  instructions(): void;
  /** Whether something (the settings panel) is open over the title. */
  covered?(): boolean;
}

export function createTitleOverlay(actions: TitleOverlayActions) {
  const layout = layoutTitleBox();
  const canvas = document.createElement('canvas');
  canvas.className = 'title-menu-panel';
  Object.assign(canvas.style, {
    position: 'fixed',
    left: `${CORNER}px`,
    bottom: `${CORNER}px`,
    zIndex: '45',
    display: 'none',
    touchAction: 'none',
  });
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.01, 4);
  scene.add(new AmbientLight('#f4f6ff', 0.35));
  const fill = new DirectionalLight('#fff8ee', 0.8);
  fill.position.set(-0.4, 0.8, 1);
  scene.add(fill);
  const rig = new Group();
  const warm = new PointLight('#fff1dc', 0.3, 0, 2);
  warm.position.set(-0.2, 0.18, -0.5);
  const cool = new PointLight('#e8f0ff', 0.18, 0, 2);
  cool.position.set(0.24, 0.08, -0.55);
  rig.add(warm, cool);
  camera.add(rig);
  scene.add(camera);
  const lean = new Vector3();

  // ---- The box ---------------------------------------------------------------
  const saved = signal(false);
  const armed = signal(false);
  let armedTimer: ReturnType<typeof setTimeout> | undefined;
  const armedPlates: Object3D[] = [];
  /** The buttons the focus can rest on (keyboard and gamepad), each ringed while it has it. */
  const targets: (MenuTarget & {
    ring: Object3D;
    use: (direction?: number) => void;
  })[] = [];
  let focused: string | null = null;
  const showFocus = (id: string | null) => {
    focused = id;
    for (const t of targets) t.ring.visible = t.id === id;
    requestDraw();
  };
  const kit = createPanelKit();
  const parts = createPartSet();
  const box = new Group();
  box.name = 'Title menu box';
  // Its buttons are heard front centre, not in a room.
  markFrontCentre(box);
  scene.add(box);
  const { width: W, height: H } = layout;
  const run = (id: TitleAction) => {
    const what = titlePress(id, { saved: saved.peek(), armed: armed.peek() });
    if (what === 'refuse') return;
    if (what === 'arm') {
      armed.value = true;
      clearTimeout(armedTimer);
      armedTimer = setTimeout(() => {
        armed.value = false;
        requestDraw();
      }, CONFIRM_WINDOW);
      requestDraw();
      return;
    }
    armed.value = false;
    clearTimeout(armedTimer);
    actions[id]();
  };
  withLetteringScale(3, () => {
    const paints = rackPaints(kit);
    const metal = createMachinedMetal(kit);
    const plate = new Mesh(plateGeometry(W, H), metal.plate(2, 5));
    plate.position.z = -BEVEL;
    box.add(plate);
    const face = new Group();
    face.position.z = PLATE;
    box.add(face);
    fastenAt(paints, face, W, H);
    const partsFrom = kit.materials.length;
    const ringPaint = kitGlow(kit, '#ffb43a');
    for (const cell of layout.cells) {
      const item = cell.item!;
      const x = cell.x + cell.w / 2 - W / 2;
      const y = H / 2 - (cell.y + cell.h / 2);
      const id = item.option.id;
      if (item.kind === 'button') {
        const lamp =
          id === 'newGame'
            ? armed
            : id === 'continueGame'
              ? saved
              : computed(() => false);
        const button = parts.add(
          pushButton(kit, {
            name: item.option.legend,
            colour: item.option.colour,
            head: 'illuminated',
            lamp,
            action: () => run(id),
          }),
        );
        button.object.position.set(x, y, 0);
        face.add(button.object);
        const ring = new Mesh(
          new TorusGeometry(0.0225, 0.0011, 6, 48),
          ringPaint,
        );
        ring.position.set(x, y, 0.0006);
        ring.visible = false;
        ring.raycast = () => {};
        face.add(ring);
        targets.push({
          id,
          x: cell.x + cell.w / 2,
          y: cell.y + cell.h / 2,
          ring,
          use: [...button.uses.values()][0],
        });
      } else {
        const legend = (text: string) => {
          const plate = createEngravedPlate(kit, [text], {
            width: cell.w - 0.006,
            height: 0.02,
          });
          plate.position.set(x, y, 0);
          face.add(plate);
          return plate;
        };
        legend(item.option.legend);
        if (id === 'newGame') {
          // Asked to be pressed again: a red plate over it, while armed.
          const again = createEngravedPlate(kit, ['PRESS AGAIN'], {
            colour: 'red',
            width: cell.w - 0.006,
            height: 0.02,
          });
          again.position.set(x, y, 0.0006);
          face.add(again);
          again.visible = false;
          armedPlates.push(again);
        }
      }
    }
    polishParts(kit, new Set([paints.well, paints.slot]), partsFrom);
  });

  // ---- Drawing, only on change -------------------------------------------------
  let renderer: WebGLRenderer | null = null;
  let freeEnvironment: (() => void) | null = null;
  let open = false;
  let raf = 0;
  let last = 0;
  let settle = 0;
  function requestDraw(seconds = 0.6) {
    settle = Math.max(settle, seconds);
    if (!open || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function frame(now: number) {
    raf = 0;
    if (!open || !renderer) return;
    const delta = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    for (const plate of armedPlates) plate.visible = armed.peek();
    parts.update(delta);
    rig.position.lerp(lean, Math.min(1, delta * 5));
    const moving = rig.position.distanceToSquared(lean) > 1e-8;
    renderer.render(scene, camera);
    settle -= delta;
    if (moving || settle > 0) raf = requestAnimationFrame(frame);
  }

  const place = () => {
    const scale = Math.min(
      SCALE,
      (innerWidth - 2 * CORNER) / (W * 1000),
      (innerHeight * 0.6) / (H * 1000),
    );
    const pad = 0.006;
    const cssW = Math.round((W + 2 * pad) * 1000 * scale);
    const cssH = Math.round(
      (H * Math.cos(DESK_VIEW.pitch) + 2 * pad) * 1000 * scale,
    );
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    renderer!.setSize(cssW, cssH, false);
    const halfW = cssW / 2 / (scale * 1000);
    const halfH = cssH / 2 / (scale * 1000);
    Object.assign(camera, {
      left: -halfW,
      right: halfW,
      top: halfH,
      bottom: -halfH,
    });
    camera.updateProjectionMatrix();
    const toward = new Vector3(
      0,
      Math.sin(DESK_VIEW.pitch),
      Math.cos(DESK_VIEW.pitch),
    );
    camera.position.copy(toward);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  };

  // ---- Pointer ------------------------------------------------------------------
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const pick = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    for (const hit of raycaster.intersectObject(box, true))
      for (let o: Object3D | null = hit.object; o; o = o.parent) {
        const use = parts.uses.get(o);
        if (use) return use;
      }
    return null;
  };
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    showFocus(null);
    const use = pick(event);
    if (use) {
      use(1);
      requestDraw();
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    lean.set(
      ((event.clientX - rect.left) / rect.width - 0.5) * 0.3,
      -((event.clientY - rect.top) / rect.height - 0.5) * 0.2,
      0,
    );
    requestDraw(0.05);
  });
  canvas.addEventListener('pointerleave', () => {
    lean.set(0, 0, 0);
    requestDraw(0.05);
  });
  const onResize = () => {
    if (!open) return;
    place();
    requestDraw();
  };
  addEventListener('resize', onResize);

  // Keyboard and gamepad, through the control scheme's menu input: the
  // arrows, d-pad or stick move the ring between the buttons; Enter, Space
  // or A press the one ringed, as a click would.
  const stopListening = listenMenu({
    intent(intent) {
      if (!open || actions.covered?.()) return false;
      const step = menuStep(targets, focused, intent);
      if (step.kind === 'focus') showFocus(step.id);
      else if (step.kind === 'press') {
        showFocus(step.id);
        targets.find((t) => t.id === step.id)?.use(1);
      } else return false;
      return true;
    },
  });

  return {
    show() {
      if (!renderer) {
        renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 3));
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = NeutralToneMapping;
        freeEnvironment = useEnvironment(renderer, scene, 0.6);
      }
      saved.value = actions.canContinue();
      armed.value = false;
      open = true;
      canvas.style.display = 'block';
      place();
      requestDraw(1);
    },
    hide() {
      open = false;
      canvas.style.display = 'none';
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    get isOpen() {
      return open;
    },
    dispose() {
      this.hide();
      stopListening();
      removeEventListener('resize', onResize);
      parts.dispose();
      for (const m of kit.materials) m.dispose();
      for (const t of kit.textures) t.dispose();
      freeEnvironment?.();
      renderer?.dispose();
      canvas.remove();
    },
  };
}

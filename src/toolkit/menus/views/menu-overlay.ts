import { effect } from '@preact/signals-core';
import {
  AmbientLight,
  DirectionalLight,
  NeutralToneMapping,
  OrthographicCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import { knobDirection } from '../../controls/input/knob-turning';
import { useEnvironment } from '../../components/core/parts/render-style';
import { settings } from '../../settings/settings-store';
import {
  DESK_VIEW,
  clampScroll,
  fitPanel,
  scrollRange,
} from '../logic/iso-view';
import { layoutPanel } from '../logic/panel-layout';
import { settingsPanel } from '../logic/settings-panel';
import { buildSettingsPanel } from './settings-panel-view';
import type {
  SettingsPanelActions,
  SettingsPanelView,
} from './settings-panel-view';

/**
 * The settings menu as a full-screen instrument panel over the game
 * (mission 096, stage 0, behind `?menu=panel`): its own transparent canvas
 * and WebGL renderer, at the device's pixel ratio (not the render
 * quality's), so its lettering stays crisp however coarse the room behind
 * is drawn; an orthographic desk view of the panel (`iso-view.ts`), which
 * scrolls when the panel is taller than the screen. It does not pause the
 * game (the owner, 2026-10-27: the game is a simulation tied to time; the
 * room behind keeps running). It draws only on change: input, a setting
 * changing, a part easing or a meter's needle swinging, then stops.
 */

export interface MenuOverlayStats {
  /** Frames drawn since it was opened, and the last frame's draw calls and cost. */
  frames: number;
  calls: number;
  triangles: number;
  textures: number;
  geometries: number;
  frameMs: number;
  /** The slowest frame since opening, milliseconds (the panel's update and draw). */
  worstMs: number;
  /** How long the last build of the panel took, milliseconds. */
  buildMs: number;
}

export function createMenuOverlay({
  actions,
  bindings,
  touchHelp,
  build,
  development,
  canOpen,
}: {
  actions: Omit<SettingsPanelActions, 'resume'>;
  bindings: readonly (readonly [string, string, string])[];
  touchHelp: string;
  build: string;
  development: boolean;
  /** Whether Esc may open it now (in a room, the console up, …). */
  canOpen: () => boolean;
}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'menu-overlay';
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '1050',
    // The room behind, dimmed, as the DOM menu's backdrop dims it.
    background: 'rgba(8, 10, 12, 0.5)',
    touchAction: 'none',
    display: 'none',
  });
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);

  let renderer: WebGLRenderer | null = null;
  let freeEnvironment: (() => void) | null = null;
  const scene = new Scene();
  scene.add(new AmbientLight('#f4f6ff', 0.75));
  const key = new DirectionalLight('#fff8ee', 1.7);
  key.position.set(-0.4, 0.8, 1);
  scene.add(key);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.01, 4);
  const raycaster = new Raycaster();

  const stats: MenuOverlayStats = {
    frames: 0,
    calls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
    frameMs: 0,
    worstMs: 0,
    buildMs: 0,
  };
  let panel: SettingsPanelView | null = null;
  let builtFor = '';
  let panelHeight = 0;
  let ppm = 1000;
  let scroll = 0;
  let range = 0;
  let open = false;

  // ---- Drawing, only on change --------------------------------------------
  let raf = 0;
  let last = 0;
  let settle = 0;
  const requestDraw = (seconds = 0.6) => {
    settle = Math.max(settle, seconds);
    if (!open || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  function frame(now: number) {
    raf = 0;
    if (!open || !renderer || !panel) return;
    const delta = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    const t0 = performance.now();
    const moving = panel.update(delta);
    renderer.render(scene, camera);
    const ms = performance.now() - t0;
    const info = renderer.info;
    Object.assign(stats, {
      frames: stats.frames + 1,
      calls: info.render.calls,
      triangles: info.render.triangles,
      textures: info.memory.textures,
      geometries: info.memory.geometries,
      frameMs: ms,
      worstMs: Math.max(stats.worstMs, ms),
    });
    settle -= delta;
    if (moving || settle > 0) raf = requestAnimationFrame(frame);
  }

  // ---- The view -------------------------------------------------------------
  const place = () => {
    const w = innerWidth;
    const h = innerHeight;
    renderer!.setSize(w, h, false);
    const halfW = w / 2 / ppm;
    const halfH = h / 2 / ppm;
    Object.assign(camera, {
      left: -halfW,
      right: halfW,
      top: halfH,
      bottom: -halfH,
    });
    camera.updateProjectionMatrix();
    range = scrollRange(panelHeight, h, ppm / 1000);
    scroll = clampScroll(scroll, range);
    const cos = Math.cos(DESK_VIEW.pitch);
    // The top of the panel at the top of the screen, less the margin,
    // scrolled down its face; centred when it fits.
    const targetY =
      range > 0 ? panelHeight / 2 + 16 / ppm / cos - halfH / cos - scroll : 0;
    const target = new Vector3(0, targetY, 0);
    const toward = new Vector3(
      Math.sin(DESK_VIEW.yaw) * Math.cos(DESK_VIEW.pitch),
      Math.sin(DESK_VIEW.pitch),
      Math.cos(DESK_VIEW.yaw) * Math.cos(DESK_VIEW.pitch),
    );
    camera.position.copy(target).addScaledVector(toward, 1);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    camera.updateMatrixWorld();
  };

  const rebuild = () => {
    const t0 = performance.now();
    const fit = fitPanel(innerWidth);
    const key = `${fit.panelWidth}`;
    ppm = fit.pixelsPerMillimetre * 1000;
    if (key !== builtFor || !panel) {
      if (panel) {
        scene.remove(panel.group);
        panel.dispose();
      }
      const zones = settingsPanel({
        inGame: true,
        noclip: !!actions.noclip,
        copyLink: !!actions.copyCamera,
        devPanel: !!actions.devPanel,
        quitToDesktop: !!actions.quitToDesktop,
      });
      const layout = layoutPanel(zones, fit.panelWidth, {
        cardLines: bindings.length + 2,
      });
      panelHeight = layout.height;
      panel = buildSettingsPanel(layout, {
        actions: { ...actions, resume: () => close() },
        bindings,
        touchHelp,
        build,
        development,
        onChange: () => requestDraw(),
      });
      scene.add(panel.group);
      builtFor = key;
      stats.buildMs = performance.now() - t0;
    }
    place();
  };

  // ---- Opening and closing -----------------------------------------------------
  function openMenu() {
    if (open) return;
    if (!renderer) {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 3));
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = NeutralToneMapping;
      freeEnvironment = useEnvironment(renderer, scene, 0.35);
    }
    document.exitPointerLock?.();
    open = true;
    canvas.style.display = 'block';
    stats.frames = 0;
    stats.worstMs = 0;
    rebuild();
    requestDraw(1);
  }
  function close() {
    if (!open) return;
    open = false;
    canvas.style.display = 'none';
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // The settings may change elsewhere (the DOM menu, another tab): redraw.
  const stopSettings = effect(() => {
    void settings.value;
    requestDraw();
  });
  const onResize = () => {
    if (!open) return;
    rebuild();
    requestDraw();
  };
  addEventListener('resize', onResize);

  // ---- Pointer: picking and scrolling -------------------------------------------
  const ndc = new Vector2();
  const pick = (
    event: PointerEvent,
  ): [Object3D, (d?: number) => void, Vector3] | null => {
    if (!panel) return null;
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(panel.group, true);
    for (const hit of hits) {
      for (let o: Object3D | null = hit.object; o; o = o.parent) {
        const use = panel.parts.uses.get(o);
        if (use) return [o, use, hit.point];
      }
    }
    return null;
  };
  let drag: { id: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const hit = pick(event);
    if (hit) {
      const [object, use, point] = hit;
      use(knobDirection(object, point, camera));
      requestDraw();
      return;
    }
    drag = { id: event.pointerId, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    scrollBy(-(event.clientY - drag.y));
    drag.y = event.clientY;
  });
  const endDrag = () => (drag = null);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      scrollBy(event.deltaY);
    },
    { passive: false },
  );
  function scrollBy(cssPixels: number) {
    const before = scroll;
    scroll = clampScroll(
      scroll + cssPixels / ppm / Math.cos(DESK_VIEW.pitch),
      range,
    );
    if (scroll === before) return;
    place();
    requestDraw(0.05);
  }

  // ---- Keys: Esc opens and closes it; the game hears nothing while it is open.
  // (Stage 1 moves this into the control scheme's menu input.)
  const onKey = (event: KeyboardEvent) => {
    if (!open) {
      if (
        event.type === 'keydown' &&
        event.key === 'Escape' &&
        !document.pointerLockElement &&
        canOpen()
      ) {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    if (event.type === 'keydown' && event.key === 'Escape') {
      event.preventDefault();
      close();
    }
    event.stopImmediatePropagation();
  };
  addEventListener('keydown', onKey, true);
  addEventListener('keyup', onKey, true);

  return {
    open: openMenu,
    close,
    get isOpen() {
      return open;
    },
    stats,
    /** For measuring: draw one frame now, as an input would. */
    redraw: () => requestDraw(0.01),
    dispose() {
      close();
      stopSettings();
      removeEventListener('resize', onResize);
      removeEventListener('keydown', onKey, true);
      removeEventListener('keyup', onKey, true);
      panel?.dispose();
      freeEnvironment?.();
      renderer?.dispose();
      canvas.remove();
    },
  };
}

export type MenuOverlay = ReturnType<typeof createMenuOverlay>;

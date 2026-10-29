import {
  BufferGeometry,
  ExtrudeGeometry,
  Mesh,
  PlaneGeometry,
  Shape,
  Vector2,
  Vector3,
} from 'three';
import {
  BLOCK_THEME,
  BOOT_HZ,
  BootGroup,
  BootScreen,
  UiRoot,
} from '../../../../ui2d';
import type {
  BootPhase,
  BootScreenOptions,
  Theme,
  UiNode,
  UiSound,
} from '../../../../ui2d';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { createPs1Material } from '../../core/parts/ps1-material';
import { beginPart } from '../../core/parts/parts';
import { partAudio } from '../../core/audio/part-audio';
import type { SoundRecipe } from '../../core/audio/part-audio';
import { touchPoint } from '../../../controls/input/touch-point';
import { synthTouchSound } from '../../sound/audio/touch-bleeps';
import {
  bend,
  cornerRadius,
  frameTouch,
  unbend,
  outlineAround,
  screenCornerRadius,
  planeToPixel,
  uvToPixel,
} from '../logic/touch-surface';
import type { Point2, ScreenRect } from '../logic/touch-surface';

/**
 * A touch surface (mission 093): generic tools for putting 2D controls in
 * the 3D world, for any `ui2d` tree in any theme. A flat black backing
 * frame of any outline (a rectangle, a rounded one, a trapezium, a raked
 * console top, an L, any polygon, convex or concave; or a curved strip)
 * with one or more rectangular screens set into it, each inside a bezel
 * of frame (4 mm a side by default, 0 for none). The screens lie in the
 * frame's own face, coplanar with it, and are drawn over it by their
 * render order and a polygon offset on their material, never by being
 * nudged forward. Each screen hosts a `ui2d` tree on a canvas texture,
 * repainted only when the tree says it has changed.
 *
 * A use on a screen (the one control scheme's: a click, E, a tap, A) is a
 * touch where it landed: from the hit's texture coordinates
 * (`touchPoint`), or, on a flat surface, from the hit's point in the
 * frame's plane; it goes to that screen's tree as a tap at its pixel, and
 * the tree's sounds are played from the screen, as the game's touch
 * bleeps or the surface's own (`sounds`).
 *
 * In metres, the frame's face at z = 0 facing +z, its body `depth` behind;
 * the frame's own coordinates have x right and y up from its origin.
 */

/** The panels' lettering, Antonio (SIL Open Font Licence; `CREDITS.md`), loaded once. */
const FONT = 'Antonio';
const waiting = new Set<() => void>();
let fontReady = false;
let fontAsked = false;
function whenFont(redraw: () => void) {
  if (fontReady) return;
  waiting.add(redraw);
  if (
    fontAsked ||
    typeof document === 'undefined' ||
    typeof FontFace === 'undefined'
  )
    return;
  fontAsked = true;
  const face = new FontFace(
    FONT,
    `url(${new URL('../../core/assets/fonts/Antonio-Variable.ttf', import.meta.url).href})`,
    { weight: '100 700' },
  );
  void face
    .load()
    .then((loaded) => {
      document.fonts.add(loaded);
      fontReady = true;
      for (const r of waiting) r();
      waiting.clear();
    })
    .catch(() => {});
}

/** The most a screen repaints a second on its own (a touch repaints at once); while booting, `BOOT_HZ`. */
export const PAINT_HZ = 10;

const bootGroups = new WeakMap<PanelKit, BootGroup>();

/**
 * The boot of every touch screen made with `kit` (a room's): each screen
 * is run through a `BootScreen` (on until booted; the owner, 2026-10-27),
 * so a room can boot them all at scattered offsets (`bootAll`), skip them
 * (`skipAll`), or boot each as it is built (`autoBoot`).
 */
export function bootGroupOf(kit: PanelKit): BootGroup {
  let group = bootGroups.get(kit);
  if (!group) {
    group = new BootGroup();
    bootGroups.set(kit, group);
  }
  return group;
}

/** Told of a boot phase reached by a screen made with a kit: the phase, the screen, and whether it is the room's main one (booting last, `lastAfter`). */
export type BootPhaseListener = (
  phase: BootPhase,
  screen: Mesh,
  main: boolean,
) => void;

const bootListeners = new WeakMap<PanelKit, BootPhaseListener>();

/**
 * Hear the boot of every touch screen made with `kit` from now on (a
 * room's, to make its own boot sounds; the owner, 2026-10-27): each phase
 * a screen ticks through, never a skip or an instant power-up.
 */
export function onBootPhase(kit: PanelKit, listener: BootPhaseListener | null) {
  if (listener) bootListeners.set(kit, listener);
  else bootListeners.delete(kit);
}

export interface TouchScreenSpec {
  /** Its opening in the frame, metres. */
  rect: ScreenRect;
  tree: UiNode;
  theme?: Theme;
  /** Pixels a metre on its canvas (capped at 2048 a side). */
  pixelsPerMetre?: number;
  /** Its boot (`BootScreen`; on until the kit's `bootGroupOf` boots it), or false for a screen that never boots. */
  boot?: BootScreenOptions | false;
}

export interface TouchSurfaceOptions {
  screens: readonly TouchScreenSpec[];
  /** The frame's outline in its plane; by default a rectangle round the screens and their bezels. */
  outline?: readonly Point2[];
  /** The frame left round each screen, metres (default 4 mm; 0 for bezel-less). */
  bezel?: number;
  /**
   * The default outline's corner radius, metres: by default rounded in
   * proportion to its size (`cornerRadius`), 0 for sharp corners. The
   * screens are rounded to match (`screenCornerRadius`), their pictures
   * clipped to their rounded corners.
   */
  radius?: number;
  /** The screens' corner radius, metres, if not the frame's less its bezel (0 for sharp). */
  screenRadius?: number;
  /** The frame's body behind its face, metres (0 for a bare sheet). */
  depth?: number;
  frameColour?: string;
  /** What its touches sound like, by the sound a press asks for (default: the game's synthesised bleeps, `synthTouchSound`). */
  sounds?: (sound: UiSound) => SoundRecipe | null;
  /** Bend the whole surface round a vertical axis this far in front of it (a curved strip; its outline a rectangle round its screens). */
  curve?: number;
  name?: string;
}

/** A plane `w` × `h` at `(x, y)` in the frame, bent by `curve`, its uvs a plane's. */
function bentPlane(
  r: ScreenRect,
  curve: number | undefined,
  segments: number,
): BufferGeometry {
  const g = new PlaneGeometry(r.w, r.h, curve ? segments : 1, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const b = bend(pos.getX(i) + r.x, curve ?? 0);
    pos.setXYZ(i, b.x, pos.getY(i) + r.y, b.z);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Clears a canvas's corners outside a rounded rectangle of radius `r` pixels, so they are transparent. */
function clipCorners(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  r: number,
) {
  const k = Math.min(r, w / 2, h / 2);
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.rect(0, 0, w, h);
  g.moveTo(k, 0);
  g.arcTo(w, 0, w, h, k);
  g.arcTo(w, h, 0, h, k);
  g.arcTo(0, h, 0, 0, k);
  g.arcTo(0, 0, w, 0, k);
  g.closePath();
  g.fill('evenodd');
  g.restore();
}

export function createTouchSurface(
  kit: PanelKit,
  options: TouchSurfaceOptions,
) {
  const bezel = options.bezel ?? 0.004;
  const depth = options.depth ?? 0.02;
  const a = beginPart(kit, options.name ?? 'Touch surface');
  const group = a.object;
  const frameMaterial = createPs1Material({
    color: options.frameColour ?? '#0a0b0d',
    roughness: 0.5,
  });
  kit.materials.push(frameMaterial);
  const box = outlineAround(
    options.screens.map((s) => s.rect),
    bezel,
  );
  const radius = options.radius ?? cornerRadius(box.w, box.h);
  const around = outlineAround(
    options.screens.map((s) => s.rect),
    bezel,
    radius,
  );
  // The frame: a curved strip as a bent sheet; a flat one any outline, its
  // body extruded behind its face.
  let frameMesh: Mesh;
  if (options.curve) {
    const strip = {
      x: around.centre[0],
      y: around.centre[1],
      w: around.w,
      h: around.h,
    };
    const sheet = new Mesh(bentPlane(strip, options.curve, 48), frameMaterial);
    group.add(sheet);
    frameMesh = sheet;
  } else {
    const outline = options.outline ?? around.outline;
    const shape = new Shape(outline.map(([x, y]) => new Vector2(x, y)));
    const body = new Mesh(
      new ExtrudeGeometry(shape, {
        depth: Math.max(1e-4, depth),
        bevelEnabled: false,
      }),
      frameMaterial,
    );
    body.position.z = -Math.max(1e-4, depth);
    group.add(body);
    frameMesh = body;
  }

  // The surface's clock, seconds, advanced by its updates.
  let seconds = 0;
  const screens = options.screens.map((spec) => {
    const theme = spec.theme ?? BLOCK_THEME;
    const ppm = spec.pixelsPerMetre ?? 800;
    const scale = Math.min(
      1,
      2048 / (Math.max(spec.rect.w, spec.rect.h) * ppm),
    );
    const width = Math.max(16, Math.round(spec.rect.w * ppm * scale));
    const height = Math.max(16, Math.round(spec.rect.h * ppm * scale));
    const { context, texture } = createCanvasTexture(width, height, 'lcars');
    kit.textures.push(texture);
    // Its corners, rounded with the frame's: the picture clipped to them.
    const cornerPx =
      (options.screenRadius ?? screenCornerRadius(radius, bezel, spec.rect)) *
      (width / spec.rect.w);
    const material = createPs1Material(
      cornerPx > 0 ? { map: texture, alphaTest: 0.5 } : { map: texture },
      true,
      true,
    );
    // Coplanar with the frame, drawn over it: pulled forward in depth, not in place.
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -4;
    kit.materials.push(material);
    const mesh = new Mesh(bentPlane(spec.rect, options.curve, 32), material);
    mesh.renderOrder = 2;
    mesh.userData.live = true;
    group.add(mesh);
    // Run through a boot (the owner, 2026-10-27): on until booted.
    const boot =
      spec.boot === false ? null : new BootScreen(spec.tree, spec.boot ?? {});
    if (boot) {
      bootGroupOf(kit).add(boot);
      const main = boot.options.lastAfter !== undefined;
      boot.onPhase = (phase) => bootListeners.get(kit)?.(phase, mesh, main);
    }
    const root = new UiRoot(boot ?? spec.tree, theme, {
      width,
      height,
      onSound: (sound: UiSound) => {
        const recipe = (options.sounds ?? synthTouchSound)(sound);
        if (recipe) partAudio.play(recipe, mesh);
      },
    });
    whenFont(() => spec.tree.markDirty());
    // Repainted, and its texture uploaded, only when its tree says it has
    // changed; its own animations (blinks, moving flows, wandering values)
    // at most `PAINT_HZ` times a second (mission 095: the benchmark of
    // mission 094 found every panel uploading its canvas each frame).
    let painted = -Infinity;
    const repaint = (now = Infinity) => {
      const hz = boot?.booting ? BOOT_HZ : PAINT_HZ;
      if (!root.needsPaint || now - painted < 1 / hz) return;
      painted = Number.isFinite(now) ? now : painted;
      root.paint(context);
      if (cornerPx > 0) clipCorners(context, width, height, cornerPx);
      texture.needsUpdate = true;
    };
    repaint();
    // A boot or a skip shown at once, not only at the room's next frame
    // (the owner, 2026-10-27: after RESET the bridge's displays stayed on,
    // seen from the corridor, until the walker came in).
    if (boot)
      boot.onChange = () => {
        root.tick(seconds);
        repaint();
      };
    const touchPixel = (x: number, y: number) => {
      root.tap(x, y);
      repaint();
    };
    a.uses.set(mesh, () => {
      const t = touchPoint(mesh);
      if (!t) return;
      if (Number.isFinite(t.u) && Number.isFinite(t.v)) {
        const p = uvToPixel(t.u, t.v, width, height);
        touchPixel(p.x, p.y);
      } else if (t.point && !options.curve) {
        const local = group.worldToLocal(
          new Vector3(t.point.x, t.point.y, t.point.z),
        );
        const p = planeToPixel(spec.rect, local.x, local.y, width, height);
        touchPixel(p.x, p.y);
      }
    });
    return { root, mesh, repaint, touchPixel, width, height, boot };
  });

  // A use on the frame within a screen's opening is a touch on that
  // screen: the screens lie in the frame's face, coplanar with it, and a
  // ray may strike the frame first at the same distance (mission 105).
  const rects = options.screens.map((s) => s.rect);
  a.uses.set(frameMesh, () => {
    const t = touchPoint(frameMesh);
    if (!t?.point) return;
    const local = group.worldToLocal(
      new Vector3(t.point.x, t.point.y, t.point.z),
    );
    const x = options.curve ? unbend(local.x, local.z, options.curve) : local.x;
    const hit = frameTouch(rects, x, local.y);
    if (!hit) return;
    const s = screens[hit.screen];
    const p = planeToPixel(rects[hit.screen], hit.x, hit.y, s.width, s.height);
    s.touchPixel(p.x, p.y);
  });

  a.updates.push((delta) => {
    seconds += delta;
    for (const s of screens) {
      s.root.tick(seconds);
      // By the clock, not by the deltas: however often it is updated.
      s.repaint(
        typeof performance === 'undefined' ? seconds : performance.now() / 1000,
      );
    }
  });
  const part = a.part();
  return { part, group, screens, outline: options.outline ?? around.outline };
}

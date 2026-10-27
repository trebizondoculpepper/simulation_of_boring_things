import {
  BufferGeometry,
  ExtrudeGeometry,
  Mesh,
  PlaneGeometry,
  Shape,
  Vector2,
  Vector3,
} from 'three';
import { BLOCK_THEME, UiRoot } from '../../../../ui2d';
import type { Theme, UiNode, UiSound } from '../../../../ui2d';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { createPs1Material } from '../../core/parts/ps1-material';
import { beginPart } from '../../core/parts/parts';
import { partAudio } from '../../core/audio/part-audio';
import { touchPoint } from '../../../controls/input/touch-point';
import { TOUCH_BLEEPS } from '../../sound/audio/touch-bleeps';
import {
  bend,
  outlineAround,
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
 * the tree's sounds are played as the game's touch bleeps from the
 * screen.
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

/** The most a screen repaints a second on its own (a touch repaints at once). */
export const PAINT_HZ = 10;

export interface TouchScreenSpec {
  /** Its opening in the frame, metres. */
  rect: ScreenRect;
  tree: UiNode;
  theme?: Theme;
  /** Pixels a metre on its canvas (capped at 2048 a side). */
  pixelsPerMetre?: number;
}

export interface TouchSurfaceOptions {
  screens: readonly TouchScreenSpec[];
  /** The frame's outline in its plane; by default a rectangle round the screens and their bezels. */
  outline?: readonly Point2[];
  /** The frame left round each screen, metres (default 4 mm; 0 for bezel-less). */
  bezel?: number;
  /** The default outline's corner radius, metres. */
  radius?: number;
  /** The frame's body behind its face, metres (0 for a bare sheet). */
  depth?: number;
  frameColour?: string;
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
  const around = outlineAround(
    options.screens.map((s) => s.rect),
    bezel,
    options.radius ?? 0,
  );
  // The frame: a curved strip as a bent sheet; a flat one any outline, its
  // body extruded behind its face.
  if (options.curve) {
    const strip = {
      x: around.centre[0],
      y: around.centre[1],
      w: around.w,
      h: around.h,
    };
    const sheet = new Mesh(bentPlane(strip, options.curve, 48), frameMaterial);
    group.add(sheet);
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
  }

  const screens = options.screens.map((spec) => {
    const theme = spec.theme ?? BLOCK_THEME;
    const ppm = spec.pixelsPerMetre ?? 800;
    const scale = Math.min(
      1,
      2048 / (Math.max(spec.rect.w, spec.rect.h) * ppm),
    );
    const width = Math.max(16, Math.round(spec.rect.w * ppm * scale));
    const height = Math.max(16, Math.round(spec.rect.h * ppm * scale));
    const { context, texture } = createCanvasTexture(width, height);
    kit.textures.push(texture);
    const material = createPs1Material({ map: texture }, true, true);
    // Coplanar with the frame, drawn over it: pulled forward in depth, not in place.
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -4;
    kit.materials.push(material);
    const mesh = new Mesh(bentPlane(spec.rect, options.curve, 32), material);
    mesh.renderOrder = 2;
    mesh.userData.live = true;
    group.add(mesh);
    const root = new UiRoot(spec.tree, theme, {
      width,
      height,
      onSound: (sound: UiSound) => partAudio.play(TOUCH_BLEEPS[sound], mesh),
    });
    whenFont(() => spec.tree.markDirty());
    // Repainted, and its texture uploaded, only when its tree says it has
    // changed; its own animations (blinks, moving flows, wandering values)
    // at most `PAINT_HZ` times a second (mission 095: the benchmark of
    // mission 094 found every panel uploading its canvas each frame).
    let painted = -Infinity;
    const repaint = (now = Infinity) => {
      if (!root.needsPaint || now - painted < 1 / PAINT_HZ) return;
      painted = Number.isFinite(now) ? now : painted;
      root.paint(context);
      texture.needsUpdate = true;
    };
    repaint();
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
    return { root, mesh, repaint, touchPixel, width, height };
  });

  let seconds = 0;
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

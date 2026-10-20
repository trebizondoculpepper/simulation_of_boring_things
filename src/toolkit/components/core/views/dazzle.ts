import { Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import { click, partAudio } from '../audio/part-audio';
import {
  FLASH_FRAMES,
  bloom,
  ghostLevel,
  ghostSeconds,
  popPattern,
} from '../logic/dazzle';

/** The pop of a bright discharge: a sharp report over a low thump. */
const pop = click({
  band: 1400,
  q: 0.6,
  decay: 0.07,
  level: 0.55,
  thump: [110, 0.09],
});

/**
 * Discharges anywhere: a part that goes off with a flash (a capacitor
 * venting, a part pulled live) says so here, and every room's dazzle that
 * can see it pops. A part need not know which room it is in.
 */
const listeners = new Set<(at: Object3D, strength: number) => void>();
export function discharge(at: Object3D, strength = 1) {
  for (const listen of listeners) listen(at, strength);
}

/**
 * Being dazzled by a bright discharge (`../logic/dazzle.ts`), drawn over
 * a room's canvas: `flash(at)` pops, whites the view out round where `at`
 * is seen, with one to four circles of light blooming out there within
 * three frames, never the same twice (`popPattern`), each leaving a dark,
 * faintly purple afterimage on the screen (it is on the eye, so it does
 * not move as the player looks about), fading over about seven seconds.
 * Many can be on the eye at once. It also pops for every `discharge`
 * anywhere while its canvas is shown. Under reduced motion the flash is
 * only a soft brightening; the afterimages are the same. Call `update`
 * each frame.
 */
export function createDazzle(
  canvas: HTMLCanvasElement,
  camera: Camera,
  random: () => number = Math.random,
  reducedMotion: () => boolean = () => false,
) {
  const layer = document.createElement('div');
  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    overflow: 'hidden',
  });
  canvas.parentElement?.append(layer);
  const glare = document.createElement('div');
  Object.assign(glare.style, {
    position: 'absolute',
    inset: '0',
    opacity: '0',
    mixBlendMode: 'screen',
  });
  layer.append(glare);
  const ghosts: {
    element: HTMLDivElement;
    age: number;
    seconds: number;
    /** Where, in percent of the screen, and how big, in percent of its height. */
    x: number;
    y: number;
    rx: number;
    ry: number;
    turn: number;
  }[] = [];
  /** Where the glare is centred, in percent, and how bright. */
  const glareAt = { x: 50, y: 50, level: 0 };
  /** Circles of light blooming out, each to leave an afterimage. */
  const blooms: {
    element: HTMLDivElement;
    x: number;
    y: number;
    radius: number;
    frame: number;
    frames: number;
  }[] = [];
  let frames = 0;
  const seen = new Vector3();
  const dazzle = {
    /**
     * A discharge at `at` (an object, or a point in the scene): it pops,
     * and dazzles if it is in view. `strength` (0 to 1) sizes it.
     */
    flash(
      at: Object3D | Vector3,
      {
        strength = 1,
        reduced = false,
      }: { strength?: number; reduced?: boolean } = {},
    ) {
      if ('isObject3D' in at) {
        partAudio.play(pop, at);
        at.getWorldPosition(seen);
      } else seen.copy(at);
      seen.project(camera);
      if (seen.z > 1 || Math.abs(seen.x) > 1.2 || Math.abs(seen.y) > 1.2)
        return;
      const x = ((seen.x + 1) / 2) * 100;
      const y = ((1 - seen.y) / 2) * 100;
      glare.style.background = `radial-gradient(circle at ${x}% ${y}%, #ffffff 0%, #f4f8ff 35%, #dfe8ff 100%)`;
      glare.style.opacity = String(reduced ? 0.25 : 0.8 * strength);
      Object.assign(glareAt, { x, y, level: Number(glare.style.opacity) });
      frames = FLASH_FRAMES;
      // Its circles, each blooming out where it is, then leaving its mark.
      const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight) || 1;
      for (const c of popPattern(strength, random)) {
        const element = document.createElement('div');
        Object.assign(element.style, {
          position: 'absolute',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(closest-side, #ffffff, #ffffff 55%, rgba(236, 244, 255, 0.85) 75%, rgba(220, 232, 255, 0) 100%)',
          mixBlendMode: 'screen',
          opacity: reduced ? '0.35' : '1',
        });
        layer.append(element);
        blooms.push({
          element,
          // Across the screen in percent of its width, down in percent of its height.
          x: x + (c.dx * 100) / aspect,
          y: y + c.dy * 100,
          radius: c.radius * 100,
          frame: 0,
          frames: c.frames,
        });
      }
    },
    /** An afterimage where a circle of light was. */
    ghost(x: number, y: number, radius: number) {
      const element = document.createElement('div');
      const ry = radius * (0.8 + 0.2 * random());
      const turn = random() * 180;
      Object.assign(element.style, {
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: `${2 * radius}vh`,
        height: `${2 * ry}vh`,
        transform: `translate(-50%, -50%) rotate(${turn}deg)`,
        borderRadius: '50%',
        background:
          'radial-gradient(closest-side, rgba(14, 6, 24, 0.95), rgba(34, 14, 48, 0.75) 45%, rgba(40, 30, 10, 0.25) 75%, rgba(0, 0, 0, 0) 100%)',
        mixBlendMode: 'multiply',
        filter: 'blur(0.6vh)',
        opacity: '1',
      });
      layer.append(element);
      ghosts.push({
        element,
        age: 0,
        seconds: ghostSeconds(random),
        x,
        y,
        rx: radius,
        ry,
        turn,
      });
    },
    /**
     * Draw what is on the eye now over a picture of the view (`context`,
     * `width` by `height` pixels), much as the page shows it: for
     * development pictures, which take only the canvas.
     */
    paint(context: CanvasRenderingContext2D, width: number, height: number) {
      const px = (x: number) => (x / 100) * width;
      const py = (y: number) => (y / 100) * height;
      const vh = height / 100;
      context.save();
      if (frames > 0) {
        context.globalCompositeOperation = 'screen';
        context.globalAlpha = glareAt.level;
        const g = context.createRadialGradient(
          px(glareAt.x),
          py(glareAt.y),
          0,
          px(glareAt.x),
          py(glareAt.y),
          Math.hypot(width, height),
        );
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, '#f4f8ff');
        g.addColorStop(1, '#dfe8ff');
        context.fillStyle = g;
        context.fillRect(0, 0, width, height);
      }
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'screen';
      for (const b of blooms) {
        const r = b.radius * bloom(Math.max(1, b.frame), b.frames) * vh;
        const g = context.createRadialGradient(
          px(b.x),
          py(b.y),
          0,
          px(b.x),
          py(b.y),
          r,
        );
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.55, '#ffffff');
        g.addColorStop(0.75, 'rgba(236, 244, 255, 0.85)');
        g.addColorStop(1, 'rgba(220, 232, 255, 0)');
        context.fillStyle = g;
        context.fillRect(px(b.x) - r, py(b.y) - r, 2 * r, 2 * r);
      }
      context.globalCompositeOperation = 'multiply';
      for (const ghost of ghosts) {
        context.globalAlpha = Number(ghost.element.style.opacity || 1);
        context.save();
        context.translate(px(ghost.x), py(ghost.y));
        context.rotate((ghost.turn * Math.PI) / 180);
        context.scale(1, ghost.ry / ghost.rx);
        const r = ghost.rx * vh;
        const g = context.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, 'rgba(14, 6, 24, 0.95)');
        g.addColorStop(0.45, 'rgba(34, 14, 48, 0.75)');
        g.addColorStop(0.75, 'rgba(40, 30, 10, 0.25)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = g;
        context.filter = `blur(${0.6 * vh}px)`;
        context.fillRect(-r, -r, 2 * r, 2 * r);
        context.restore();
      }
      context.restore();
    },
    update(delta: number) {
      if (frames > 0 && --frames === 0) glare.style.opacity = '0';
      // Each circle blooms out a frame at a time; out, it leaves its mark.
      for (let i = blooms.length - 1; i >= 0; i--) {
        const b = blooms[i];
        b.frame++;
        if (b.frame > b.frames) {
          b.element.remove();
          blooms.splice(i, 1);
          dazzle.ghost(b.x, b.y, b.radius);
          continue;
        }
        const r = b.radius * bloom(b.frame, b.frames);
        Object.assign(b.element.style, {
          left: `${b.x}%`,
          top: `${b.y}%`,
          width: `${2 * r}vh`,
          height: `${2 * r}vh`,
        });
      }
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const ghost = ghosts[i];
        ghost.age += delta;
        const level = ghostLevel(ghost.age, ghost.seconds);
        ghost.element.style.opacity = level.toFixed(3);
        if (level > 0) continue;
        ghost.element.remove();
        ghosts.splice(i, 1);
      }
    },
    /** Clear the eye at once. */
    clear() {
      frames = 0;
      glare.style.opacity = '0';
      for (const b of blooms) b.element.remove();
      blooms.length = 0;
      for (const ghost of ghosts) ghost.element.remove();
      ghosts.length = 0;
    },
    dispose() {
      listeners.delete(listen);
      layer.remove();
    },
  };
  // Discharges elsewhere: seen only while this room is shown.
  const listen = (at: Object3D, strength: number) => {
    if (canvas.closest('[hidden]')) return;
    dazzle.flash(at, { strength, reduced: reducedMotion() });
  };
  listeners.add(listen);
  return dazzle;
}

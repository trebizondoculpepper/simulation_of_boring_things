import { SCREEN } from '../../../../game/plant/aqualis-types';
import type { OsState } from '../../../../game/plant/aqualis-os';
import { bootFrame } from '../../core/logic/boot-sequence';
import type { BootScript } from '../../core/logic/boot-sequence';
import { drawBootPicture } from '../../core/views/boot-screens';
import type { BootDrawOptions } from '../../core/views/boot-screens';
import { stopKey, stopMoment, stopScreen } from '../../core/logic/stop-screen';
import type { StopOutcome, StopScreen } from '../../core/logic/stop-screen';
import { drawStopScreen } from '../../core/views/stop-screen';
import { glitchMoment, glitchPlan } from '../../core/logic/lcd-glitch';
import { drawLcdGlitch } from '../../core/views/lcd-glitch';
import { defectsAt, defectsKey } from '../logic/lcd-defects';
import { drawDefects } from './lcd-defects';
import { DOCTOR } from '../logic/aqualis-display';
import type { DisplayModel } from '../logic/aqualis-display';
import { drAqualisPose } from '../logic/dr-aqualis';
import type { DrAqualisFrame } from '../logic/dr-aqualis';
import { OVERLAY } from '../logic/aqualis-cabinet';
import { drawAqualisScreen, drawTrioMark } from './aqualis-screens';
import { drawDrAqualis, drawSpeechBubble } from './dr-aqualis';
import type { AqualisCabinet } from './aqualis-cabinet';
import type { LedState } from '../logic/aqualis-cabinet';
import type { Selector } from '../../../../game/plant/aqualis-types';
import type { PiezoOneShot } from '../../sound/logic/piezo-beeps';
import type { BootFrame } from '../../core/logic/boot-sequence';

/**
 * The Dr Aqualis Trio's screen, painted (mission 114): whatever runs it
 * (dev58's rig, or a plant room's Trio in the world) hands it the
 * computer's state, the boot under way and its software's page, and it
 * draws the boot, the blue screen, a glitch's wreckage over the last good
 * frame, or the page with its passing LCD faults; and Dr Aqualis on his
 * overlay. Each is drawn only when its key changes (mission 094).
 */

/** How the Trio's boot screens draw its mark. */
export const TRIO_BOOT_DRAW: BootDrawOptions = { appMark: drawTrioMark };

/** What the screen is painted from now. */
export interface TrioPaintInputs {
  os: OsState;
  /** The boot under way's script, when it is booting. */
  boot: BootScript | null;
  /** Its software's page now, or null where there is none to draw. */
  model: () => DisplayModel | null;
  /** Real seconds, for its LCD's passing faults. */
  clock: number;
  /** How a stop screen ends: hang until power-cycled, by default. */
  stopOutcome?: StopOutcome['kind'];
}

/** A canvas to keep the last good frame in, where there is a DOM. */
function frameCopy(w: number, h: number) {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    return ctx
      ? { canvas, ctx: ctx as unknown as CanvasRenderingContext2D }
      : null;
  }
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  return ctx ? { canvas, ctx } : null;
}

/** Its software's page, drawn (Dr Aqualis himself is on his overlay). */
export function drawTrioPage(c: CanvasRenderingContext2D, m: DisplayModel) {
  drawAqualisScreen(c, m, {
    bubble: (ctx, text, box, tail) =>
      drawSpeechBubble(ctx, text.split('\n'), box, tail, {
        title: 'Dr Aqualis says',
        fontPx: 19,
      }),
  });
}

export function createTrioPainter() {
  let drawn = '';
  let goodOnScreen = false;
  let stopShown: StopScreen | null = null;
  let wreck: ReturnType<typeof frameCopy> = null;
  let crashSeen: unknown = null;
  let lastPage: string | null = null;
  let doctorAtCrash = false;
  let doctorCanvas: CanvasImageSource | null = null;
  let doctor: DrAqualisFrame | null = null;
  let doctorDrawn = '';

  const drawGlitch = (
    c: CanvasRenderingContext2D,
    crashSeed: number,
    t: number,
  ) => {
    const g = glitchMoment(crashSeed, t);
    const key = `glitch:${crashSeed}:${g.key}`;
    if (key === drawn) return false;
    if (!drawn.startsWith('glitch:')) {
      // The crash's first frame: keep the screen as it was, Dr Aqualis drawn in.
      if (!wreck) {
        wreck = frameCopy(SCREEN.w, SCREEN.h);
        if (wreck) wreck.ctx.drawImage(c.canvas, 0, 0);
      }
      if (wreck && doctorAtCrash && doctorCanvas)
        wreck.ctx.drawImage(
          doctorCanvas,
          OVERLAY.x,
          OVERLAY.y,
          OVERLAY.w,
          OVERLAY.h,
        );
    }
    drawn = key;
    goodOnScreen = false;
    drawLcdGlitch(
      c,
      wreck?.canvas ?? c.canvas,
      glitchPlan(crashSeed, g.burst, g.frame, SCREEN),
    );
    return true;
  };

  return {
    /** Its software started afresh (a boot, a power cut): nothing of the last kept. */
    reset() {
      drawn = '';
      doctorDrawn = '';
      goodOnScreen = false;
      stopShown = null;
      wreck = null;
      crashSeen = null;
      lastPage = null;
    },
    /** Draw the screen if it needs it: whether it drew. */
    draw(c: CanvasRenderingContext2D, i: TrioPaintInputs): boolean {
      // Off, its backlight is out (the cabinet's `setPower`): nothing to draw.
      if (!i.os.powered) return false;
      const crash = i.os.crash;
      if (crash && crash !== crashSeen) {
        // As it crashed: what was on show, and (nothing good drawn yet) what
        // its software would have shown, the wreck's source.
        crashSeen = crash;
        doctorAtCrash = lastPage === 'doctor';
        wreck = null;
        stopShown = null;
        if (!goodOnScreen) {
          const m = i.model();
          if (m) {
            wreck = frameCopy(SCREEN.w, SCREEN.h);
            if (wreck) drawTrioPage(wreck.ctx, m);
          }
        }
      }
      if (i.os.boot && i.boot) {
        const f = bootFrame(i.boot, i.os.boot.t);
        const key = `boot:${f.pictureKey}`;
        if (key === drawn) return false;
        drawn = key;
        goodOnScreen = false;
        drawBootPicture(c, f, SCREEN.w, SCREEN.h, TRIO_BOOT_DRAW);
        return true;
      }
      if (crash?.kind === 'stop') {
        stopShown ??= stopScreen(crash.seed, {
          outcome: crash.outcome ?? i.stopOutcome ?? 'hang',
        });
        const key = `stop:${stopKey(stopShown, crash.t)}`;
        if (key === drawn) return false;
        drawn = key;
        goodOnScreen = false;
        drawStopScreen(c, stopMoment(stopShown, crash.t));
        return true;
      }
      if (crash?.kind === 'glitch') return drawGlitch(c, crash.seed, crash.t);
      const m = i.model();
      if (!m) return false;
      lastPage = m.page;
      const faults = defectsAt(i.clock, SCREEN.w, SCREEN.h);
      const key = m.key + defectsKey(faults);
      if (key === drawn) return false;
      drawn = key;
      drawTrioPage(c, m);
      drawDefects(c, faults);
      goodOnScreen = true;
      return true;
    },
    /** Draw Dr Aqualis on his overlay (pre-scaled to its box) if his pose changed: whether it drew. */
    drawDoctor(
      c: CanvasRenderingContext2D,
      w: number,
      h: number,
      m: DisplayModel,
      clock: number,
    ): boolean {
      doctorCanvas = c.canvas;
      const a = m.doctor.advice;
      const box = DOCTOR.him;
      doctor = drAqualisPose(a?.mood ?? 'idle', clock, doctor, {
        box,
        target: { x: DOCTOR.bubble.x + 40, y: DOCTOR.bubble.y + 60 },
      });
      if (doctor.key === doctorDrawn) return false;
      doctorDrawn = doctor.key;
      c.clearRect(0, 0, w, h);
      drawDrAqualis(c, doctor.pose, { x: 0, y: 0, w: box.w, h: box.h });
      return true;
    },
  };
}

/** What a cabinet is driven from each frame, whoever runs it (dev58's host, a room's world host). */
export interface CabinetDriver {
  takeBeeps(): PiezoOneShot[];
  selector(): Selector;
  leds(): LedState;
  powered(): boolean;
  booting(): boolean;
  sampleLh(): number;
  crashed(): boolean;
  os(): OsState;
  drawScreen(c: CanvasRenderingContext2D): boolean;
  bootFrame(): BootFrame | null;
  doctorShown(): boolean;
  drawDoctor(c: CanvasRenderingContext2D, w: number, h: number): boolean;
  /** Its own power switch's position, where its driver keeps it. */
  mainSwitchOn?(): boolean;
  /** Its sample inlet valve, where its driver keeps it. */
  sampleValveOpen?(): boolean;
}

/**
 * Drive a cabinet one frame from its driver (dev58 and the plant rooms
 * alike): its boot's beeps, its knob, lamps, sample pump and power, its
 * piezo on a crash, its screen, its boot's live element and Dr Aqualis.
 * Returns the crash the piezo has answered, for the next frame.
 */
export function driveCabinet(
  cabinet: AqualisCabinet,
  d: CabinetDriver,
  beeperCrash: unknown,
): unknown {
  for (const b of d.takeBeeps()) cabinet.beep(b);
  cabinet.setSelector(d.selector());
  cabinet.setLeds(d.leds());
  if (d.mainSwitchOn && d.mainSwitchOn() !== cabinet.mainSwitchOn)
    cabinet.setMainSwitch(d.mainSwitchOn());
  if (d.sampleValveOpen && d.sampleValveOpen() !== cabinet.sampleValveOpen)
    cabinet.setSampleValve(d.sampleValveOpen());
  // Its sample pump runs once its computer is up (the owner, 2026-10-31):
  // not while it is off or booting.
  cabinet.setSampleFlow(d.powered() && !d.booting() ? d.sampleLh() : 0);
  cabinet.setPower(d.powered());
  // Its piezo (the owner, 2026-10-31): a blue screen gives one failure
  // beep and falls silent; a glitch beeps like a PC/XT's keyboard buffer
  // full, on and on, until its power goes.
  const crash = d.crashed() ? d.os().crash : null;
  if (crash !== beeperCrash && crash?.kind === 'stop') cabinet.beep('deny');
  cabinet.beepLoop(
    crash?.kind === 'glitch' && d.powered() ? 'buffer-full' : null,
  );
  if (d.drawScreen(cabinet.context)) cabinet.screenChanged();
  // Its boot's live element, on its own small canvas over the screen.
  cabinet.showBoot(d.bootFrame(), TRIO_BOOT_DRAW);
  const shown = d.doctorShown();
  cabinet.overlay.visible(shown);
  if (
    shown &&
    d.drawDoctor(
      cabinet.overlay.context,
      cabinet.overlay.box.w,
      cabinet.overlay.box.h,
    )
  )
    cabinet.overlay.changed();
  return crash;
}

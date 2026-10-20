import type { DropProfile } from '../../../controls/logic/drop-profile';
import { click } from './part-audio';
import type { Click, SoundRecipe } from './part-audio';

/**
 * A landing followed by diminishing edge/connector contacts. Approach speed
 * reflects the actual drop height, including landings on raised surfaces.
 * The longest board edge controls pitch, independently of impact energy.
 */
export function boardClatter(
  speed: number,
  span = 0.18,
  random: () => number = Math.random,
  sound?: DropProfile['sound'],
): SoundRecipe {
  const pitch = boardPitch(span);
  const resonance = 1 / Math.sqrt(pitch);
  const settings = sound ?? {
    band: 2400 * pitch,
    thump: 160 * pitch,
    decay: 0.06 * resonance,
    gain: 0.42,
  };
  const energy = Math.min(1, Math.max(0, speed) / 7);
  const count = Math.min(5, 2 + Math.floor(energy * 2 + random() * 1.99));
  let at = 0;
  let gap = 0.09 + random() * 0.055;
  let level = settings.gain * Math.min(1, Math.max(0, speed) / 5.5) ** 0.8;
  const sequence: { at: number; click: Click }[] = [];
  for (let i = 0; i < count; i++) {
    sequence.push({
      at,
      click: {
        band:
          (((i === 0 ? 1900 : 2400) + random() * 1000) / 2400) * settings.band,
        q: 0.7 + random() * 0.5,
        decay:
          ((0.045 + random() * 0.025) / 0.06) * (1 - i * 0.09) * settings.decay,
        level,
        thump: [
          (i === 0 ? 1 : 1.5 + random()) * settings.thump,
          ((i === 0 ? 0.055 : 0.025) / 0.06) * settings.decay,
        ],
      },
    });
    at += gap;
    gap *= 0.65 + random() * 0.15;
    level *= 0.55 + random() * 0.12;
  }
  return { sequence };
}

/** Brief, quiet friction under the first contact, beneath the diminishing contact sequence. */
export function boardScrape(speed: number, span = 0.18) {
  return click({
    band: 1100 * boardPitch(span),
    q: 0.6,
    sweep: 0.035,
    decay: 0.14,
    level: 0.025 * Math.min(1, Math.max(0, speed) / 0.8),
  });
}

/** A bounded artistic size cue, rather than a measured PCB vibration model. */
function boardPitch(span: number) {
  return Math.max(0.4, Math.min(1.6, (0.18 / Math.max(0.05, span)) ** 0.85));
}

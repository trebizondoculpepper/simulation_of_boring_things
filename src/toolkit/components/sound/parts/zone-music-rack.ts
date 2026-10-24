import { beginPart, createPartSet } from '../../core/parts/parts';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createPipe } from '../../core/views/pipe-kinds';
import {
  createRackCabinet,
  createRackUnit,
  U,
} from '../../industrial-control/views/rack-equipment';
import type { MusicBinding } from './music-binding';
import { music_source } from './music-source';
import { amplifier } from './amplifier';
import { createMusicSpeaker } from './music-speaker';

/** Standard rack, 1U source and 3U amplifier; all other bays remain spare. */
export function createZoneMusicRack(
  kit: PanelKit,
  binding: MusicBinding,
  tracks: readonly { url: URL; title: string }[],
  monitor = true,
) {
  const a = beginPart(kit, 'Jacuzzi music cabinet');
  const parts = createPartSet();
  const t = tools(kit);
  const cabinet = createRackCabinet(kit, {
    units: 12,
    brand: 'penfold',
    depth: 0.5,
    door: 'none',
  });
  a.object.add(cabinet.group);
  const source = parts.add(
    music_source(
      kit,
      binding,
      tracks.map((t) => t.title),
    ),
  );
  const amp = parts.add(amplifier(kit, binding));
  cabinet.mount(source.unit, 11);
  cabinet.mount(amp.unit, 8);
  cabinet.mount(
    createRackUnit(kit, { u: 1, style: 'blank', colour: 'grey' }),
    12,
  );
  // Working supply indication on the real-sized DIN power module inside the spare bay.
  t.box(a.object, t.paint('#d7d7ce'), 0.08, 0.1, 0.065, 0.15, 0.14, -0.33);
  const power = t.led(a.object, '#67df6d', 0.003, 0.15, 0.15, -0.294, 'z');
  t.label(a.object, '24V DC', 0.15, 0.105, -0.294, 0.005);
  // Mains enters through the back; line-level control/audio links source to amplifier.
  a.object.add(
    createPipe(
      'copper',
      0.012,
      [
        [0.15, 0.14, -0.33],
        [0.15, 0.14, -0.4],
        [0.15, 0.055 + 7 * U, -0.4],
      ],
      { colour: '#292a29' },
    ),
  );
  a.object.add(
    createPipe(
      'copper',
      0.012,
      [
        [0.15, 0.14, -0.7],
        [0.15, 0.14, -0.33],
      ],
      { colour: '#292a29' },
    ),
  );
  a.object.add(
    createPipe(
      'chemical-tube',
      0.006,
      [
        [0.15, 0.14, -0.3],
        [0.15, 0.14, -0.2],
        [0.15, 0.055 + 10 * U, -0.2],
      ],
      { colour: '#1c1d1d', laid: true },
    ),
  );
  a.object.add(
    createPipe(
      'chemical-tube',
      0.006,
      [
        [-0.12, 0.055 + 10 * U, -0.25],
        [-0.12, 0.055 + 7 * U, -0.25],
      ],
      { colour: '#363b3d', laid: true },
    ),
  );
  if (monitor) {
    const speaker = parts.add(createMusicSpeaker(kit, binding, tracks));
    speaker.object.position.set(0, 0.95, -0.43);
    a.object.add(speaker.object);
  }
  const part = a.part();
  return {
    ...part,
    source,
    amplifier: amp,
    uses: parts.uses,
    update(delta: number) {
      parts.update(delta);
      power.set(binding.powered.value);
    },
    setAudible(on: boolean) {
      part.setAudible(on);
      parts.setAudible(on);
    },
    dispose() {
      parts.dispose();
      part.dispose();
    },
  };
}

import { beginPart, createPartSet, studioSwitch } from '../../core/parts/parts';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createRackUnit } from '../../industrial-control/views/rack-equipment';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import type { MusicBinding } from './music-binding';
import { markComponent } from '../../core/views/component-identity';
import { musicSourceStatus } from '../logic/music-source';

/** A 1U music_source: fixed programme transport, character LCD and NEXT. */
export function music_source(
  kit: PanelKit,
  binding: MusicBinding,
  titles: readonly string[],
) {
  const a = beginPart(kit, 'music_source');
  const controls = createPartSet();
  const unit = createRackUnit(kit, {
    u: 1,
    style: 'controls',
    colour: 'grey',
    label: 'SYNCLEX · MUSIC SOURCE',
  });
  a.object.add(unit.group);
  // Itself, for the information overlay: what it is playing.
  markComponent(a.object, {
    name: 'Synclex music source',
    status: () =>
      musicSourceStatus(binding.source.value, binding.powered.value, titles),
  });
  const t = tools(kit);
  const lcd = createCharacterLcd(kit, {
    columns: 24,
    rows: 2,
    cell: 0.003,
    backlight: true,
  });
  lcd.group.position.set(-0.01, 0, 0.003);
  unit.face.add(lcd.group);
  t.label(unit.face, 'MUSIC SOURCE', -0.15, 0, 0.003, 0.005, '#111716');
  const skip = controls.add(
    studioSwitch(kit, {
      name: 'Skip music track',
      legend: 'NEXT',
      cap: 'graphite',
      power: binding.powered,
      action: binding.skip,
    }),
  );
  skip.object.position.set(0.16, 0, 0.002);
  unit.face.add(skip.object);
  let elapsed = 0;
  a.updates.push((delta) => {
    elapsed += delta;
    const source = binding.source.value;
    const title = titles[source.track] ?? 'NO MUSIC ASSIGNED';
    const offset = Math.floor(elapsed * 2) % (title.length + 4);
    const text =
      title.length > 24
        ? `${title}    ${title}`.slice(offset, offset + 24)
        : title;
    lcd.show(
      [text, `TRACK ${source.track + 1} / ${titles.length}`],
      binding.powered.value,
    );
    controls.update(delta);
  });
  a.disposers.push(controls.dispose);
  return {
    ...a.part(),
    unit: { ...unit, group: a.object },
    uses: controls.uses,
  };
}

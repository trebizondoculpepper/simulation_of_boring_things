import { Group, Mesh } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { partAudio, recording } from '../../core/audio/part-audio';
import { roundedSlab } from './rounded-slab';

/** A membrane key's light plastic press, the keypads' recording. */
const PRESS = recording(
  new URL('../../core/audio/assets/key-thock.wav', import.meta.url),
  0.08,
);

/**
 * A membrane key on a metering pump's fascia (the owner, 2026-10-28: "can
 * you make the buttons grey"; "we don't need a symbol on the button if it
 * is printed on the fascia. Put the symbol above"): a plain mid-grey
 * rounded patch, about 14 × 10 mm, raised a little over a darker border,
 * a coloured bar along its top for START (green) or STOP (red); its
 * legend is the fascia's, printed above it (`keyLegend`). A press
 * dips it and gives the keypads' light thock, and does `action`. Built
 * facing +z, its back at z = 0. The shared key of the DMX 1602, the DDS
 * 7.5-16 and the DMH 21-10.
 */
export function membraneKey(
  kit: PanelKit,
  props: {
    /** What it is, for its use's name (its legend is printed on the fascia above it). */
    legend: string;
    name: string;
    accent?: 'green' | 'red';
    action: () => void;
    w?: number;
    h?: number;
  },
): Part {
  const t = tools(kit);
  const w = props.w ?? 0.014;
  const h = props.h ?? 0.01;
  const a = beginPart(kit, props.name);
  // Its border, a shade darker, flush with the fascia.
  const border = new Mesh(
    roundedSlab(w + 0.0016, h + 0.0016, 0.0008, 0.0022),
    t.paint('#6c7176', 0.6),
  );
  border.position.z = 0.0004;
  a.object.add(border);
  const key = new Group();
  key.userData.live = true;
  a.object.add(key);
  const pad = new Mesh(
    roundedSlab(w, h, 0.0012, 0.0018),
    t.paint('#a9adb1', 0.55),
  );
  pad.position.z = 0.0014;
  key.add(pad);
  // A highlight along its top edge, the light catching its raised face.
  t.box(
    key,
    t.paint('#c4c8cb', 0.5),
    w - 0.003,
    0.0006,
    0.0002,
    0,
    h / 2 - 0.0009,
    0.0021,
  );
  if (props.accent)
    t.box(
      key,
      t.paint(props.accent === 'green' ? '#1f8a3a' : '#c8261c', 0.45),
      w - 0.004,
      0.0012,
      0.0002,
      0,
      h / 2 - 0.0021,
      0.0021,
    );
  let dip = 0;
  a.uses.set(key, () => {
    dip = 0.12;
    partAudio.play(PRESS, a.object);
    props.action();
  });
  a.updates.push((delta) => {
    dip = Math.max(0, dip - delta);
    key.position.z = dip > 0 ? -0.0007 : 0;
  });
  a.shows(() => `a membrane key, ${props.legend}`);
  return a.part();
}

/** A key's legend, printed light on the fascia above it, `y` the key's middle. */
export function keyLegend(
  kit: PanelKit,
  parent: Group,
  text: string,
  x: number,
  y: number,
  z: number,
  keyH = 0.01,
  ink = '#d8dce0',
) {
  return tools(kit).label(
    parent,
    text,
    x,
    y + keyH / 2 + 0.0042,
    z,
    0.0026,
    ink,
  );
}

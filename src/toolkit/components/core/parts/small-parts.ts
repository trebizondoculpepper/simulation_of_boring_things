import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { PanelKit } from '../views/eighties-controls';
import { createMicroLabel } from '../views/eighties-controls';
import { tools } from '../views/fitting-tools';
import { partAudio, recording } from '../audio/part-audio';
import { beginPart } from './parts';
import type { Part } from './parts';

/**
 * The small controls of an appliance's own panel, rather than of an
 * industrial control station: a membrane key, 16 mm square, and an
 * illuminated I/O rocker switch, as boilers, controllers and office
 * equipment of the period have them. Each is a part, built in metres,
 * facing +z, its mounting face at z = 0; tried on dev0's SMALL CONTROLS
 * board.
 */

/** A small click: the recorded button press, quieter. */
const CLICK = recording(
  new URL('../audio/assets/button-press.wav', import.meta.url),
  0.035,
);

/**
 * A membrane key: a 16 mm square of printed polyester over a tactile
 * dome, its legend printed above it. Pressing it dips the key and calls
 * `action`.
 */
export function membraneKey(
  kit: PanelKit,
  {
    legend,
    colour = '#2a2b2c',
    ink = '#f4efe6',
    action = () => {},
    name,
  }: {
    legend: string;
    colour?: string;
    ink?: string;
    action?: () => void;
    name?: string;
  },
): Part {
  const t = tools(kit);
  const a = beginPart(kit, name ?? `${legend} key`);
  const cap = t.box(
    a.object,
    t.paint(colour, 0.6),
    0.016,
    0.016,
    0.004,
    0,
    0,
    0.002,
  );
  cap.userData.live = true;
  const label = createMicroLabel(kit, legend, { height: 0.007, ink });
  label.position.set(0, 0.015, 0.0005);
  a.object.add(label);
  let pressed = 0;
  a.uses.set(cap, () => {
    pressed = 0.15;
    action();
    partAudio.play(CLICK, a.object);
  });
  a.cue(cap, () => ({ gesture: 'push', possible: true }));
  a.updates.push((delta) => {
    pressed = Math.max(0, pressed - delta);
    cap.position.z = pressed > 0 ? 0.0008 : 0.002;
  });
  return a.part();
}

/**
 * A printed membrane key's hit area (the owner, 2026-10-28, of the
 * OT-216: membrane keys are not separate buttons, and nothing on them is
 * modelled or moves): a patch of a flat fascia, `w` × `h` metres, that
 * draws nothing of its own (the fascia's maps show the key, its legend
 * and its emboss). Pressing it clicks and calls `action`; what answers is
 * the display or lamp it works. Its face at z = 0, facing +z.
 */
export function fasciaKey(
  kit: PanelKit,
  {
    w,
    h,
    action = () => {},
    name,
  }: { w: number; h: number; action?: () => void; name: string },
): Part {
  const a = beginPart(kit, name);
  const material = new MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
  });
  kit.materials.push(material);
  const area = new Mesh(new PlaneGeometry(w, h), material);
  area.position.z = 0.0003;
  area.userData.live = true;
  a.object.add(area);
  a.uses.set(area, () => {
    action();
    partAudio.play(CLICK, a.object);
  });
  a.cue(area, () => ({ gesture: 'push', possible: true }));
  return a.part();
}

/**
 * An illuminated I/O rocker switch, 30 × 22 mm: its paddle glows while
 * on and rocks over when clicked. It keeps its own state unless `lit`
 * says what to show (as when a controller decides whether it is on); a
 * click calls `action` either way.
 */
export function illuminatedRocker(
  kit: PanelKit,
  {
    initial = true,
    lit,
    action = () => {},
    colour = '#ff5a2a',
    name = 'Rocker switch',
  }: {
    initial?: boolean;
    lit?: () => boolean;
    action?: () => void;
    colour?: string;
    name?: string;
  } = {},
): Part & { readonly on: boolean } {
  const t = tools(kit);
  const a = beginPart(kit, name);
  t.box(a.object, t.paint('#1b1c1d', 0.5), 0.03, 0.022, 0.006, 0, 0, 0.003);
  const glow = new MeshBasicMaterial({ color: '#5a2014' });
  kit.materials.push(glow);
  const paddle = new Group();
  paddle.userData.live = true;
  paddle.position.z = 0.007;
  a.object.add(paddle);
  const face = t.box(paddle, glow, 0.024, 0.016, 0.006, 0, 0, 0);
  face.userData.live = true;
  const label = createMicroLabel(kit, 'O   I', {
    height: 0.007,
    ink: '#f4efe6',
  });
  label.position.set(0, 0.018, 0.001);
  a.object.add(label);
  let own = initial;
  const isOn = () => (lit ? lit() : own);
  a.uses.set(face, () => {
    own = !own;
    action();
    partAudio.play(CLICK, a.object);
  });
  const dark = '#' + glowDim(colour);
  a.updates.push(() => {
    const on = isOn();
    glow.color.set(on ? colour : dark);
    paddle.rotation.x = on ? -0.18 : 0.18;
  });
  return Object.assign(a.part(), {
    get on() {
      return isOn();
    },
  });
}

/** A lamp colour, unlit: about a third of its brightness. */
function glowDim(colour: string) {
  const n = Number.parseInt(colour.slice(1), 16);
  const dim = (shift: number) => Math.round(((n >> shift) & 255) * 0.35);
  return [16, 8, 0].map((s) => dim(s).toString(16).padStart(2, '0')).join('');
}

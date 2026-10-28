import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { beginPart } from '../../core/parts/parts';
import { PIPE_SIZES, plantTools } from './plant-tools';
import type { DN } from './plant-tools';
import { createValvePlaques } from './valve-plaques';

/**
 * A manual wafer butterfly valve with a notch plate, the commonest
 * throttling valve on a pool plant's pipework (after the Keystone F990
 * with its ten-position lever and notch plate): a lever on the stem that
 * drops into one of the plate's notches, so it holds any opening from SHUT
 * to OPEN. The lever lies along the pipe open and across it shut. A click
 * on the lever's left half moves it a notch toward SHUT, on its right half
 * a notch toward OPEN (the control scheme's turning: `knob-turning.ts`).
 * Its designation on plaques round its body; a yellow museum tag on the
 * lever, TURN, says it may be worked.
 *
 * Drawn along x through its origin, its lever up (+y): `placeFitting`
 * turns it into its pipe.
 */
export function createThrottleValve(
  kit: PanelKit,
  {
    dn,
    tag,
    name,
    opening,
    step,
    notches,
  }: {
    dn: DN;
    tag: string;
    name: string;
    /** Its opening now, 0 shut to 1 open, from the model. */
    opening: () => number;
    /** Ask the model for a notch more open (+1) or shut (−1). */
    step: (by: 1 | -1) => void;
    /** The openings its notch plate holds. */
    notches: readonly number[];
  },
) {
  const t = plantTools(kit);
  const a = beginPart(kit, `${tag} ${name}`);
  const lever = t.butterflyValve(a.object, dn, [0, 0, 0], 'x', 'lever');
  a.object.add(createValvePlaques(kit, dn, 'x', tag, name));
  // The notch plate: a quadrant under the lever, its notches marked from
  // SHUT (across the pipe) to OPEN (along it).
  const s = PIPE_SIZES[dn];
  const top = s.flange * 0.42 + Math.max(0.08, s.od * 0.6);
  const radius = Math.min(0.2, 0.12 + s.od * 0.5);
  const plate = t.printed(
    radius * 2.1,
    radius * 2.1,
    (c, w, h) => {
      c.clearRect(0, 0, w, h);
      const cx = w / 2,
        cy = h / 2;
      const R = w * 0.47;
      // The quadrant from along the pipe (+x, open) round to across it (+z, shut).
      c.fillStyle = '#c8ccc9';
      c.beginPath();
      c.moveTo(cx, cy);
      c.arc(cx, cy, R, 0, Math.PI / 2);
      c.closePath();
      c.fill();
      c.strokeStyle = '#3b3f42';
      c.lineWidth = w * 0.012;
      c.stroke();
      c.fillStyle = '#1d2124';
      notches.forEach((n) => {
        const angle = (1 - n) * (Math.PI / 2);
        const x = cx + Math.cos(angle) * R * 0.86;
        const y = cy + Math.sin(angle) * R * 0.86;
        c.beginPath();
        c.arc(x, y, w * 0.018, 0, Math.PI * 2);
        c.fill();
      });
      c.font = `bold ${w * 0.075}px ${SANS}`;
      c.textAlign = 'center';
      c.fillStyle = '#0d6b2a';
      c.fillText('OPEN', cx + R * 0.62, cy - w * 0.03);
      c.fillStyle = '#a3241c';
      c.save();
      c.translate(cx - w * 0.03, cy + R * 0.62);
      c.rotate(Math.PI / 2);
      c.fillText('SHUT', 0, 0);
      c.restore();
    },
    256,
  );
  plate.mesh.rotation.x = -Math.PI / 2;
  plate.mesh.position.set(0, top - 0.004, 0);
  (plate.mesh.material as { transparent?: boolean }).transparent = true;
  a.object.add(plate.mesh);
  // The museum's tag on the lever: it may be worked.
  const tagGroup = new Group();
  tagGroup.userData.live = true;
  const museum = createMicroLabel(kit, '◀ SHUT  TURN  OPEN ▶', {
    height: 0.022,
    ink: '#111111',
    plate: '#ffd21f',
    maxWidth: 0.3,
  });
  museum.position.set(0, 0.035, 0.0);
  museum.rotation.x = -Math.PI / 2;
  tagGroup.add(museum);
  lever.add(tagGroup);
  tagGroup.position.set(0, 0.012, Math.min(0.45, 0.18 + s.od * 0.9) * 0.55);
  tagGroup.rotation.y = Math.PI / 2;
  // Its notch toward OPEN is on the right as one faces it.
  const turn = (direction?: number) =>
    step(direction && direction < 0 ? -1 : 1);
  lever.traverse((piece) => {
    if (piece !== lever) a.uses.set(piece, turn);
  });
  let angle = (1 - opening()) * (Math.PI / 2);
  let shownOpening = -1;
  a.updates.push((delta) => {
    const target = (1 - opening()) * (Math.PI / 2);
    if (Math.abs(target - angle) < 1e-4 && shownOpening === target) return;
    angle += (target - angle) * Math.min(1, delta * 8);
    if (Math.abs(target - angle) < 1e-3) angle = target;
    shownOpening = angle === target ? target : -1;
    // Open, the lever lies along the pipe (+x); shut, across it.
    lever.rotation.y = Math.PI / 2 - angle;
  });
  lever.rotation.y = Math.PI / 2 - angle;
  a.shows(() => {
    const o = opening();
    return o >= 0.98
      ? 'lever at OPEN'
      : o <= 0.02
        ? 'lever at SHUT'
        : `lever in notch ${Math.round(o * 5)} of 5 (throttled)`;
  });
  return a.part();
}

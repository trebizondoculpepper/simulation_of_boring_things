import type { MimicSpec, Point } from './mimic';

/**
 * A mimic's parts as the board draws them, each as the rectangle it takes
 * on the board's face (prompt 066), so a layout can be checked before it
 * is built: nothing overlaps, and every push button has clear space round
 * it for a finger. The sizes are the board's own (`mimic-board.ts`) and
 * its parts' (a push button's 30 mm bezel and its legend plate above).
 * Printed lines are not parts: they run under everything. Pure.
 */

export interface Footprint {
  /** What it is, for a problem's message: "button p1-start", "label FILTER 1". */
  what: string;
  /** Its owner: a button's legend is its own, so not checked against it. */
  owner: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** A push button's bezel, which needs clear space round it. */
  button?: boolean;
}

/** A push button's bezel, half its width, metres. */
const BEZEL = 0.015;
/** Text heights as the board prints them: its height over 36 for labels, over 20 for the title. */
const text = (H: number, scale = 1) => (H / 36) * scale;
/** A printed line of text's width, metres, for its height. */
const textWidth = (chars: number, height: number) => chars * height * 0.62;
/** A micro label's width (a lamp's), metres. */
const microWidth = (chars: number) => chars * 0.0085 + 0.006;
/** A push button's legend plate (`parts.ts`). */
const plateWidth = (chars: number) => Math.max(0.05, chars * 0.0042 + 0.012);

const rect = (
  what: string,
  owner: string,
  [x, y]: Point,
  w: number,
  h: number,
  button = false,
): Footprint => ({
  what,
  owner,
  x0: x - w / 2,
  x1: x + w / 2,
  y0: y - h / 2,
  y1: y + h / 2,
  ...(button ? { button } : {}),
});

function buttonParts(id: string, at: Point, legend?: string): Footprint[] {
  return [
    rect(`button ${id}`, id, at, BEZEL * 2, BEZEL * 2, true),
    ...(legend
      ? [
          rect(
            `legend of ${id}`,
            id,
            [at[0], at[1] + 0.03],
            plateWidth(Math.max(...legend.split('\n').map((l) => l.length))),
            0.012,
          ),
        ]
      : []),
  ];
}

/** Every part's footprint on a mimic's face. */
export function mimicFootprints(spec: MimicSpec): Footprint[] {
  const { width: W, height: H } = spec;
  const out: Footprint[] = [];
  for (const shape of spec.shapes) {
    const size = shape.size ?? 0.12;
    const owner = `shape ${shape.label ?? shape.symbol}`;
    out.push(rect(owner, owner, shape.at, size, size));
    if (shape.label) {
      const h = text(H);
      // Under it, from 1.3 of its radius and a few pixels down.
      const top = shape.at[1] - (size / 2) * 1.3 - (4 / 1024) * H;
      out.push(
        rect(
          `label ${shape.label}`,
          owner,
          [shape.at[0], top - h / 2],
          textWidth(shape.label.length, h),
          h,
        ),
      );
    }
  }
  for (const label of spec.labels ?? []) {
    const h = text(H, label.size ?? 1);
    out.push(
      rect(
        `label ${label.text}`,
        `label ${label.text}`,
        label.at,
        textWidth(label.text.length, h),
        h,
      ),
    );
  }
  for (const lamp of spec.lamps) {
    out.push(rect(`lamp ${lamp.id}`, lamp.id, lamp.at, 0.018, 0.018));
    if (lamp.label)
      out.push(
        rect(
          `label of lamp ${lamp.id}`,
          lamp.id,
          [lamp.at[0], lamp.at[1] - 0.028],
          microWidth(lamp.label.length),
          0.014,
        ),
      );
  }
  for (const r of spec.readouts)
    out.push(
      rect(`readout ${r.id}`, r.id, [r.at[0], r.at[1] - 0.025], 0.19, 0.13),
    );
  for (const b of spec.buttons ?? [])
    out.push(...buttonParts(b.id, b.at, b.legend));
  // The mode buttons and LAMP TEST along the foot, and the title.
  const row = -H / 2 + 0.06;
  const startX = -W / 2 + 0.12;
  spec.modes.forEach((m, i) =>
    out.push(
      ...buttonParts(`mode ${m.id}`, [startX + i * 0.12, row], m.legend),
    ),
  );
  out.push(
    ...buttonParts(
      'lamp test',
      [startX + spec.modes.length * 0.12 + 0.06, row],
      'LAMP TEST',
    ),
  );
  const title = H / 20;
  const titleTop = H / 2 - 0.03 * H;
  out.push({
    what: 'title',
    owner: 'title',
    x0: -W / 2 + 0.04 * H,
    x1: -W / 2 + 0.04 * H + textWidth(spec.title.length, title),
    y0: titleTop - title,
    y1: titleTop,
  });
  // The maker's mark, top right (`panel-maker-mark.ts`, 24 mm high).
  out.push({
    what: "maker's mark",
    owner: 'mark',
    x0: W / 2 - 0.025 - 0.12,
    x1: W / 2 - 0.025,
    y0: H / 2 - 0.025 - 0.024,
    y1: H / 2 - 0.025,
  });
  return out;
}

/** Clear space round a push button's bezel, metres. */
export const BUTTON_CLEARANCE = 0.03;

const meets = (a: Footprint, b: Footprint, gap = 0) =>
  a.x0 - gap < b.x1 &&
  b.x0 - gap < a.x1 &&
  a.y0 - gap < b.y1 &&
  b.y0 - gap < a.y1;

/**
 * What is wrong with a mimic's layout: a part off the board, two parts
 * overlapping, or a push button without its clearance round it.
 */
export function mimicLayoutProblems(spec: MimicSpec): string[] {
  const parts = mimicFootprints(spec);
  const problems: string[] = [];
  const W = spec.width / 2;
  const H = spec.height / 2;
  for (const p of parts)
    if (p.x0 < -W || p.x1 > W || p.y0 < -H || p.y1 > H)
      problems.push(`${p.what} is off the board`);
  for (let i = 0; i < parts.length; i++)
    for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i];
      const b = parts[j];
      if (a.owner === b.owner) continue;
      const gap = a.button || b.button ? BUTTON_CLEARANCE : 0;
      if (meets(a, b, gap))
        problems.push(
          gap
            ? `${a.what} and ${b.what} are closer than ${BUTTON_CLEARANCE * 1000} mm`
            : `${a.what} overlaps ${b.what}`,
        );
    }
  return problems;
}

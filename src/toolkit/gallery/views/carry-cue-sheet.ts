import { useCue } from '../../controls/logic/use-cue';
import type {
  CarryAnswer,
  CarryGesture,
  CarryGlyphSet,
} from '../../controls/logic/use-cue';
import {
  CARRY_CUE_CENTRE,
  ringStyle,
  useCueMarkup,
} from '../../controls/input/use-cue-markup';

/**
 * dev0's sheet of the carrying cues (mission 116, the owner's question 1):
 * every glyph of both sets, the full set (one arrow and a mark for each
 * kind of place) beside Codex's simpler one (a lift, the socket ring, one
 * down arrow for every other put), green and red, on a light tiled wall
 * and in a dark plant room, drawn exactly as the crosshair draws them (the
 * same markup, ring and placement), at the HUD's real size.
 */

const ROWS: readonly { label: string; gesture: CarryGesture }[] = [
  { label: 'Pick up', gesture: 'pick-up' },
  { label: 'Put down on a surface', gesture: 'put-down' },
  { label: 'Put back in its place', gesture: 'put-back' },
  { label: 'Put into a bin or carton', gesture: 'put-in' },
  { label: 'Fit into a socket', gesture: 'fit' },
];

const GROUNDS = {
  light: '#ded6bd',
  dark: '#1b2124',
} as const;

/** One cell: the ring and its glyph, centred, over a ground. */
function cell(answer: CarryAnswer | null, set: CarryGlyphSet, ground: string) {
  const cue = answer ? useCue(answer, false, set) : null;
  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'relative',
    width: '58px',
    height: '66px',
    background: ground,
    overflow: 'hidden',
  });
  const ring = document.createElement('div');
  const look = ringStyle(cue);
  ring.textContent = look.text;
  Object.assign(ring.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%) scale(var(--overlay-scale, 1))',
    border: '2px solid',
    boxSizing: 'content-box',
    ...look.style,
  });
  const glyph = document.createElement('div');
  glyph.innerHTML = cue ? useCueMarkup(cue) : '';
  const [cx, cy] = CARRY_CUE_CENTRE;
  Object.assign(glyph.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    display: 'flex',
    transform: `translate(-${cx}px, -${cy}px) scale(var(--overlay-scale, 1))`,
    transformOrigin: `${cx}px ${cy}px`,
  });
  box.append(ring, glyph);
  return box;
}

const text = (content: string, style: Partial<CSSStyleDeclaration> = {}) => {
  const node = document.createElement('div');
  node.textContent = content;
  Object.assign(node.style, style);
  return node;
};

/** The sheet, as a panel to lay over the room. */
export function createCarryCueSheet() {
  const sheet = document.createElement('div');
  sheet.setAttribute('aria-label', 'Carrying cues, both sets');
  Object.assign(sheet.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    padding: '12px 14px',
    background: '#0e0c09',
    color: '#e9e1c8',
    font: '12px/1.3 sans-serif',
    pointerEvents: 'none',
    zIndex: '5',
  });
  const table = document.createElement('div');
  Object.assign(table.style, { display: 'flex', gap: '18px' });
  const labels = document.createElement('div');
  Object.assign(labels.style, {
    display: 'grid',
    gridTemplateRows: `32px repeat(${ROWS.length + 2}, 66px)`,
    rowGap: '4px',
  });
  labels.append(text(''));
  for (const row of [
    ...ROWS.map((r) => r.label),
    'Refused by the place',
    'Carrying, aimed at nothing: a drop',
  ])
    labels.append(text(row, { alignSelf: 'center', maxWidth: '130px' }));
  table.append(labels);
  for (const set of ['full', 'simple'] as const) {
    const column = document.createElement('div');
    Object.assign(column.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 58px)',
      gridTemplateRows: `32px repeat(${ROWS.length + 2}, 66px)`,
      gap: '4px',
    });
    column.append(
      text(set === 'full' ? 'Full set' : 'Simple set', {
        gridColumn: '1 / span 4',
        fontWeight: 'bold',
        textAlign: 'center',
        borderBottom: '1px solid #556',
      }),
    );
    for (const row of ROWS)
      for (const ground of [GROUNDS.light, GROUNDS.dark])
        for (const possible of [true, false])
          column.append(cell({ gesture: row.gesture, possible }, set, ground));
    for (const ground of [GROUNDS.light, GROUNDS.dark])
      for (const gesture of ['fit', 'put-in'] as const)
        column.append(
          cell({ gesture, possible: false, refused: true }, set, ground),
        );
    for (const ground of [
      GROUNDS.light,
      GROUNDS.dark,
      GROUNDS.light,
      GROUNDS.dark,
    ])
      column.append(cell(null, set, ground));
    table.append(column);
  }
  sheet.append(table);
  const key = text(
    'Each pair: green (the click will do it), red (it will do nothing); light wall, then dark room. Refused: a socket, then a bin.',
    { marginTop: '8px' },
  );
  sheet.append(key);
  return sheet;
}

import { Group } from 'three';
import {
  Banner,
  Button,
  Diagram,
  Frame,
  Gauge,
  Indicator,
  List,
  PageStack,
  Readout,
  Segmented,
  Stack,
  Toggle,
  Trend,
  pageButton,
} from '../../../ui2d';
import type {
  DiagramLine,
  DiagramSymbol,
  UiNode,
  UiSound,
} from '../../../ui2d';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import { createTouchSurface } from '../../components/industrial-control/views/touch-surface';
import { createAnnunciator } from '../../components/industrial-control/logic/annunciator';
import {
  polygonOutline,
  roundedOutline,
  trapeziumOutline,
} from '../../components/industrial-control/logic/touch-surface';
import type { Point2 } from '../../components/industrial-control/logic/touch-surface';
import {
  lampLit,
  lampSense,
  newTrial,
  pressTrial,
  stepTrial,
  verbOf,
  wander,
} from '../logic/parody-trial';
import type {
  ParodySpec,
  ParodyTrial,
  ParodyWidget,
} from '../logic/parody-trial';
import type { LiveExhibit } from '../rooms/plant/exhibit';

/**
 * One of the game's panels reinterpreted as a 24th-century touch screen
 * (mission 093, dev48): its spec's pages built from the `ui2d` kit in a
 * sidebar frame on a touch surface, run on its own trial
 * (`parody-trial.ts`): buttons stop, start and reset it, lamps light by
 * their words, read-outs and gauges wander, an annunciator flashes when a
 * fault trips it. Its footer names the original it parodies.
 */

const COLOURS = [
  'golden-tanoi',
  'lilac',
  'blue-bell',
  'anakiwa',
  'orange-peel',
  'hopbush',
  'periwinkle',
  'chestnut-rose',
  'sandy-brown',
  'melrose',
];

/** Everything a widget does each frame. */
type Tick = (trial: ParodyTrial, seconds: number) => void;

export function createParodyPanel(
  kit: PanelKit,
  spec: ParodySpec,
  seed: number,
): LiveExhibit {
  let trial = newTrial(seed);
  const ticks: Tick[] = [];
  let k = seed * 3;
  const colour = () => COLOURS[k++ % COLOURS.length];
  /** A press by a button's legend, answered with a deny if it did not count. */
  const press = (label: string): UiSound | undefined => {
    const r = pressTrial(trial, label);
    trial = r.trial;
    return r.counted ? undefined : 'deny';
  };
  const annunciators: ReturnType<typeof createAnnunciator>[] = [];
  let lampTest = 0;

  const widget = (w: ParodyWidget): UiNode => {
    switch (w.kind) {
      case 'buttons':
        return new Stack(
          'row',
          w.labels.map((label, i) => {
            const caps =
              w.labels.length === 1
                ? 'both'
                : i === 0
                  ? 'left'
                  : i === w.labels.length - 1
                    ? 'right'
                    : 'none';
            if (w.latch)
              return new Toggle({
                label,
                colour: colour(),
                caps,
                pill: true,
                onToggle: () => press(label),
              });
            const verb = verbOf(label);
            return new Button({
              label,
              caps,
              pill: true,
              colour:
                verb === 'stop'
                  ? 'chestnut-rose'
                  : verb === 'go'
                    ? 'anakiwa'
                    : verb === 'reset'
                      ? 'mariner'
                      : colour(),
              onPress: () => {
                if (verb === 'accept')
                  annunciators.forEach((a) => a.acknowledge());
                if (verb === 'lamp-test') lampTest = 2;
                if (verb === 'reset') annunciators.forEach((a) => a.reset());
                return press(label);
              },
            });
          }),
        );
      case 'selector':
        return new Segmented({
          options: w.options,
          selected: w.selected ?? 0,
          colour: colour(),
          id: w.label,
        });
      case 'lamps': {
        const lamps = w.labels.map((label) => {
          const sense = lampSense(label);
          return {
            sense,
            node: new Indicator({
              label,
              colour: 'track',
              litColour:
                sense === 'tripped'
                  ? 'alert'
                  : sense === 'stopped'
                    ? 'golden-tanoi'
                    : colour(),
              caps: 'none',
            }),
          };
        });
        const base = k;
        ticks.push((t) =>
          lamps.forEach((l, i) =>
            l.node.setLit(lampTest > 0 || lampLit(l.sense, t, base + i)),
          ),
        );
        return new Stack(
          'row',
          lamps.map((l) => l.node),
        );
      }
      case 'readouts': {
        const list = w.items.map(
          ([name, unit]) => new Readout(name, unit, { colour: colour() }),
        );
        const base = k;
        ticks.push((t, s) =>
          list.forEach((r, i) => {
            const [, , lo, hi] = w.items[i];
            const v = wander(s, lo, hi, base + i);
            r.set(
              v.toFixed(hi - lo < 5 ? 2 : hi - lo < 50 ? 1 : 0),
              t.tripped && i === 0,
            );
          }),
        );
        return new Stack('column', list);
      }
      case 'gauges': {
        const list = w.items.map(
          (n) =>
            new Gauge(n, {
              vertical: w.vertical,
              colour: colour(),
              marks: [0.2, 0.85],
            }),
        );
        const base = k;
        ticks.push((_t, s) =>
          list.forEach((g, i) => {
            const v = wander(s, 0.05, 0.98, base + i);
            g.set(v, `${Math.round(v * 100)}%`);
          }),
        );
        return new Stack(w.vertical ? 'row' : 'column', list);
      }
      case 'trend': {
        const tr = new Trend(w.name, {
          min: 0,
          max: 1,
          band: [0.3, 0.7],
          capacity: 80,
          colour: colour(),
        });
        let next = 0;
        const base = k;
        ticks.push((_t, s) => {
          if (s < next) return;
          next = s + 0.5;
          tr.push(wander(s, 0.05, 0.95, base));
        });
        return tr;
      }
      case 'annunciator': {
        const n = w.windows.length;
        const logic = createAnnunciator(n, { manualReset: true });
        annunciators.push(logic);
        const cells = w.windows.map((words) => {
          const [a, ...b] = words.split(' ');
          return new Indicator({
            label: b.length ? b.join(' ') : a,
            sub: b.length ? a : '',
            colour: 'track',
            litColour: 'warning',
            caps: 'none',
          });
        });
        const cols = w.columns ?? Math.min(6, Math.ceil(Math.sqrt(n * 1.6)));
        const rows: UiNode[] = [];
        for (let r = 0; r * cols < n; r++)
          rows.push(
            new Stack('row', cells.slice(r * cols, r * cols + cols), {
              gap: 6,
            }),
          );
        const one = seed % n;
        const two = (seed * 7 + 3) % n;
        ticks.push((t, s) => {
          logic.sense(
            cells.map(
              (_, i) =>
                (t.tripped && i === one) ||
                (i === two && Math.sin(s / 9 + seed) > 0.7),
            ),
          );
          const lit = lampTest > 0 ? cells.map(() => true) : logic.lit(s);
          cells.forEach((c, i) => {
            c.setLit(lit[i]);
            c.setFlashing(lampTest <= 0 && logic.states[i] === 'flashing');
          });
        });
        return new Stack('column', rows, { gap: 6 });
      }
      case 'banner': {
        const b = new Banner();
        ticks.push((t) =>
          b.set(w.words, t.tripped, t.tripped ? 'alert' : 'golden-tanoi'),
        );
        return b;
      }
      case 'list': {
        const list = new List({ onRow: () => undefined });
        const base = k;
        ticks.push((_t, s) =>
          list.set(
            w.rows.map((words, i) => ({
              words,
              right: `${Math.round(wander(s, 1, 99, base + i))}`,
              colour: COLOURS[(base + i) % COLOURS.length],
            })),
          ),
        );
        return list;
      }
      case 'circuit':
        return circuit(w.symbols, ticks);
    }
  };

  const pages = spec.pages.map((p) => ({
    name: p.name,
    node: new Stack(
      'row',
      p.columns.map((col) => new Stack('column', col.map(widget))),
      { gap: 24 },
    ) as UiNode,
  }));
  const stack =
    pages.length > 1
      ? new PageStack(Object.fromEntries(pages.map((p) => [p.name, p.node])))
      : null;
  const sidebar: UiNode[] = stack
    ? stack.ids.map((id) => pageButton(stack, id, { colour: colour() }))
    : [];
  if (annunciators.length)
    sidebar.push(
      new Button({
        label: 'ACCEPT',
        colour: 'golden-tanoi',
        onPress: () => void annunciators.forEach((a) => a.acknowledge()),
      }),
      new Button({
        label: 'RESET',
        colour: 'golden-tanoi',
        onPress: () => {
          annunciators.forEach((a) => a.reset());
          return press('RESET');
        },
      }),
      new Button({
        label: 'LAMP TEST',
        colour: 'periwinkle',
        onPress: () => void (lampTest = 2),
      }),
    );
  const status = new Banner({ size: 40 });
  const tree = new Frame({
    title: spec.title,
    code: spec.code,
    footer: `PARODIES ${spec.original}`,
    colour: spec.colour ?? colour(),
    sidebar,
    content: new Stack('column', [status, stack ?? pages[0].node]),
  });
  const { w = 1.6, h = 1.0 } = spec.size ?? {};
  const outline: Point2[] | undefined =
    spec.shape === 'trapezium'
      ? trapeziumOutline(w + 0.12, w - 0.12, h + 0.08)
      : spec.shape === 'hexagon'
        ? polygonOutline(6, Math.max(w, h) * 0.62)
        : spec.shape === 'rounded'
          ? roundedOutline(w + 0.08, h + 0.08, 0.1)
          : undefined;
  const surface = createTouchSurface(kit, {
    name: `${spec.title} (${spec.original})`,
    outline,
    bezel: outline ? 0.004 : 0.012,
    radius: 0.02,
    // Fewer pixels than a lone panel's: a room holds seventy of them.
    screens: [{ rect: { x: 0, y: 0, w, h }, tree, pixelsPerMetre: 560 }],
  });
  const parts = createPartSet();
  parts.add(surface.part);
  const object = new Group();
  surface.group.position.z = 0.02;
  object.add(surface.group);
  let seconds = 0;
  const run = (delta: number) => {
    seconds += delta;
    trial = stepTrial(trial, delta);
    lampTest = Math.max(0, lampTest - delta);
    status.set(
      trial.tripped ? `${spec.code} · FAULT · RESET REQUIRED` : '',
      trial.tripped,
    );
    for (const t of ticks) t(trial, seconds);
  };
  run(0);
  return {
    object,
    parts,
    update(delta) {
      run(delta);
      parts.update(delta);
    },
    status: () =>
      `${spec.title}, parodying ${spec.original}: ${trial.tripped ? 'tripped' : trial.going ? 'running' : 'stopped'}`,
  };
}

/** Machines in a loop, each touchable on and off; the flow moves while all are on. */
function circuit(
  symbols: Extract<ParodyWidget, { kind: 'circuit' }>['symbols'],
  ticks: Tick[],
): UiNode {
  const n = symbols.length;
  // Round a rectangle 2 × 1, the symbols evenly along its top and bottom.
  const top = Math.ceil(n / 2);
  const at = (i: number): [number, number] =>
    i < top
      ? [-0.8 + (1.6 * (i + 0.5)) / top, 0.35]
      : [0.8 - (1.6 * (i - top + 0.5)) / (n - top || 1), -0.35];
  const on = symbols.map(() => true);
  const lines: DiagramLine[] = [
    {
      id: 'loop',
      points: [
        [-0.9, 0.35],
        [0.9, 0.35],
        [0.9, -0.35],
        [-0.9, -0.35],
        [-0.9, 0.35],
      ],
      colour: 'anakiwa',
      flow: 'forward',
    },
  ];
  const shapes: DiagramSymbol[] = symbols.map((s, i) => ({
    id: `s${i}`,
    shape:
      s.kind === 'valve'
        ? 'bowtie'
        : s.kind === 'pump' || s.kind === 'fan'
          ? 'circle'
          : s.kind === 'filter'
            ? 'capsule'
            : 'box',
    at: at(i),
    size: s.kind === 'valve' ? 0.12 : 0.18,
    aspect:
      s.kind === 'filter'
        ? 1.6
        : s.kind === 'tank' || s.kind === 'boiler'
          ? 1.2
          : 1,
    colour:
      s.kind === 'boiler'
        ? 'orange-peel'
        : s.kind === 'valve'
          ? 'golden-tanoi'
          : s.kind === 'pump' || s.kind === 'fan'
            ? 'lilac'
            : 'blue-bell',
    label: s.label,
    state: 'on',
    onPress: () => void (on[i] = !on[i]),
  }));
  const d = new Diagram({
    bounds: { minX: -1, minY: -0.6, maxX: 1, maxY: 0.6 },
    lines,
    symbols: shapes,
  });
  ticks.push((t) => {
    shapes.forEach((s, i) =>
      d.setSymbol(
        s.id,
        t.tripped && symbols[i].kind !== 'valve' && i === 0
          ? 'fault'
          : on[i]
            ? 'on'
            : 'off',
      ),
    );
    d.setFlow('loop', t.going && on.every(Boolean) ? 'forward' : 'still');
  });
  return d;
}

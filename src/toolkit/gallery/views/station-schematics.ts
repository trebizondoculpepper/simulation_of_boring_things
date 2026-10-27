import { Group } from 'three';
import {
  FlowNetwork,
  Frame,
  Grid,
  Readout,
  Reticle,
  RingGauge,
  Rotator,
  SchematicBrowser,
  SensorSweep,
  SequenceStrip,
  Stack,
  StatusGrid,
  Trend,
  Vessel,
} from '../../../ui2d';
import type {
  FlowNode,
  FlowPipe,
  GlyphKind,
  RotatorDesign,
  UiNode,
} from '../../../ui2d';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createTouchSurface } from '../../components/industrial-control/views/touch-surface';
import { createPartSet } from '../../components/core/parts/parts';
import {
  OVERVIEWS,
  overviewById,
  overviewLayout,
  segmentRate,
  stageLabels,
} from '../logic/schematic-overviews';
import type {
  OverviewSpec,
  SchematicContext,
} from '../logic/schematic-overviews';
import {
  STATION_DESIGNS,
  STATION_DUTY,
  designTitle,
} from '../logic/station-schematics';
import type { Design, StationName } from '../logic/station-schematics';
import type { LiveExhibit } from '../rooms/plant/exhibit';

/**
 * The bridge's stations' schematic screens (mission 095): each station's
 * designs (`station-schematics.ts`) built from the `ui2d` kit's schematic
 * components, in a schematic browser that turns through the station's
 * own designs every so often and can bring up any of the plant's
 * hydrodynamic overviews on demand (the owner, 2026-10-27). Each design is
 * updated from the world only while it is shown.
 */

/** A design built: its tree, and how it shows the world. */
export interface BuiltDesign {
  title: string;
  node: UiNode;
  update(c: SchematicContext, seconds: number): void;
}

/** The house style's colours for a machine (dev48's OLYMPIC HYDRODYNAMIC OVERVIEW's). */
const glyphColour = (kind: GlyphKind) =>
  kind === 'pump' || kind === 'fan'
    ? 'lilac'
    : kind === 'valve' || kind === 'breaker'
      ? 'golden-tanoi'
      : kind === 'boiler' || kind === 'hx'
        ? 'orange-peel'
        : kind === 'pool'
          ? 'anakiwa'
          : 'blue-bell';

/**
 * A hydrodynamic overview in the house style: its circuit as a flow
 * network beside a column of read-outs.
 */
export function buildOverview(spec: OverviewSpec): BuiltDesign {
  const layout = overviewLayout(spec);
  const nodes: FlowNode[] = [];
  spec.stages.forEach((stage, i) => {
    const labels = stageLabels(stage);
    layout.members[i].forEach((m, j) =>
      nodes.push({
        id: `s${i}m${j}`,
        kind: stage.kind,
        at: m.at,
        size: m.size,
        aspect:
          stage.kind === 'filter'
            ? 1.5
            : stage.kind === 'pool'
              ? 0.55
              : stage.kind === 'tank'
                ? 1.2
                : 1,
        label: labels[j],
        labelAt: layout.labelAt[i][j],
        colour: stage.colour ?? glyphColour(stage.kind),
        state: 'on',
      }),
    );
  });
  const pipes: FlowPipe[] = layout.pipes.map((p, k) => ({
    id: `p${k}`,
    points: p.points,
    colour: spec.colour,
    style: spec.style ?? 'dash',
    width: 0.045,
  }));
  const net = new FlowNetwork({ bounds: layout.bounds, pipes, nodes });
  const readouts = spec.readouts.map(
    (r) => new Readout(r.label, r.unit, { colour: r.colour ?? 'anakiwa' }),
  );
  const node = new Stack('row', [
    net,
    new Stack('column', readouts, { grow: 0.34 }),
  ]);
  net.grow = 1;
  return {
    title: spec.title,
    node,
    update(c) {
      const view = spec.read(c);
      view.members.forEach((stage, i) =>
        stage.forEach((m, j) =>
          net.setNode(`s${i}m${j}`, {
            state: m.state,
            level: m.level,
            sub: m.sub ?? '',
          }),
        ),
      );
      layout.pipes.forEach((p, k) =>
        net.setPipe(`p${k}`, segmentRate(view, p.segment)),
      );
      view.readouts.forEach(([words, alarm], i) =>
        readouts[i]?.set(words, alarm ?? false),
      );
    },
  };
}

/** A design built from its description. */
export function buildDesign(design: Design): BuiltDesign {
  switch (design.kind) {
    case 'overview': {
      const spec = overviewById(design.overview);
      if (!spec) throw new Error(`no overview ${design.overview}`);
      return buildOverview(spec);
    }
    case 'rings': {
      const gauges = design.gauges.map(
        (g) =>
          new RingGauge(g.label, {
            colour: g.colour,
            marks: g.marks,
            unit: g.unit,
          }),
      );
      return {
        title: design.title,
        node: new Grid(gauges),
        update(c) {
          design
            .read(c)
            .forEach(([v, words, alarm], i) =>
              gauges[i]?.set(v, words, undefined, alarm ?? false),
            );
        },
      };
    }
    case 'grid': {
      const grid = new StatusGrid({
        rows: design.rows,
        columns: design.columns,
        labelShare: design.labelShare,
      });
      return {
        title: design.title,
        node: grid,
        update: (c) => grid.setAll(design.read(c)),
      };
    }
    case 'sweep': {
      const sweep = new SensorSweep({
        period: design.period ?? 4,
        title: design.title,
        maxRows: 10,
      });
      return {
        title: design.title,
        node: sweep,
        update: (c) => sweep.set(design.read(c)),
      };
    }
    case 'vessels': {
      const vessels = design.vessels.map(
        (v) =>
          new Vessel(v.label, {
            colour: v.colour,
            marks: v.marks,
            column: v.column,
          }),
      );
      return {
        title: design.title,
        node: new Grid(vessels, { columns: vessels.length }),
        update(c) {
          design
            .read(c)
            .forEach(([level, words, o], i) =>
              vessels[i]?.set(level, words, o ?? {}),
            );
        },
      };
    }
    case 'reticles': {
      const scopes = design.reticles.map(
        (r) => new Reticle(r.label, { ...r, scanning: true }),
      );
      return {
        title: design.title,
        node: new Grid(scopes, { columns: scopes.length }),
        update(c) {
          design
            .read(c)
            .forEach(([x, y, words], i) => scopes[i]?.set(x, y, words));
        },
      };
    }
    case 'trends': {
      const trends = design.trends.map(
        (t) =>
          new Trend(t.label, {
            min: t.min,
            max: t.max,
            band: t.band,
            colour: t.colour,
            capacity: 72,
          }),
      );
      let next = 0;
      return {
        title: design.title,
        node: new Grid(trends, { columns: 2 }),
        update(c, seconds) {
          if (seconds < next) return;
          next = seconds + design.every;
          design.read(c).forEach((v, i) => trends[i]?.push(v));
        },
      };
    }
    case 'strip': {
      const strip = new SequenceStrip(design.steps, { title: design.title });
      return {
        title: design.title,
        node: strip,
        update(c) {
          const s = design.read(c);
          if (s.steps) strip.setSteps(s.steps);
          strip.set(s.current, s.progress, s.words);
        },
      };
    }
    case 'combo': {
      const parts = design.parts.map(buildDesign);
      parts.forEach((p, i) => (p.node.grow = design.shares?.[i] ?? 1));
      return {
        title: design.title,
        node: new Stack(
          design.parts.length > 1 && design.parts[0].kind !== 'grid'
            ? 'row'
            : 'column',
          parts.map((p) => p.node),
        ),
        update(c, seconds) {
          for (const p of parts) p.update(c, seconds);
        },
      };
    }
  }
}

/** The design list a station's browser offers: its own designs (the cycle), then every overview it lacks. */
export function stationDesignList(station: StationName): {
  designs: Design[];
  cycle: number[];
} {
  const own = [...STATION_DESIGNS[station]];
  const has = new Set(
    own.flatMap((d) => (d.kind === 'overview' ? [d.overview] : [])),
  );
  const extra: Design[] = OVERVIEWS.filter((o) => !has.has(o.id)).map((o) => ({
    kind: 'overview',
    overview: o.id,
  }));
  return { designs: [...own, ...extra], cycle: own.map((_, i) => i) };
}

export interface StationSchematicOptions {
  /** Seconds each design is shown (default 18). */
  period?: number;
  /** Seconds into the first turn, to set screens started together apart. */
  offset?: number;
  /** The designs to cycle, by index into its list (default the station's own). */
  cycle?: readonly number[];
}

/** A schematic screen's tree and how it shows the world. */
export interface SchematicScreen {
  tree: UiNode;
  /** Call with the world a few times a second: it reads it into the design shown only (trends sample all the while). */
  update(c: SchematicContext, seconds: number): void;
  titles: string[];
  /** The design shown, by index. */
  current(): number;
  /** Whether its rotation is held. */
  held(): boolean;
}

/**
 * A schematic screen from `designs`: one design alone in a sidebar frame
 * (`single`, as dev48's panels are framed), several turning in a frame
 * (`rotator`), or a schematic browser (`browser`: sidebar buttons
 * listing them, CYCLE, MORE), turning through `cycle` (default all).
 */
export function designScreen(
  designs: readonly Design[],
  options: StationSchematicOptions & {
    mode: 'single' | 'rotator' | 'browser';
    title: string;
    code?: string;
    footer?: string;
  },
): SchematicScreen {
  const built = designs.map(buildDesign);
  const overviewTitle = (id: string) => overviewById(id)?.title ?? id;
  const rotatorDesigns: RotatorDesign[] = built.map((b, i) => ({
    title: designTitle(designs[i], overviewTitle),
    short: designTitle(designs[i], overviewTitle)
      .replace(' HYDRODYNAMIC OVERVIEW', '')
      .split(' · ')[0],
    node: b.node,
  }));
  const titles = rotatorDesigns.map((d) => d.title);
  const trends = built.filter((_, i) => designs[i].kind === 'trends');
  let last: SchematicContext | null = null;
  let lastSeconds = 0;
  const show = (i: number) => {
    if (last) built[i].update(last, lastSeconds);
  };
  const common = {
    title: options.title,
    code: options.code,
    footer: options.footer,
    colour: 'golden-tanoi',
  };
  let rotator: Rotator | null = null;
  let tree: UiNode;
  if (options.mode === 'browser') {
    const b = new SchematicBrowser(rotatorDesigns, {
      ...common,
      period: options.period,
      offset: options.offset,
      cycle: options.cycle,
      pageSize: 4,
    });
    rotator = b.rotator;
    tree = b;
  } else if (options.mode === 'rotator') {
    rotator = new Rotator(rotatorDesigns, {
      period: options.period,
      offset: options.offset,
      cycle: options.cycle,
      colour: 'golden-tanoi',
    });
    tree = new Frame({ ...common, sidebar: [], content: rotator });
  } else {
    tree = new Frame({ ...common, sidebar: [], content: built[0].node });
  }
  rotator?.onShow(show);
  const current = () => rotator?.current ?? 0;
  return {
    tree,
    titles,
    current,
    held: () => rotator?.paused ?? false,
    update(c, seconds) {
      last = c;
      lastSeconds = seconds;
      const shown = built[current()];
      shown.update(c, seconds);
      for (const t of trends) if (t !== shown) t.update(c, seconds);
    },
  };
}

/**
 * A station's schematic browser, for any touch surface: titled with the
 * station and its duty, turning through the station's own designs, any
 * overview of the plant brought up from its list.
 */
export function stationSchematic(
  station: StationName,
  options: StationSchematicOptions = {},
): SchematicScreen & { tree: SchematicBrowser } {
  const { designs, cycle } = stationDesignList(station);
  return designScreen(designs, {
    ...options,
    cycle: options.cycle ?? cycle,
    mode: 'browser',
    title: station,
    code: STATION_DUTY[station].split(/[ ,]/)[0],
    footer: STATION_DUTY[station],
  }) as SchematicScreen & { tree: SchematicBrowser };
}

/**
 * A schematic screen as a touch surface, `size` metres, its glass facing
 * +z about its middle: a working exhibit reading the world through
 * `context` twice a second. Presses on it work its browser (a design from
 * the list, MORE, CYCLE) or its rotator's indicator, bleeping as the kit
 * asks.
 */
export function createSchematicSurface(
  kit: PanelKit,
  screen: SchematicScreen,
  name: string,
  size: { w: number; h: number },
  context: () => SchematicContext | null,
  pixelsPerMetre = 560,
): LiveExhibit {
  const surface = createTouchSurface(kit, {
    name,
    bezel: 0.012,
    screens: [
      { rect: { x: 0, y: 0, ...size }, tree: screen.tree, pixelsPerMetre },
    ],
  });
  const parts = createPartSet();
  parts.add(surface.part);
  const object = new Group();
  surface.group.position.z = 0.02;
  object.add(surface.group);
  let seconds = 0;
  let next = 0;
  return {
    object,
    parts,
    update(delta) {
      seconds += delta;
      if (seconds >= next) {
        next = seconds + 0.5;
        const c = context();
        if (c) screen.update(c, seconds);
      }
      parts.update(delta);
    },
    status: () =>
      `${name}: ${screen.titles[screen.current()]}${screen.held() ? ', held' : ''}`,
  };
}

/** A station's schematic browser as a touch surface (`createSchematicSurface` of `stationSchematic`). */
export function createStationSchematic(
  kit: PanelKit,
  station: StationName,
  size: { w: number; h: number },
  context: () => SchematicContext | null,
  options: StationSchematicOptions & { pixelsPerMetre?: number } = {},
): LiveExhibit {
  return createSchematicSurface(
    kit,
    stationSchematic(station, options),
    `${station} schematic screen`,
    size,
    context,
    options.pixelsPerMetre,
  );
}

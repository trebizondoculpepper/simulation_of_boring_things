import { Group } from 'three';
import {
  Banner,
  Button,
  Frame,
  Gauge,
  Indicator,
  Readout,
  Stack,
} from '../../../ui2d';
import type { UiNode, UiSound } from '../../../ui2d';
import type { World, WorldAction } from '../../../game/world';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import { createTouchSurface } from '../../components/industrial-control/views/touch-surface';
import { FILTERS } from '../../../game/plant/olympic-battery';
import {
  DIRT_FULL_SCALE,
  OLYMPIC_FILTER_WASHING,
  cleanNow,
  filterTiles,
  holdProgramme,
  lockoutFilter,
  minutes,
  programmeView,
  refusalWords,
  runProgramme,
} from '../logic/olympic-filter-washing';
import type { TileKind, WashCommand } from '../logic/olympic-filter-washing';
import type { LiveExhibit } from '../rooms/plant/exhibit';

/**
 * OLYMPIC FILTER WASHING as a `ui2d` page (mission 095): the programme's
 * strip along the top (its state, the wash's progress and time left, the
 * backwash pit, RUN and HOLD), and a tile for each of the Olympic's five
 * filters (its tag, its state, its DIRT % as a bar with the backwash-due
 * mark, its bed's pressure difference and flow, CLEAN NOW and LOCKOUT).
 * Its presses ask the world (`logic/olympic-filter-washing.ts`); a refusal
 * is a deny bleep and its reason across the page's top. A page any
 * console may show (`page.node`), or a panel of its own
 * (`createOlympicFilterWashingPanel`).
 */

export interface PageLive {
  /** The world now; null where there is none. */
  world(): World | null;
  dispatch(action: WorldAction): void;
  /**
   * The host's own notice line, if it has one (a console's status across
   * its top): the page's words go there, a refusal flashing; otherwise the
   * page shows them on a banner of its own.
   */
  notify?(words: string, refused: boolean): void;
}

export interface LivePage {
  id: string;
  /** Its page button's name. */
  name: string;
  node: UiNode;
  /** Shows the world as it is, a few times a second; and its notices age. */
  read(world: World, delta: number): void;
}

const KIND_COLOUR: Record<TileKind, string> = {
  service: 'anakiwa',
  washing: 'golden-tanoi',
  changing: 'lilac',
  out: 'blue-bell',
  fault: 'alert',
  locked: 'chestnut-rose',
};

export function olympicFilterWashingPage(live: PageLive): LivePage {
  const status = live.notify ? null : new Banner({ size: 34 });
  let notice = '';
  let noticeColour = 'warning';
  let noticeLeft = 0;
  const say = (words: string, colour: string) => {
    if (live.notify) return live.notify(words, colour === 'warning');
    notice = words;
    noticeColour = colour;
    noticeLeft = 4;
    status?.set(notice, colour === 'warning', colour);
  };
  /** A press: the world asked, or refused with its reason. */
  const command = (of: (w: World) => WashCommand): UiSound | undefined => {
    const w = live.world();
    if (!w) return 'deny';
    const cmd = of(w);
    if (cmd.kind === 'act') {
      for (const a of cmd.actions) live.dispatch(a);
      say(cmd.says, 'anakiwa');
      return undefined;
    }
    say(refusalWords(cmd) ?? '', 'warning');
    return 'deny';
  };

  // The programme's strip.
  const programme = new Readout('WASH PROGRAMME', '', {
    colour: 'golden-tanoi',
    grow: 2.2,
  });
  const progress = new Gauge('WASH', {
    colour: 'golden-tanoi',
    grow: 2,
  });
  const pit = new Readout('BACKWASH PIT', '%', { colour: 'blue-bell' });
  const run = new Button({
    label: 'RUN',
    id: 'run',
    colour: 'anakiwa',
    pill: true,
    caps: 'left',
    onPress: () => command(runProgramme),
  });
  const hold = new Button({
    label: 'HOLD',
    id: 'hold',
    colour: 'golden-tanoi',
    pill: true,
    caps: 'right',
    onPress: () => command(holdProgramme),
  });
  const strip = new Stack(
    'row',
    [programme, progress, pit, new Stack('row', [run, hold], { grow: 1.6 })],
    { size: 64, gap: 14 },
  );

  // The filters, a row each: its state, its DIRT % with the backwash-due
  // mark, its bed's pressure difference and flow, CLEAN NOW, LOCKOUT.
  const tiles = Array.from({ length: FILTERS }, (_, n) => {
    const state = new Indicator({
      label: 'IN SERVICE',
      sub: 'AUTO',
      colour: 'anakiwa',
      caps: 'left',
      grow: 1.7,
    });
    const dirt = new Gauge('DIRT', {
      colour: 'anakiwa',
      // The backwash-due mark: 100 % of its due point.
      marks: [100 / DIRT_FULL_SCALE],
      blocks: 15,
      grow: 2.3,
    });
    const dp = new Readout('BED DIFF PRESS', 'bar', {
      colour: 'lilac',
      grow: 0.9,
    });
    const flow = new Readout('FLOW', 'm³/h', {
      colour: 'blue-bell',
      grow: 0.9,
    });
    const clean = new Button({
      label: 'CLEAN NOW',
      id: `clean/${n}`,
      colour: 'orange-peel',
      pill: true,
      caps: 'none',
      grow: 1.1,
      onPress: () => command((w) => cleanNow(w, n)),
    });
    const lockout = new Button({
      label: 'LOCKOUT',
      id: `lockout/${n}`,
      colour: 'chestnut-rose',
      pill: true,
      caps: 'right',
      grow: 0.8,
      onPress: () => command(() => lockoutFilter(n)),
    });
    const node = new Stack('row', [state, dirt, dp, flow, clean, lockout], {
      gap: 10,
    });
    return { node, state, dirt, dp, flow, clean };
  });
  const node = new Stack(
    'column',
    [
      ...(status ? [status] : []),
      strip,
      new Stack(
        'column',
        tiles.map((t) => t.node),
        { gap: 8 },
      ),
    ],
    { gap: 10 },
  );

  return {
    id: OLYMPIC_FILTER_WASHING.id,
    name: OLYMPIC_FILTER_WASHING.short,
    node,
    read(world, delta) {
      noticeLeft = Math.max(0, noticeLeft - delta);
      status?.set(
        noticeLeft > 0 ? notice : '',
        noticeLeft > 0 && noticeColour === 'warning',
        noticeColour,
      );
      const p = programmeView(world);
      programme.set(
        p.words,
        p.hold || (p.running && p.words.startsWith('WAIT')),
      );
      progress.set(p.progress, p.washing !== null ? minutes(p.left) : '--:--');
      pit.set((p.pit * 100).toFixed(0), !p.pitRoom);
      run.setLit(p.running);
      run.setLabel(p.running ? 'AUTO ON' : 'RUN');
      hold.setLit(p.hold);
      hold.setFlashing(p.hold);
      filterTiles(world).forEach((f, n) => {
        const t = tiles[n];
        t.state.setLabel(
          f.progress !== null && f.kind === 'washing' && !/VALVES/.test(f.state)
            ? `${f.state} ${Math.round(f.progress * 100)}%`
            : f.state,
        );
        t.state.setSub(
          `${f.tag} · ${f.queued ? 'QUEUED' : f.auto ? 'AUTO' : 'HAND'}`,
        );
        t.state.setColour(KIND_COLOUR[f.kind]);
        t.state.setFlashing(f.kind === 'fault' || f.queued);
        t.dirt.set(
          f.dirt / DIRT_FULL_SCALE,
          `${Math.round(f.dirt)}%`,
          f.due ? 'alert' : f.dirt >= 75 ? 'golden-tanoi' : 'anakiwa',
        );
        t.dp.set(f.dp.toFixed(2));
        t.flow.set(f.flow.toFixed(0));
        t.clean.setLit(f.queued || f.kind === 'washing');
      });
    },
  };
}

/** The panel's glass, m. */
export const WASHING_PANEL = { w: 2.0, h: 1.0 };

/**
 * OLYMPIC FILTER WASHING on a touch surface of its own, its glass
 * `size` about its middle facing +z: for dev48, and for any wall or desk
 * that wants it alone.
 */
export function createOlympicFilterWashingPanel(
  kit: PanelKit,
  live: PageLive,
  size = WASHING_PANEL,
): LiveExhibit {
  const page = olympicFilterWashingPage(live);
  const tree = new Frame({
    title: OLYMPIC_FILTER_WASHING.title,
    code: OLYMPIC_FILTER_WASHING.code,
    footer: '',
    colour: 'golden-tanoi',
    sidebar: [],
    content: page.node,
  });
  const surface = createTouchSurface(kit, {
    name: `${OLYMPIC_FILTER_WASHING.title} touch panel`,
    bezel: 0.012,
    screens: [
      {
        rect: { x: 0, y: 0, w: size.w, h: size.h },
        tree,
        pixelsPerMetre: 560,
      },
    ],
  });
  const parts = createPartSet();
  parts.add(surface.part);
  const object = new Group();
  surface.group.position.z = 0.02;
  object.add(surface.group);
  let nextRead = 0;
  let seconds = 0;
  let last = 0;
  const run = (delta: number) => {
    seconds += delta;
    const w = live.world();
    if (w && (seconds >= nextRead || delta === 0)) {
      nextRead = seconds + 0.25;
      page.read(w, seconds - last);
      last = seconds;
    }
  };
  run(0);
  return {
    object,
    parts,
    update(delta) {
      run(delta);
      parts.update(delta);
    },
    status: () => {
      const w = live.world();
      return w
        ? `${OLYMPIC_FILTER_WASHING.title}: ${programmeView(w).words}`
        : OLYMPIC_FILTER_WASHING.title;
    },
  };
}

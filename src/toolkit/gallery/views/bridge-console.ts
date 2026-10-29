import { Group, Vector3 } from 'three';
import type { Material, Mesh, Object3D, Texture } from 'three';
import { ConsolePager, PAGER_PIXELS } from '../../../ui2d';
import type { BootScreen } from '../../../ui2d';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import type { Part } from '../../components/core/parts/parts';
import { markComponent } from '../../components/core/views/component-identity';
import { planeToPixel } from '../../components/industrial-control/logic/touch-surface';
import {
  bootGroupOf,
  createTouchSurface,
} from '../../components/industrial-control/views/touch-surface';
import { recordedTouchSound } from '../../components/sound/audio/console-recordings';
import { touchPoint } from '../../controls/input/touch-point';
import type { Annunciator } from '../../components/industrial-control/logic/annunciator';
import type { LiveExhibit } from '../rooms/plant/exhibit';
import type { World, WorldAction } from '../../../game/world';
import {
  BRIDGE_CONSOLES,
  bridgeConsole,
  newBridgeConsoles,
} from '../../../game/bridge-consoles';
import type { ConsoleClass } from '../../../game/bridge-consoles';
import { createAnnunciator } from '../../components/industrial-control/logic/annunciator';
import { ANNUNCIATOR_ALARMS } from '../logic/control-room-demo';
import { roomWorld } from '../../save/world-store';
import { bridgeAnnunciator } from '../logic/world-annunciator';
import { plantReadingOf } from '../logic/world-reading';
import { createViewscreen } from './bridge-viewscreen';
import {
  BRIDGE_PAGES,
  backConsoleId,
  chooseRole,
  consolePages,
  pagerPlace,
  screenConsoleIds,
  pageOf,
  stepPage,
} from '../logic/bridge-pages';
import type { BridgePage } from '../logic/bridge-pages';
import { BRIDGE_BINDINGS, bridgeSpec } from '../logic/bridge-bindings';
import type { BridgeContext } from '../logic/bridge-bindings';
import {
  BACK_WALL_SCREENS,
  backWallScreenPlaces,
  bridgePanelPlaces,
  deskScreenPlaces,
  stationScreenPlaces,
  viewscreenPlace,
} from '../logic/control-room-prototype';
import { STATION_DESIGNS, stationNamed } from '../logic/station-schematics';
import type { Design, StationName } from '../logic/station-schematics';
import { createParodyPanel } from './parody-panel';
import {
  createSchematicSurface,
  createStationSchematic,
  designScreen,
} from './station-schematics';
import { CUSTOM_PAGES } from './bridge-pages';

/**
 * A pageable console on the bridge (mission 095; the owner, 2026-10-27;
 * `doc/research/bridge-console-paging.md`): whatever page the world says
 * it shows (`bridgeConsoles`), built from the page registry
 * (`logic/bridge-pages.ts`) and rebuilt only when that changes; and in its
 * glass's bottom-left corner a pager strip (`ConsolePager`), the same on
 * every console, ◄ and ► paging through the pages that suit it, LOCK
 * holding it on its page. The strip is its own touch surface laid over
 * the page, so every page, old or new, gets it unchanged.
 */

/** What a page is built with on the bridge. */
export interface PageDeps {
  context(): BridgeContext | null;
  dispatch(action: WorldAction): void;
  /** The room's annunciator, accepted from any panel showing it. */
  shared: Annunciator;
  /** Seconds into a rotation, to set screens started together apart. */
  offset: number;
}

/** A page's exhibit; a page turning through designs by itself can be held on the one shown (a console's LOCK). */
export type PageExhibit = LiveExhibit & { hold?(held: boolean): void };

/** A page built for a console: its exhibit, its glass facing +z about its origin, and that glass's size as shown, metres. */
export interface BuiltPage {
  exhibit: PageExhibit;
  glass: { w: number; h: number };
}

/** Pixels a metre for a schematic page `h` metres high: coarser the larger it is, being seen from further off. */
export const pagePixelsPerMetre = (h: number) =>
  h >= 2 ? 200 : h >= 1.2 ? 320 : 600;

/** A wired panel's glass as shown in a place `fit` metres: its own size, scaled to fit as the bridge's panels always have been. */
export function panelGlass(code: string, fit: { w: number; h: number }) {
  const { w = 1.6, h = 1.0 } = bridgeSpec(code).size ?? {};
  const scale = Math.min(fit.w / (w + 0.1), fit.h / (h + 0.1));
  return { w: w * scale, h: h * scale, scale };
}

/**
 * Page `page` built for a console's place: a wired panel at its own size,
 * scaled to fit `fit`; any other page drawn over `glass`, at scale 1.
 */
export function buildPage(
  kit: PanelKit,
  page: BridgePage,
  place: { fit: { w: number; h: number }; glass: { w: number; h: number } },
  deps: PageDeps,
): BuiltPage {
  const { context } = deps;
  const glass = place.glass;
  const ppm = pagePixelsPerMetre(glass.h);
  switch (page.kind) {
    case 'panel': {
      const panel = createParodyPanel(
        kit,
        bridgeSpec(page.source),
        BRIDGE_PAGES.indexOf(page),
        {
          binding: BRIDGE_BINDINGS[page.source],
          context,
          dispatch: deps.dispatch,
          shared: deps.shared,
        },
      );
      const shown = panelGlass(page.source, place.fit);
      panel.object.scale.setScalar(shown.scale);
      return { exhibit: panel, glass: { w: shown.w, h: shown.h } };
    }
    case 'schematics':
      return {
        exhibit: createStationSchematic(
          kit,
          page.source as StationName,
          glass,
          context,
          { offset: deps.offset, pixelsPerMetre: ppm },
        ),
        glass,
      };
    case 'overview':
      return {
        exhibit: createSchematicSurface(
          kit,
          designScreen([{ kind: 'overview', overview: page.source }], {
            mode: 'single',
            title: page.title,
          }),
          `${page.title} screen`,
          glass,
          context,
          ppm,
        ),
        glass,
      };
    case 'display': {
      const s = BACK_WALL_SCREENS.find((d) => d.title === page.source)!;
      const designs: readonly Design[] =
        'station' in s.show
          ? STATION_DESIGNS[stationNamed(s.show.station)!]
          : s.show.overviews.map((overview): Design => ({
              kind: 'overview',
              overview,
            }));
      return {
        exhibit: createSchematicSurface(
          kit,
          designScreen(designs, {
            mode: 'rotator',
            title: s.title,
            period: 24,
            offset: deps.offset,
          }),
          `${s.title} display`,
          glass,
          context,
          ppm,
        ),
        glass,
      };
    }
    case 'custom':
      return {
        exhibit: CUSTOM_PAGES[page.id].surface(kit, glass, {
          world: () => context()?.world ?? null,
          dispatch: deps.dispatch,
        }),
        glass,
      };
  }
}

const NO_CHOICES = newBridgeConsoles();

/** The consoles whose pages turn by themselves, so have a LOCK. */
const LOCKING: readonly ConsoleClass[] = ['screen', 'back', 'viewscreen'];

export interface BridgeConsoleSpec {
  /** Its console id (`game/bridge-consoles.ts`). */
  id: string;
  name: string;
  /** Its glass's middle, its turn about y, and its tilt back from upright. */
  place: { x: number; y: number; z: number; yaw: number; tilt: number };
  /** The most a panel may take here, metres (panels scale to fit it). */
  fit: { w: number; h: number };
  /** The glass any other page is drawn over, metres. */
  glass: { w: number; h: number };
  /** Seconds into a rotation, to set it apart from its neighbours. */
  offset: number;
  /** What it stands on without any page (the viewscreen's own surface); `builtIn` is the page it shows itself. */
  base?: { exhibit: PageExhibit; builtIn: string; covered(): boolean };
  /** Other consoles worked from its strip as well, each a strip of its own beside its own (Central Control's for the main viewscreen). */
  remotes?: readonly { id: string; prefix: string }[];
}

interface WorldStore {
  world: { value: World };
  dispatch(action: WorldAction): void;
}

/** Everything a build adds to the kit and the boot group, to free it again. */
function tracked<T>(kit: PanelKit, build: () => T) {
  const group = bootGroupOf(kit);
  const screens = new Set(group.screens);
  const textures = kit.textures.length;
  const materials = kit.materials.length;
  const built = build();
  const added = {
    screens: [...group.screens].filter((s) => !screens.has(s)),
    textures: kit.textures.slice(textures),
    materials: kit.materials.slice(materials),
  };
  return {
    built,
    free(object: Object3D) {
      object.traverse((o) => {
        if ((o as Mesh).isMesh) (o as Mesh).geometry.dispose();
      });
      const textures = new Set<Texture>(added.textures);
      const materials = new Set<Material>(added.materials);
      for (const t of textures) t.dispose();
      for (const m of materials) m.dispose();
      kit.textures.splice(
        0,
        kit.textures.length,
        ...kit.textures.filter((t) => !textures.has(t)),
      );
      kit.materials.splice(
        0,
        kit.materials.length,
        ...kit.materials.filter((m) => !materials.has(m)),
      );
      added.screens.forEach((s: BootScreen) => group.remove(s));
    },
  };
}

export function createBridgeConsole(
  kit: PanelKit,
  spec: BridgeConsoleSpec,
  store: WorldStore | null,
  deps: Omit<PageDeps, 'offset'>,
): Part {
  const holder = new Group();
  holder.name = spec.name;
  holder.position.set(spec.place.x, spec.place.y, spec.place.z);
  holder.rotation.order = 'YXZ';
  holder.rotation.set(-spec.place.tilt, spec.place.yaw, 0);
  if (spec.base) holder.add(spec.base.exhibit.object);
  const choices = () => store?.world.value.bridgeConsoles ?? NO_CHOICES;
  const choice = (id: string) => choices()[id];

  // The page shown: built, and its exhibit in the holder unless covered.
  let shownId = '';
  let page: (BuiltPage & { free(o: Object3D): void }) | null = null;
  let covered = false;
  let glass = spec.glass;
  // The LOCK as last put to the page's rotation (null: not yet).
  let heldShown: boolean | null = null;
  const build = (p: BridgePage) => {
    if (page) {
      holder.remove(page.exhibit.object);
      page.exhibit.parts?.dispose();
      page.exhibit.dispose?.();
      page.free(page.exhibit.object);
      page = null;
    }
    shownId = p.id;
    heldShown = null;
    if (spec.base && p.id === spec.base.builtIn) {
      glass = spec.glass;
    } else {
      const t = tracked(kit, () =>
        buildPage(kit, p, spec, { ...deps, offset: spec.offset }),
      );
      page = { ...t.built, free: t.free };
      glass = page.glass;
      covered = false;
      holder.add(page.exhibit.object);
    }
    markComponent(holder, {
      name: holder.name,
      model: { node: p.model.node },
      status: () =>
        `${(page?.exhibit ?? spec.base?.exhibit)?.status?.() ?? p.title} · ${choice(spec.id)?.locked ? 'locked' : 'unlocked'}`,
    });
    placeStrips();
  };

  // The strips: its own, and any it works for another console beside it.
  const strips = [{ id: spec.id, prefix: '' }, ...(spec.remotes ?? [])].map(
    ({ id, prefix }, slot) => {
      const console = bridgeConsole(id);
      const current = () => pageOf(id, choices());
      // A LOCK only on the displays that turn through pages by themselves
      // (the owner, 2026-10-27): the stations' and desk's schematic screens,
      // the back walls' displays and the viewscreen; the workstations'
      // panels, which stay where they are left, page with ◄ and ► alone.
      const lock = console ? LOCKING.includes(console.kind) : false;
      const pager = new ConsolePager({
        lock,
        onStep(direction) {
          // Locked or not: the lock holds a page's own turning, and ◄ ►
          // choose the page it holds (the owner, 2026-10-27).
          if (!store || !choice(id)) return 'deny';
          const next = stepPage(id, choices(), direction);
          if (!next) return 'deny';
          // A workstation's lower console sets its role, its upper
          // displays reset to the role's displays.
          const actions = console?.role
            ? chooseRole(id, next.id, choices())
            : [{ type: 'bridge/console' as const, console: id, page: next.id }];
          for (const a of actions) store.dispatch(a);
          refresh();
          return 'page';
        },
        onLock(locked) {
          if (!store) return 'deny';
          store.dispatch({ type: 'bridge/console', console: id, locked });
          refresh();
          return 'confirm';
        },
        colour: prefix ? 'golden-tanoi' : 'primary',
      });
      const at = pagerPlace(spec.glass.w, spec.glass.h, slot);
      const surface = createTouchSurface(kit, {
        kind: 'lcars',
        name: `${spec.name} pager${prefix ? ` (${prefix.trim()})` : ''}`,
        bezel: 0,
        depth: 0.002,
        screens: [
          {
            rect: { x: 0, y: 0, w: at.w, h: at.h },
            tree: pager,
            pixelsPerMetre: PAGER_PIXELS.h / at.h,
          },
        ],
        sounds: recordedTouchSound,
      });
      holder.add(surface.group);
      const show = () => {
        const p = current();
        const list = console ? consolePages(console, choices()) : [];
        pager.set({
          title: `${prefix}${p?.short ?? ''}`,
          index: Math.max(
            0,
            list.findIndex((q) => q.id === p?.id),
          ),
          count: list.length,
          locked: choice(id)?.locked ?? false,
        });
      };
      return { surface, show, slot, rect: { x: 0, y: 0, w: at.w, h: at.h } };
    },
  );
  function placeStrips() {
    for (const s of strips) {
      const at = pagerPlace(glass.w, glass.h, s.slot);
      // Its face 3 mm in front of the page's glass (at 20 mm).
      s.surface.group.position.set(at.x, at.y, 0.025);
    }
  }

  /** The world read: the page rebuilt if it has changed, the strips shown. */
  function refresh() {
    const p = pageOf(spec.id, choices());
    if (p && p.id !== shownId) build(p);
    // Locked, a turning page is held on the design it shows; let go, it turns again.
    const locked = choice(spec.id)?.locked ?? false;
    if (locked !== heldShown) {
      heldShown = locked;
      (page?.exhibit ?? spec.base?.exhibit)?.hold?.(locked);
    }
    for (const s of strips) s.show();
  }
  refresh();

  let seconds = 0;
  let next = 0.5;
  const uses = () => [
    ...strips.flatMap((s) => [...s.surface.part.uses]),
    ...(page && !covered ? [...(page.exhibit.parts?.uses ?? [])] : []),
    ...(spec.base ? [...(spec.base.exhibit.parts?.uses ?? [])] : []),
  ];
  return {
    object: holder,
    // One use for the whole console, forwarded to whichever of its
    // pieces was touched: its page's change as it is paged.
    uses: new Map([
      [
        holder as Object3D,
        (direction?: number) => {
          const tp = touchPoint(holder);
          const lp = tp?.point
            ? holder.worldToLocal(
                new Vector3(tp.point.x, tp.point.y, tp.point.z),
              )
            : null;
          // A touch within a strip is the strip's, wherever the ray
          // struck first (its sheet and its screen lie in one plane).
          if (lp)
            for (const q of strips) {
              const at = q.surface.group.position;
              const r = q.rect;
              const x = lp.x - at.x;
              const y = lp.y - at.y;
              if (Math.abs(x) <= r.w / 2 && Math.abs(y) <= r.h / 2) {
                const sc = q.surface.screens[0];
                const px = planeToPixel(r, x, y, sc.width, sc.height);
                sc.touchPixel(px.x, px.y);
                return;
              }
            }
          for (const [object, use] of uses())
            if (touchPoint(object)) return use(direction);
        },
      ],
    ]),
    update(delta) {
      seconds += delta;
      if (seconds >= next) {
        next = seconds + 0.5;
        refresh();
      }
      // The viewscreen's alarms over whatever is chosen for it.
      const cover = !!page && !!spec.base?.covered();
      if (page && cover !== covered) {
        covered = cover;
        if (cover) holder.remove(page.exhibit.object);
        else holder.add(page.exhibit.object);
      }
      spec.base?.exhibit.update?.(delta);
      if (page && !covered) page.exhibit.update?.(delta);
      for (const s of strips) s.surface.part.update(delta);
    },
    onEvent: () => () => {},
    setAudible: (on) => {
      spec.base?.exhibit.parts?.setAudible(on);
      page?.exhibit.parts?.setAudible(on);
    },
    dispose() {
      spec.base?.exhibit.parts?.dispose();
      page?.exhibit.parts?.dispose();
      page?.exhibit.dispose?.();
      for (const s of strips) s.surface.part.dispose();
    },
  };
}

/**
 * The bridge's consoles (mission 095), every one pageable: dev48's
 * reimagined panels on its stations, Central Control on the operator's
 * desk and the control room's boards on its front walls, each wired to
 * the one world (`bridge-bindings.ts`); the stations' schematic screens
 * and the desk's; the back walls' displays; and the main viewscreen, its
 * page chosen from Central Control's second strip. The annunciator is
 * the world's, shared by every console showing it: accepted at any,
 * accepted at all.
 */
export function installBridgeConsoles(kit: PanelKit): Part[] {
  const store = typeof window === 'undefined' ? null : roomWorld();
  // The world's annunciator (`game/annunciator.ts`): accepted here, at
  // CR-CP2 or the old control room's board alike, and kept.
  const shared = store
    ? bridgeAnnunciator(store)
    : createAnnunciator(ANNUNCIATOR_ALARMS.length, { manualReset: true });
  const context = () => {
    const world = store?.world.value;
    return world ? { world, reading: plantReadingOf(world, 'pool_02') } : null;
  };
  const deps = {
    context,
    dispatch: (action: WorldAction) => store?.dispatch(action),
    shared,
  };
  const out: Part[] = [];
  // The wired panels: each place's console found by its default page.
  for (const place of bridgePanelPlaces()) {
    const c = BRIDGE_CONSOLES.find(
      (k) => k.defaultPage === place.code.toLowerCase(),
    );
    if (!c) continue;
    const spec = bridgeSpec(place.code);
    const glass = panelGlass(place.code, place.fit);
    out.push(
      createBridgeConsole(
        kit,
        {
          id: c.id,
          name: `${spec.title} (the bridge's ${spec.code})`,
          place,
          fit: place.fit,
          glass: { w: glass.w, h: glass.h },
          offset: 0,
          // Central Control works the main viewscreen's page too.
          remotes:
            place.code === 'CC-01'
              ? [{ id: 'viewscreen', prefix: 'VS · ' }]
              : undefined,
        },
        store,
        deps,
      ),
    );
  }
  // The stations' schematic screens (the owner, 2026-10-27): each forward
  // station's upper screen, each rear station's on the wall over its
  // console, and the desk's upstands, set apart in time so they do not
  // turn together.
  const stations = stationScreenPlaces();
  const desk = deskScreenPlaces();
  const ids = screenConsoleIds(stations, desk);
  const places = [...stations, ...desk].map((p, i) => ({ ...p, id: ids[i] }));
  places.forEach((place, i) => {
    out.push(
      createBridgeConsole(
        kit,
        {
          id: place.id,
          name: `${place.station} schematic screen`,
          place,
          fit: place.size,
          glass: place.size,
          offset: (i * 18) / places.length,
        },
        store,
        deps,
      ),
    );
  });
  // The back walls' displays, where the conference table looked out (the
  // owner, 2026-10-27), set apart in time.
  const back = backWallScreenPlaces();
  back.forEach((place, i) => {
    out.push(
      createBridgeConsole(
        kit,
        {
          id: backConsoleId(place.title),
          name: `${place.title} display (the bridge's back wall)`,
          place: { ...place, tilt: 0 },
          fit: place.size,
          glass: place.size,
          offset: (i * 24) / back.length,
        },
        store,
        deps,
      ),
    );
  });
  // The main viewscreen, live, on the big wall (`viewscreenPlace`): its
  // own browser by default, another page chosen from Central Control
  // drawn in front of it, its alarms over either while any is unaccepted.
  const vp = viewscreenPlace();
  const chosen = () => {
    const page = store?.world.value.bridgeConsoles.viewscreen?.page;
    return !!page && page !== VIEWSCREEN_DEFAULT;
  };
  const screen = createViewscreen(kit, vp.size, context, shared, {
    blank: chosen,
  });
  out.push(
    createBridgeConsole(
      kit,
      {
        id: 'viewscreen',
        name: 'Main viewscreen',
        place: { ...vp, yaw: 0, tilt: 0 },
        fit: vp.size,
        glass: vp.size,
        offset: 0,
        base: {
          exhibit: screen,
          builtIn: VIEWSCREEN_DEFAULT,
          covered: () => screen.alarms(),
        },
      },
      store,
      deps,
    ),
  );
  return out;
}

const VIEWSCREEN_DEFAULT = bridgeConsole('viewscreen')!.defaultPage;

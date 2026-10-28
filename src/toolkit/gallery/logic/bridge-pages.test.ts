import { describe, expect, it } from 'vite-plus/test';
import {
  BRIDGE_CONSOLES,
  bridgeConsole,
  chooseConsole,
  newBridgeConsoles,
} from '../../../game/bridge-consoles';
import {
  BRIDGE_PAGES,
  WIDE_CONSOLES,
  backConsoleId,
  bridgePage,
  extraWide,
  consolePages,
  pageOf,
  pagerPlace,
  screenConsoleIds,
  ROLE_PAGES,
  chooseRole,
  roleOf,
  stepPage,
} from './bridge-pages';
import { BRIDGE_BINDINGS, bridgeSpec } from './bridge-bindings';
import { STATION_NAMES } from './station-schematics';
import { OVERVIEWS } from './schematic-overviews';
import {
  backWallScreenPlaces,
  bridgePanelPlaces,
  deskScreenPlaces,
  stationScreenPlaces,
  viewscreenPlace,
} from './control-room-prototype';

describe('the bridge’s page registry (console paging)', () => {
  it('has every page once, by a lower-case id, its strip name short', () => {
    const ids = BRIDGE_PAGES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of BRIDGE_PAGES) {
      expect(p.id).toMatch(/^[a-z0-9][a-z0-9.-]*$/);
      expect(p.short.length, p.id).toBeLessThanOrEqual(14);
    }
  });

  it('has a page for every wired panel, station browser and overview', () => {
    for (const code of Object.keys(BRIDGE_BINDINGS))
      expect(bridgePage(code.toLowerCase())?.kind, code).toBe('panel');
    for (const s of STATION_NAMES)
      expect(
        BRIDGE_PAGES.some((p) => p.kind === 'schematics' && p.source === s),
        s,
      ).toBe(true);
    for (const o of OVERVIEWS)
      expect(bridgePage(`overview.${o.id}`)?.kind, o.id).toBe('overview');
  });

  it('gives every console a default page that suits it and is among its pages', () => {
    const fresh = newBridgeConsoles();
    for (const c of BRIDGE_CONSOLES) {
      const page = bridgePage(c.defaultPage);
      expect(page, c.id).toBeDefined();
      expect(page!.suits, c.id).toContain(c.kind);
      const pages = consolePages(c, fresh);
      // Every console pages, but the extra-wide one, which has as many
      // pages as there are designs as wide as it (one, today).
      if (WIDE_CONSOLES.has(c.id))
        expect(pages.length, c.id).toBeGreaterThan(0);
      else expect(pages.length, c.id).toBeGreaterThan(1);
      expect(
        pages.every((p) => p.suits.includes(c.kind)),
        c.id,
      ).toBe(true);
      if (!c.governor) expect(pages[0].id, c.id).toBe(c.defaultPage);
    }
  });

  it('gives every role its panel first, then its displays, each a page, each role a workstation panel', () => {
    for (const [role, ids] of Object.entries(ROLE_PAGES)) {
      const pages = ids.map((id) => bridgePage(id));
      expect(pages.every(Boolean), role).toBe(true);
      expect(pages[0]!.kind, role).toBe('panel');
      // Lower consoles for control, upper ones for information (a loose rule).
      expect(
        pages.slice(1).some((p) => p!.kind === 'panel'),
        role,
      ).toBe(false);
      expect(
        pages.filter((p) => p!.suits.includes('screen')).length,
        role,
      ).toBeGreaterThan(1);
      expect(
        BRIDGE_CONSOLES.some((c) => c.role && c.defaultPage === ids[0]),
        role,
      ).toBe(true);
    }
  });

  it('sets a workstation’s role with its lower console, its upper displays then paging only through that role’s displays', () => {
    let choices = newBridgeConsoles();
    // Fresh: the Flow Navigator's upper screen shows its own browser, in its role's list.
    expect(pageOf('flow-navigator.screen', choices)?.id).toBe(
      'schematics.flow-navigator',
    );
    const upper = consolePages(
      bridgeConsole('flow-navigator.screen')!,
      choices,
    );
    expect(upper.map((p) => p.id)).toContain('overview.olympic');
    expect(upper.map((p) => p.id)).not.toContain('overview.heating');
    // The lower console stepped on: the next role, and its upper reset.
    const next = stepPage('flow-navigator.panel', choices, 1)!;
    expect(next.id).toBe('pl2-cp2');
    for (const a of chooseRole('flow-navigator.panel', next.id, choices))
      choices = chooseConsole(choices, a.console, { page: a.page });
    expect(roleOf('flow-navigator.panel', choices)).toBe(
      'disinfection-tactical',
    );
    expect(pageOf('flow-navigator.screen', choices)?.id).toBe(
      'schematics.disinfection-tactical',
    );
    // Round both ways.
    const ids = consolePages(
      bridgeConsole('flow-navigator.screen')!,
      choices,
    ).map((p) => p.id);
    expect(stepPage('flow-navigator.screen', choices, -1)?.id).toBe(ids.at(-1));
    // Central Control's four desk screens each get a different display of its role.
    let cc = newBridgeConsoles();
    for (const a of chooseRole('central-control.panel', 'cc-01', cc))
      cc = chooseConsole(cc, a.console, { page: a.page });
    const desk = ['desk.0.1', 'desk.0.2', 'desk.0.3', 'desk.0.4'].map(
      (id) => pageOf(id, cc)?.id,
    );
    expect(new Set(desk).size).toBe(4);
  });

  it('falls back to the default for a page it does not know or that does not suit', () => {
    const fresh = newBridgeConsoles();
    const id = 'east-wall.panel';
    const with_ = (page: string) => ({
      ...fresh,
      [id]: { page, locked: false },
    });
    expect(pageOf(id, fresh)?.id).toBe('cr-mp1');
    expect(pageOf(id, with_('gone'))?.id).toBe('cr-mp1');
    expect(pageOf(id, with_('overview.gas'))?.id).toBe('overview.gas');
    // A role's panel does not suit an upper display.
    expect(
      pageOf('boiler-helmsman.screen', {
        ...fresh,
        'boiler-helmsman.screen': { page: 'cr-mp2', locked: false },
      })?.id,
    ).toBe('schematics.boiler-helmsman');
    // The viewscreen takes everything.
    expect(consolePages(bridgeConsole('viewscreen')!, fresh)).toHaveLength(
      BRIDGE_PAGES.length,
    );
  });

  it('has a console for every place on the bridge, and a place for every console', () => {
    const fromPlaces = [
      ...bridgePanelPlaces().map(
        (p) =>
          BRIDGE_CONSOLES.find((c) => c.defaultPage === p.code.toLowerCase())
            ?.id,
      ),
      ...screenConsoleIds(stationScreenPlaces(), deskScreenPlaces()),
      ...backWallScreenPlaces().map((p) => backConsoleId(p.title)),
      'viewscreen',
    ];
    const order = (a?: string, b?: string) => (a ?? '').localeCompare(b ?? '');
    expect([...fromPlaces].sort(order)).toEqual(
      BRIDGE_CONSOLES.map((c) => c.id).sort(order),
    );
    // A schematic screen's default is its own station's browser.
    const ids = screenConsoleIds(stationScreenPlaces(), deskScreenPlaces());
    [...stationScreenPlaces(), ...deskScreenPlaces()].forEach((p, i) =>
      expect(bridgePage(bridgeConsole(ids[i])!.defaultPage)?.source).toBe(
        p.station,
      ),
    );
  });

  it('puts the pager strip inside every console’s glass, Central Control’s two apart', () => {
    const glasses = [
      ...bridgePanelPlaces().map((p) => {
        const { w = 1.6, h = 1.0 } = bridgeSpec(p.code).size ?? {};
        const s = Math.min(p.fit.w / (w + 0.1), p.fit.h / (h + 0.1));
        return { w: w * s, h: h * s };
      }),
      ...stationScreenPlaces().map((p) => p.size),
      ...deskScreenPlaces().map((p) => p.size),
      ...backWallScreenPlaces().map((p) => p.size),
      viewscreenPlace().size,
    ];
    for (const g of glasses)
      for (const slot of [0]) {
        const at = pagerPlace(g.w, g.h, slot);
        expect(at.x - at.w / 2).toBeGreaterThan(-g.w / 2);
        expect(at.x + at.w / 2).toBeLessThan(g.w / 2);
        expect(at.y - at.h / 2).toBeGreaterThan(-g.h / 2);
        expect(at.y + at.h / 2).toBeLessThan(g.h / 2);
      }
    const a = pagerPlace(2.6, 0.55, 0);
    const b = pagerPlace(2.6, 0.55, 1);
    expect(b.x - b.w / 2).toBeGreaterThan(a.x + a.w / 2);
    expect(b.x + b.w / 2).toBeLessThan(2.6 / 2);
  });
});

describe('Central Control, the extra-wide console', () => {
  it('pages only through designs as wide as it, so ◄ and ► never shrink it', () => {
    const c = bridgeConsole('central-control.panel')!;
    const pages = consolePages(c, {});
    expect(pages.map((p) => p.id)).toEqual(['cc-01']);
    expect(pages.every(extraWide)).toBe(true);
    expect(stepPage('central-control.panel', {}, 1)?.id).toBe('cc-01');
    expect(stepPage('central-control.panel', {}, -1)?.id).toBe('cc-01');
    // A station's panel chosen there by an older save is not shown.
    expect(
      pageOf('central-control.panel', {
        'central-control.panel': { page: 'adm-01', locked: false },
      })?.id,
    ).toBe('cc-01');
  });

  it('leaves the other consoles their pages, the wide design not among the stations’', () => {
    expect(BRIDGE_PAGES.filter(extraWide).map((p) => p.id)).toEqual(['cc-01']);
  });
});

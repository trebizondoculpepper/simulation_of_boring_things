import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../../../game/world';
import type { World, WorldAction } from '../../../game/world';
import { BRIDGE_PAGES, PANEL_PAGES } from '../logic/bridge-pages';
import { BRIDGE_BINDINGS } from '../logic/bridge-bindings';
import { roomModel } from '../logic/world-in-model';
import { CUSTOM_PAGES, livePagesFor } from './bridge-pages';
import type { Button } from '../../../ui2d';

describe('the bridge’s own pages (mission 095)', () => {
  it('has a builder for every custom page, ids unique, each bound to its room’s model', () => {
    const ids = BRIDGE_PAGES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of BRIDGE_PAGES) {
      if (p.kind === 'custom') expect(CUSTOM_PAGES[p.id], p.id).toBeDefined();
      expect(roomModel(p.model.room)?.nodes.has(p.model.node), p.id).toBe(true);
      expect(p.short.length).toBeLessThanOrEqual(14);
    }
  });

  it('carries OLYMPIC FILTER WASHING on the Flow Navigator’s PL2-CP1, a wired panel', () => {
    expect(PANEL_PAGES['PL2-CP1']).toContain('olympic-filter-washing');
    for (const code of Object.keys(PANEL_PAGES))
      expect(BRIDGE_BINDINGS[code], code).toBeDefined();
  });

  it('CLEAN NOW on the page asks the world to wash that filter; a locked-out filter’s is refused with a deny', () => {
    let world: World = newWorld();
    const sent: WorldAction[] = [];
    const refusals: string[] = [];
    const [page] = livePagesFor('PL2-CP1', {
      world: () => world,
      dispatch: (a) => {
        sent.push(a);
        world = applyAction(world, a);
      },
      notify: (words, refused) => void (refused && refusals.push(words)),
    });
    page.read(world, 0);
    const press = (id: string) => (page.node.find(id) as Button).press();
    expect(press('clean/1')?.sound).toBe('confirm');
    expect(sent).toContainEqual({
      type: 'wash-o-tron',
      action: { act: 'wash-now', filter: 1 },
    });
    expect(world.washOTron.washNow).toBe(1);
    expect(world.washOTron.running).toBe(true);
    expect(press('lockout/0')?.sound).toBe('deny');
    expect(refusals.at(-1)).toMatch(/^LOCAL CONTROL ONLY/);
    page.read(world, 0.25);
  });
});

import { Mesh } from 'three';
import type { Object3D } from 'three';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { createPanelKit } from '../../../components/core/views/eighties-controls';
import {
  componentOf,
  owningComponent,
} from '../../../components/core/views/component-identity';
import type { ComponentIdentity } from '../../../components/core/views/component-identity';
import { MUSEUM_HALLS } from '../../logic/museum-plan';
import type { MuseumHallId } from '../../logic/museum-plan';
import {
  HALL_CLASS,
  hallBound,
  hallModel,
  modelComponents,
} from '../../logic/museum-hall-model';
import type { HallModel } from '../../logic/museum-hall-model';
import { HALL_EXHIBITS } from './exhibits';
import { stubDocument } from './walkways.test-support';

/**
 * Every museum hall works as the plant rooms do (the owner, 2026-10-30;
 * `doc/museum-hall-model.md`): each is a self-contained simulation with its
 * own model, and every mesh its exhibit draws belongs to a component bound
 * to a node, fitting, link or instrument of that model (by its `model`, or
 * by a tag the model derives), or marked decorative (placards, signs,
 * photographs, specimens). And nothing in the model is left undrawn.
 * Halls not yet in line fail here, by the owner's decision: the failures
 * are the to-do list. Do not skip them.
 */

beforeEach(() => stubDocument());
afterEach(() => vi.unstubAllGlobals());

/** What an identity is bound to in the hall's model, if anything. */
function boundTo(
  identity: ComponentIdentity | undefined,
  model: HallModel | undefined,
): string | undefined {
  if (!identity || !model) return undefined;
  if (identity.model && hallBound(identity.model, model)) {
    const [sort, id] = Object.entries(identity.model)[0];
    return `${sort === 'node' && model.instruments.has(id) ? 'instrument' : sort}: ${id}`;
  }
  const id = identity.tag ? model.byTag.get(identity.tag) : undefined;
  if (id === undefined) return undefined;
  if (model.nodes.has(id)) return `node: ${id}`;
  if (model.fittings.has(id)) return `fitting: ${id}`;
  if (model.instruments.has(id)) return `instrument: ${id}`;
  return undefined;
}

/** A hall exhibit's meshes owned by nothing bound or decorative, and the model components drawn. */
function audit(root: Object3D, model: HallModel | undefined) {
  const unbound = new Map<string, number>();
  const drawn = new Set<string>();
  root.traverse((o) => {
    const own = componentOf(o);
    const bound = boundTo(own, model);
    if (bound) drawn.add(bound);
    if (!(o instanceof Mesh)) return;
    // Its owner, or any whole it is a part of, decorative or bound.
    for (let p: Object3D | null = o; p; p = p.parent) {
      const id = componentOf(p);
      if (!id) continue;
      if (id.decorative || boundTo(id, model)) return;
    }
    const owner = owningComponent(o);
    let named: Object3D | null = owner?.object ?? o;
    while (named && !named.name) named = named.parent;
    const key =
      owner?.identity.tag ??
      owner?.identity.name ??
      named?.name ??
      '(unnamed mesh)';
    unbound.set(key, (unbound.get(key) ?? 0) + 1);
  });
  return { unbound: [...unbound.keys()].sort(), drawn };
}

async function built(id: MuseumHallId) {
  const load = HALL_EXHIBITS[id];
  if (!load) return undefined;
  const exhibit = (await load()).buildHallExhibit(createPanelKit());
  exhibit.reset(9 * 3600);
  exhibit.update?.(1 / 60);
  exhibit.object.updateMatrixWorld(true);
  return exhibit;
}

describe('every plant hall is bound to its own model, as the plant rooms are', () => {
  for (const id of MUSEUM_HALLS) {
    if (HALL_CLASS[id] === 'display') {
      it.skip(`${id}: a display hall (photos, placards, specimens, signs), exempt from simulation and binding`, () => {});
      continue;
    }
    it(`${id}: draws nothing that is neither bound to its model nor decorative`, async () => {
      const exhibit = await built(id);
      expect(exhibit, `${id} is a plant hall with no exhibit`).toBeDefined();
      const { unbound } = audit(exhibit!.object, hallModel(id));
      expect(
        unbound,
        `${id} draws these outside its model: bind each to a node, fitting, link or instrument of the hall's model, or mark it decorative`,
      ).toEqual([]);
    });

    it(`${id}: leaves nothing in its model undrawn`, async () => {
      const model = hallModel(id);
      expect(
        model,
        `${id} is a plant hall with no model of its own`,
      ).toBeDefined();
      const exhibit = await built(id);
      const { drawn } = audit(exhibit!.object, model);
      expect(
        modelComponents(model!).filter((c) => !drawn.has(c)),
        `${id}'s model has these, drawn by nothing in the hall`,
      ).toEqual([]);
    });
  }
});

describe('the display halls hold nothing of a plant hall', () => {
  for (const id of MUSEUM_HALLS.filter((h) => HALL_CLASS[h] === 'display'))
    it(`${id}: has no model and draws nothing bound to one (else reclass it as a plant hall)`, async () => {
      expect(hallModel(id)).toBeUndefined();
      const exhibit = await built(id);
      const modelled: string[] = [];
      exhibit?.object.traverse((o) => {
        const c = componentOf(o);
        if (c?.model) modelled.push(c.name ?? c.tag ?? o.name);
      });
      expect(modelled).toEqual([]);
    });
});

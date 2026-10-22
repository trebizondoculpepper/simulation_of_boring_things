/**
 * What every part of the plant network's construction shares: the
 * builder, the placeholders and why each is one, the site's boundaries,
 * and the heights things stand at. Pure.
 */
import type {
  Aspect,
  Hydraulic,
  Loss,
  NodeClass,
  NodeKind,
  PlantLink,
  PlantNode,
  Service,
  Status,
} from './types';

// ---- Placeholders: what is not yet modelled, and why --------------------------

export const GAP = {
  heating:
    'heating not yet in the network: the LTHW ring, boilers and pumps (step 3)',
  chemicals:
    'chemicals not yet in the network: the stores, dosing lines and pumps (step 5)',
  chemistry:
    'water chemistry not carried along the network: chlorine, pH, dosing control (step 5)',
  ozone:
    'ozone not yet in the network: generator output, injection and residual (step 5)',
  uv: 'UV dose not modelled: lamp output against flow (step 5)',
  electrics:
    'electrics not yet in the network: supply, isolator and starter (step 6)',
  levels:
    'levels not yet stepped: tanks and pools hold fixed levels until the world runs the network',
  weir: 'overflow over the pool’s edge needs its level stepped (weir flow)',
  overflow:
    'a tank’s overflow spills only when it is full, which needs its level stepped',
  float: 'float valve follows its tank’s level, which is not yet stepped',
  packaged:
    'packaged set internals not yet modelled: modelled as one pump between its pool connections',
} as const;

export const ph = (placeholder: string): Status => ({ placeholder });

// ---- A small builder ---------------------------------------------------------

/** The tag on a plate, from a proximal ID: `pl2.f3.bv2` is `PL2-F3-BV2`. */
export const tagOf = (id: string) => id.toUpperCase().replaceAll('.', '-');

export class NetworkBuilder {
  readonly nodes: PlantNode[] = [];
  readonly links: PlantLink[] = [];

  node(n: {
    id: string;
    name: string;
    kind: NodeKind;
    class: NodeClass;
    system: string;
    room?: string;
    ports: Record<string, Service>;
    hydraulic?: Hydraulic;
    normal?: PlantNode['normal'];
    aspects?: Partial<Record<Aspect, Status>>;
  }) {
    const plated = n.class === 'equipment' || n.class === 'valve';
    this.nodes.push({
      aspects: {},
      ...n,
      ...(plated ? { tag: tagOf(n.id) } : {}),
    });
    return n.id;
  }

  link(
    from: string,
    to: string,
    service: Service,
    loss?: Loss,
    aspects?: Partial<Record<Aspect, Status>>,
  ) {
    this.links.push({
      id: `${from}>${to}`,
      from,
      to,
      service,
      ...(loss ? { loss } : {}),
      ...(aspects ? { aspects } : {}),
    });
  }
}

// ---- The site's boundaries, placeholders for the systems still to build ------

/**
 * Where the plant meets the world outside: the town main and the sewer,
 * modelled; and, as placeholder boundaries, the systems still to build.
 */
export const SITE = {
  townMain: 'site.town-main',
  sewer: 'site.sewer',
  lthw: 'site.lthw',
  hypochlorite: 'site.hypochlorite',
  acid: 'site.acid',
  power: 'site.power',
} as const;

// ---- Heights ------------------------------------------------------------------

/**
 * Heights, metres, above the wet hall's floor, the lowest in the plant
 * (`sizing.ts`: levels 4 m apart, the wet hall on level 0). Each plant
 * room stands on its level, its pool's deck 3.5 m above its floor.
 */
export const STOREY = 4;
export const DECK_ABOVE_FLOOR = 3.5;
export const deckOn = (level: number) => level * STOREY + DECK_ABOVE_FLOOR;

/** The town main's pressure as a head, and where the sewer is reached, metres. */
export const TOWN_MAIN_HEAD = 30;
export const SEWER_HEAD = 1;
/** The break tank's working level, and the backwash holding tank's, sunk in its pit. */
export const BREAK_TANK_LEVEL = 1.5;
export const BACKWASH_TANK_LEVEL = -1;

/** The wet hall's mains, which every plant room's branch joins. */
export const WET_HALL = {
  makeUpMain: 'wh.mu.main',
  drainageMain: 'wh.dr.main',
} as const;

export function siteBoundaries(b: NetworkBuilder) {
  const boundary = (
    id: string,
    name: string,
    ports: Record<string, Service>,
    gap: string,
  ) =>
    b.node({
      id,
      name,
      kind: 'boundary',
      class: 'boundary',
      system: 'site',
      ports,
      aspects: { internals: ph(gap) },
    });
  b.node({
    id: SITE.townMain,
    name: 'Town main (the water company’s)',
    kind: 'boundary',
    class: 'boundary',
    system: 'site',
    ports: { out: 'make-up' },
    hydraulic: { kind: 'reservoir', level: TOWN_MAIN_HEAD },
    aspects: { hydraulics: 'modelled' },
  });
  b.node({
    id: SITE.sewer,
    name: 'Foul sewer',
    kind: 'boundary',
    class: 'boundary',
    system: 'site',
    ports: { in: 'drainage' },
    hydraulic: { kind: 'reservoir', level: SEWER_HEAD },
    aspects: { hydraulics: 'modelled' },
  });
  boundary(
    SITE.lthw,
    'LTHW heating ring',
    { flow: 'heating', return: 'heating' },
    GAP.heating,
  );
  boundary(
    SITE.hypochlorite,
    'Hypochlorite store',
    { out: 'chemical' },
    GAP.chemicals,
  );
  boundary(SITE.acid, 'Acid store', { out: 'chemical' }, GAP.chemicals);
  boundary(SITE.power, 'Electrical supply', { out: 'power' }, GAP.electrics);
}

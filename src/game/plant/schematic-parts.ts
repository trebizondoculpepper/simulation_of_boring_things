import type { PlumbEdge } from './plumbing-expansion';
import type { SchematicFitting, SchematicNode } from './schematics';
import { DAY_TANKS } from './chemical-distribution';
import type { DayTankSite } from './chemical-distribution';
import { isDoseBottle } from './dose-bottle';

/** Parts every room's schematic is made of (prompt 064). Pure. */

/** A link, from a node's port to another's. */
export const link = (
  id: string,
  from: [string, string],
  to: [string, string],
  medium: PlumbEdge['medium'],
): PlumbEdge => ({
  id,
  sourceId: from[0],
  sourcePort: from[1],
  targetId: to[0],
  targetPort: to[1],
  medium,
});

/**
 * A room's electrics, the same in every room: its supply into its
 * switch-fuse (`<room> room supply`), the switch-fuse's feed to its
 * distribution conduit (`<room> room feed`), and a feed from the conduit
 * to each machine that takes power (`<name> power`).
 */
export function roomElectrics(
  room: string,
  powered: readonly SchematicNode[],
): { nodes: SchematicNode[]; links: PlumbEdge[] } {
  return {
    nodes: [
      { id: 'supply', kind: 'room-supply', name: 'Room supply' },
      {
        id: 'switch-fuse',
        kind: 'switch-fuse',
        name: 'Room supply switch-fuse',
      },
      {
        id: 'distribution',
        kind: 'distribution-conduit',
        name: `${room} distribution conduit`,
      },
      // Its panels' compartmented trunking (`control-bus.ts`), where it has one.
      { id: 'control-bus', kind: 'control-bus', name: 'Control bus' },
    ],
    links: [
      link(
        `${room} room supply`,
        ['supply', 'out'],
        ['switch-fuse', 'in'],
        'power',
      ),
      link(
        `${room} room feed`,
        ['switch-fuse', 'out'],
        ['distribution', 'in'],
        'power',
      ),
      ...powered.map((n) =>
        link(
          `${n.name} power`,
          ['distribution', 'out'],
          [n.id, 'power'],
          'power',
        ),
      ),
    ],
  };
}

const CHEMICAL_NAME = { hypochlorite: 'Hypochlorite', acid: 'Acid' } as const;

/** A chemical line's valve (plan 085): a PVC-U ball valve worked by hand, unless the schematic says otherwise. */
export const chemicalValve = (
  id: string,
  edge: string,
  end: 'source' | 'target',
  role: string,
  {
    normally = 'open',
    operator = 'lever',
    keptBy,
  }: {
    normally?: 'open' | 'closed';
    operator?: SchematicFitting['operator'];
    keptBy?: SchematicFitting['keptBy'];
  } = {},
): SchematicFitting => ({
  id,
  kind: 'isolating-valve',
  edge,
  end,
  normally,
  role,
  ...(operator ? { operator } : {}),
  ...(keptBy ? { keptBy } : {}),
});

/** A chemical line's non-return valve (plan 085). */
export const chemicalCheck = (
  id: string,
  edge: string,
  end: 'source' | 'target',
  role: string,
): SchematicFitting => ({
  id,
  kind: 'non-return-valve',
  edge,
  end,
  normally: 'open',
  role,
});

/**
 * A plant room's day tanks (plan 085): for each chemical, its branch from
 * the wet hall's transfer selector (a boundary), the day tank it fills,
 * and the day tank's draw-off to `to` (the room's dosing pump, or its
 * packaged cabinet's dosing). Its valves: each day tank's inlet isolating
 * valve on its branch, and, on a framed day tank (not a dose bottle), the
 * actuated inlet valve the distribution opens while it fills; its outlet
 * isolating valve on its draw-off; and, where `dosingIsolation`, an
 * isolating valve where the draw-off meets what doses (a spa cabinet's
 * dosing inlet). Each day tank's code: DT1 the hypochlorite's, DT2 the
 * acid's.
 */
export function dayTanks(
  to: Record<'hypochlorite' | 'acid', [string, string]>,
  site: DayTankSite,
  { dosingIsolation = false }: { dosingIsolation?: boolean } = {},
): {
  nodes: SchematicNode[];
  links: PlumbEdge[];
  fittings: SchematicFitting[];
} {
  const chemicals = ['hypochlorite', 'acid'] as const;
  const fill = (c: (typeof chemicals)[number]) =>
    `${CHEMICAL_NAME[c]} branch to its day tank`;
  const draw = (c: (typeof chemicals)[number]) =>
    `${CHEMICAL_NAME[c]} from its day tank`;
  // Its fittings' ids, unique in the building: by the room's code.
  const room = `PL${site.slice(-1)}`;
  const framed = (c: (typeof chemicals)[number]) => {
    const t = DAY_TANKS[c].find((x) => x.site === site);
    return t !== undefined && !isDoseBottle(t.litres);
  };
  return {
    nodes: chemicals.flatMap((c) => [
      {
        id: `${c}-branch`,
        kind: 'chemical-branch',
        name: `${CHEMICAL_NAME[c]} branch from the wet hall`,
      },
      {
        id: `${c}-day`,
        kind: 'chem-day',
        name: `${CHEMICAL_NAME[c]} day tank`,
        code: c === 'hypochlorite' ? 'DT1' : 'DT2',
      },
    ]),
    links: chemicals.flatMap((c) => [
      link(fill(c), [`${c}-branch`, 'out'], [`${c}-day`, 'fill'], 'chemical'),
      link(draw(c), [`${c}-day`, 'out'], to[c], 'chemical'),
    ]),
    // From each tank outward: its actuated inlet (a framed tank's), its
    // inlet isolating valve; its outlet isolating valve; the dosing end's.
    fittings: chemicals.flatMap((c) => [
      ...(framed(c)
        ? [
            chemicalValve(
              `${room}.${c}-day.fill.actuated`,
              fill(c),
              'target',
              'transfer inlet',
              {
                normally: 'closed',
                operator: 'motor',
                keptBy: 'distribution',
              },
            ),
          ]
        : []),
      chemicalValve(
        `${room}.${c}-day.fill.iso`,
        fill(c),
        'target',
        'inlet isolation',
      ),
      chemicalValve(
        `${room}.${c}-day.out.iso`,
        draw(c),
        'source',
        'outlet isolation',
      ),
      ...(dosingIsolation
        ? [
            chemicalValve(
              `${room}.${to[c][0]}.${to[c][1]}.iso`,
              draw(c),
              'target',
              'dosing isolation',
            ),
          ]
        : []),
    ]),
  };
}

/**
 * A chemical store's transfer (plan 085): its tanks' draw-offs into its
 * transfer pump, and the pump's discharge into its main to the wet hall
 * (a boundary). Its valves, as its skid and tanks carry them: each tank's
 * draw-off isolating valve; the pump's suction isolating valve, once, on
 * the header the draw-offs share; its discharge's non-return valve and
 * isolating valve.
 */
export function storeTransfer(
  chemical: 'hypochlorite' | 'acid',
  tanks: readonly string[],
): {
  nodes: SchematicNode[];
  links: PlumbEdge[];
  fittings: SchematicFitting[];
} {
  const name = CHEMICAL_NAME[chemical];
  const drawOff = (i: number) =>
    `${name} bulk tank ${i + 1} to its transfer pump`;
  const main = `${name} main`;
  // Its fittings' ids, unique in the building: by the store's code.
  const store = chemical === 'acid' ? 'AS' : 'HS';
  return {
    nodes: [
      {
        id: 'transfer',
        kind: 'chem-pump',
        name: `${name} transfer pump`,
        code: 'P1',
      },
      {
        id: 'main',
        kind: 'chemical-main',
        name: `${name} main to the wet hall`,
      },
    ],
    links: [
      ...tanks.map((t, i) =>
        link(drawOff(i), [t, 'out'], ['transfer', 'in'], 'chemical'),
      ),
      link(main, ['transfer', 'out'], ['main', 'in'], 'chemical'),
    ],
    fittings: [
      ...tanks.map((t, i) =>
        chemicalValve(
          `${store}.${t}.out.iso`,
          drawOff(i),
          'source',
          'outlet isolation',
        ),
      ),
      chemicalValve(
        `${store}.transfer.in.iso`,
        drawOff(0),
        'target',
        'pump suction isolation',
      ),
      chemicalCheck(
        `${store}.transfer.out.nrv`,
        main,
        'source',
        'pump discharge non-return',
      ),
      chemicalValve(
        `${store}.transfer.out.iso`,
        main,
        'source',
        'pump discharge isolation',
      ),
    ],
  };
}

/**
 * The wet hall's transfer selectors (plan 085): for each chemical, its
 * main in from its store (a boundary), its selector, and its live outlets'
 * branches to the four plant rooms (boundaries); its spares blanked, so
 * not in the model. Each live outlet's valves, as the selector carries
 * them, from its header outward: its manual isolating valve, then the
 * actuated valve the distribution opens for the outlet it serves. The
 * selectors' codes: XS1 the hypochlorite's, XS2 the acid's.
 *
 * Their transfer control (prompt 091): an OT-216 terminal for each line,
 * a serial data link from each to the control box; the box's control
 * links to both selectors (the outlet to open in AUTO) and to both
 * transfer pumps' remote run at their stores (boundaries), the day tanks'
 * level signals in from the plant rooms (boundaries), and its power from
 * the hall's distribution (`wet-hall-schematic.ts`).
 */
export function transferSelectors(): {
  nodes: SchematicNode[];
  links: PlumbEdge[];
  fittings: SchematicFitting[];
} {
  const chemicals = ['hypochlorite', 'acid'] as const;
  const rooms = [1, 2, 3, 4];
  const branch = (c: (typeof chemicals)[number], r: number) =>
    `${CHEMICAL_NAME[c]} branch to PL${r}`;
  return {
    nodes: [
      {
        id: 'control-box',
        kind: 'chem-control-box',
        name: 'Chemical transfer control box',
      },
      ...chemicals.flatMap((c) => [
        {
          id: `${c}-terminal`,
          kind: 'chem-terminal',
          name: `${CHEMICAL_NAME[c]} transfer terminal`,
        },
        {
          id: `${c}-pump-run`,
          kind: 'remote-signal',
          name: `${CHEMICAL_NAME[c]} transfer pump's remote run, at its store`,
        },
        {
          id: `${c}-levels`,
          kind: 'remote-signal',
          name: `${CHEMICAL_NAME[c]} day tanks' level signals, from the plant rooms`,
        },
        {
          id: `${c}-main`,
          kind: 'chemical-main',
          name: `${CHEMICAL_NAME[c]} main from its store`,
        },
        {
          id: `${c}-selector`,
          kind: 'chem-selector',
          name: `${CHEMICAL_NAME[c]} transfer selector`,
          code: c === 'hypochlorite' ? 'XS1' : 'XS2',
        },
        ...rooms.map((r) => ({
          id: `${c}-pl${r}`,
          kind: 'chemical-branch',
          name: `${CHEMICAL_NAME[c]} branch to PL${r}`,
        })),
      ]),
    ],
    links: chemicals.flatMap((c) => [
      link(
        `${CHEMICAL_NAME[c]} terminal's data link to the control box`,
        [`${c}-terminal`, 'data'],
        ['control-box', `data-${c}`],
        'control',
      ),
      link(
        `Control box to the ${CHEMICAL_NAME[c].toLowerCase()} selector`,
        ['control-box', `selector-${c}`],
        [`${c}-selector`, 'control'],
        'control',
      ),
      link(
        `Control box to the ${CHEMICAL_NAME[c].toLowerCase()} pump's remote run`,
        ['control-box', `pump-${c}`],
        [`${c}-pump-run`, 'in'],
        'control',
      ),
      link(
        `${CHEMICAL_NAME[c]} day tanks' levels to the control box`,
        [`${c}-levels`, 'out'],
        ['control-box', `levels-${c}`],
        'control',
      ),
      link(
        `${CHEMICAL_NAME[c]} main to its selector`,
        [`${c}-main`, 'out'],
        [`${c}-selector`, 'in'],
        'chemical',
      ),
      ...rooms.map((r) =>
        link(
          branch(c, r),
          [`${c}-selector`, `outlet-${r}`],
          [`${c}-pl${r}`, 'in'],
          'chemical',
        ),
      ),
    ]),
    fittings: chemicals.flatMap((c) =>
      rooms.flatMap((r) => [
        chemicalValve(
          `WH.${c}-selector.outlet-${r}.iso`,
          branch(c, r),
          'source',
          'outlet isolation',
        ),
        chemicalValve(
          `WH.${c}-selector.outlet-${r}.actuated`,
          branch(c, r),
          'source',
          'outlet transfer',
          { normally: 'closed', operator: 'motor', keptBy: 'distribution' },
        ),
      ]),
    ),
  };
}

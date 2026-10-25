import { describe, expect, it } from 'vite-plus/test';
import {
  describeComponent,
  equipmentLine,
  formatStatus,
  naturalCompare,
  ordinal,
  placesByKind,
  powerPurpose,
  valvePurpose,
} from './component-descriptions';
import type { DescribedSubject } from './component-descriptions';
import {
  componentDescription,
  describedComponents,
  plantInventory,
} from './equipment-catalogue';
import { EQUIPMENT_KINDS, isKindId } from './equipment-kinds';
import {
  describeForWorld,
  inventoryForWorld,
  worldContext,
} from './component-status';
import { INSTALLED_VALVES } from './installed-valves';
import { newWorld } from '../world';
import type { World } from '../world';
import type { MotorTag } from './motor-starters';

const subject = (
  key: string,
  over: Partial<DescribedSubject> = {},
): DescribedSubject => ({
  key,
  tag: key,
  kind: 'pump',
  location: 'PL2',
  ...over,
});

/** The world with the named motors' starters running, tripped or stopped. */
function withMotors(
  world: World,
  states: Partial<Record<MotorTag, { running?: boolean; tripped?: boolean }>>,
): World {
  const starters = { ...world.motors.starters };
  for (const [tag, s] of Object.entries(states) as [
    MotorTag,
    { running?: boolean; tripped?: boolean },
  ][])
    starters[tag] = {
      ...starters[tag],
      running: s.running ?? false,
      tripped: s.tripped ?? false,
    };
  return { ...world, motors: { ...world.motors, starters } };
}

describe('the wording', () => {
  it('counts 1st, 2nd, 3rd, 4th, 11th to 13th, 21st, 101st', () => {
    expect(
      [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111, 112].map(ordinal),
    ).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
      '101st',
      '111th',
      '112th',
    ]);
  });

  it('says what a valve isolates, from its route, or nothing without one', () => {
    expect(
      valvePurpose({
        from: 'the circulation pumps',
        to: 'sand filter 1',
        medium: 'water',
      }),
    ).toBe(
      'Isolates water flowing from the circulation pumps to sand filter 1.',
    );
    expect(valvePurpose(undefined)).toBeUndefined();
  });

  it('says what an isolator isolates, and where equipment is and how it is', () => {
    expect(powerPurpose('the jacuzzi plant room')).toBe(
      'Isolates power for the jacuzzi plant room.',
    );
    expect(equipmentLine(1, 'Pump', 'PL2', 'Off')).toBe(
      'The 1st pump in Plant Room 2, currently Off',
    );
    expect(equipmentLine(2, 'Sand filter', 'PL1')).toBe(
      'The 2nd sand filter in Plant Room 1',
    );
  });

  it('uses definite articles and long locations, retaining technical acronyms', () => {
    expect(equipmentLine(1, 'Calorifier', 'BH', undefined, 1)).toBe(
      'The only calorifier in the boiler house',
    );
    expect(equipmentLine(3, 'Boiler', 'BH', undefined, 6)).toBe(
      'The 3rd boiler in the boiler house',
    );
    expect(equipmentLine(2, 'Pump', 'PL1', undefined, 2)).toBe(
      'The 2nd pump in Plant Room 1',
    );
    expect(equipmentLine(1, 'BMS outstation', 'CR', undefined, 1)).toBe(
      'The only BMS outstation in the plant control room',
    );
    expect(componentDescription('B-503')).toBe(
      'The 3rd boiler in the boiler house',
    );
    expect(componentDescription('BH-T2')).toBe(
      'The only calorifier in the boiler house',
    );
  });

  it('words each status, Tripped before On, a level as a whole percentage', () => {
    expect(
      formatStatus('motor', { policy: 'motor', running: true, tripped: true }),
    ).toBe('Tripped');
    expect(
      formatStatus('motor', { policy: 'motor', running: true, tripped: false }),
    ).toBe('On');
    expect(formatStatus('level', { policy: 'level', fraction: 0.684 })).toBe(
      '68 % full',
    );
    expect(formatStatus('level', { policy: 'level', fraction: 1.2 })).toBe(
      '100 % full',
    );
    // A state of the wrong shape for the kind is no status at all.
    expect(
      formatStatus('level', { policy: 'switch', on: true }),
    ).toBeUndefined();
    expect(formatStatus('motor', undefined)).toBeUndefined();
  });
});

describe('places among a room’s items of a kind', () => {
  it('orders tags naturally: numbers as numbers, then letters', () => {
    const tags = ['PL2-P10', 'PL2-P2', 'P-101B', 'P-101A', 'PL2-F1-FT1'];
    expect([...tags].sort(naturalCompare)).toEqual([
      'P-101A',
      'P-101B',
      'PL2-F1-FT1',
      'PL2-P2',
      'PL2-P10',
    ]);
  });

  it('ranks per room and kind, whatever order they come in, rooms unranked', () => {
    const items = [
      subject('PL2-P10'),
      subject('PL2-P2'),
      subject('PL1-P1', { location: 'PL1' }),
      subject('PL2-F1', { kind: 'sand-filter' }),
      subject('PL2', { kind: 'plant-room', unranked: true }),
    ];
    const places = placesByKind(items);
    expect(places.get('PL2-P2')).toBe(1);
    expect(places.get('PL2-P10')).toBe(2);
    expect(places.get('PL1-P1')).toBe(1);
    expect(places.get('PL2-F1')).toBe(1);
    expect(places.has('PL2')).toBe(false);
    expect(placesByKind([...items].reverse())).toEqual(places);
    // Adding an earlier-numbered item moves the later ones on, keeping their identities.
    expect(placesByKind([...items, subject('PL2-P1')]).get('PL2-P10')).toBe(3);
  });

  it('counts a room’s control panels together, whatever their kinds', () => {
    // The owner, 2026-10-25: PL2-CP3 was "the only Control panel in PL2".
    const { places, subjects } = describedComponents();
    const cp1 = subjects.get('PL2-CP1')!;
    const cp3 = subjects.get('PL2-CP3')!;
    expect(cp1.kind).not.toBe(cp3.kind);
    expect(places.get(cp1.key)).toBe(1);
    expect(places.get(cp3.key)).toBe(2);
    expect(describeComponent(cp3, places)).toMatch(
      /^The 2nd control panel in Plant Room 2/,
    );
  });

  it('ranks the Olympic pumps apart from their pump set', () => {
    const { places, subjects } = describedComponents();
    expect(places.get(subjects.get('P-101A')!.key)).toBe(1);
    expect(places.get(subjects.get('P-101B')!.key)).toBe(2);
    expect(subjects.get('PL2-P1')!.kind).toBe('pump-pair');
    expect(places.get(subjects.get('PL2-P1')!.key)).toBe(1);
  });
});

describe('descriptions of the plant', () => {
  it('describes every valve in the Olympic plant room from its enhanced network', () => {
    expect(componentDescription('PL2-F1-V1')).toBe(
      'Isolates water flowing from the circulation pumps to sand filter 1.',
    );
    expect(componentDescription('PL2-F1-V4')).toBe(
      "Isolates water flowing from sand filter 1 to the main plant's drain.",
    );
    expect(componentDescription('PL2-T2-IV1')).toBe(
      'Isolates water flowing from the filters and the heat exchanger to the ozone contact tank.',
    );
    expect(componentDescription('PL2-HX1-IV3')).toBe(
      "Isolates heating water flowing from the main plant's heating flow to the heat exchanger.",
    );
  });

  it('describes the valves of the rooms built from their model, and no other', () => {
    const described = Object.values(INSTALLED_VALVES).filter((v) =>
      Boolean(componentDescription(v.tag)),
    );
    // Every Olympic valve but those drawn without a fitting of the enhanced
    // network to stand for them (prompt 063): its regulating valve, and its
    // pumps' two discharge valves, split by the room from the one fitting
    // the plumber sets on the pump block's single discharge port.
    const notInNetwork = ['PL2-F-RV1', 'PL2-P1-IV3', 'PL2-P1-IV4'];
    expect(described.map((v) => v.tag).sort()).toEqual(
      Object.values(INSTALLED_VALVES)
        .map((v) => v.tag)
        .filter(
          (t) =>
            (t.startsWith('PL2-') && !notInNetwork.includes(t)) ||
            t.startsWith('PL1-') ||
            t.startsWith('WH-') ||
            t.startsWith('BH-') ||
            t.startsWith('PL3-') ||
            t.startsWith('PL4-'),
        )
        .sort(),
    );
    // The jacuzzi's, from its schematic (prompt 064).
    expect(componentDescription('PL3-BT1-IV1')).toBe(
      'Isolates water flowing from the water service to the jacuzzi balance tank.',
    );
    // A room not yet in the model: none.
    expect(componentDescription('PL2-F-RV1')).toBe('');
  });

  it('describes the 1st Olympic pump by its own starter, live', () => {
    const stopped = withMotors(newWorld(), { 'P-101A': {}, 'P-101B': {} });
    expect(describeForWorld(stopped, 'P-101A')).toBe(
      'The 1st pump in Plant Room 2, currently Off',
    );
    expect(describeForWorld(stopped, 'P-101B')).toBe(
      'The 2nd pump in Plant Room 2, currently Off',
    );
    const running = withMotors(stopped, { 'P-101A': { running: true } });
    expect(describeForWorld(running, 'P-101A')).toBe(
      'The 1st pump in Plant Room 2, currently On',
    );
    const tripped = withMotors(stopped, {
      'P-101A': { running: true, tripped: true },
    });
    expect(describeForWorld(tripped, 'P-101A')).toBe(
      'The 1st pump in Plant Room 2, currently Tripped',
    );
    // The pump set is described apart, by both its pumps.
    expect(describeForWorld(running, 'PL2-P1')).toBe(
      'The only pump set in Plant Room 2, currently P-101A On, P-101B Off',
    );
  });

  it('leaves the status out without the world, and for kinds it keeps none of', () => {
    expect(componentDescription('P-101A')).toBe('The 1st pump in Plant Room 2');
    expect(describeForWorld(newWorld(), 'PL2-F1')).toBe(
      'The 1st sand filter in Plant Room 2',
    );
    // A binding that finds nothing gives no status, not Off.
    const s = subject('X-1');
    expect(
      describeComponent(s, new Map([['X-1', 1]]), { status: () => undefined }),
    ).toBe('The 1st pump in Plant Room 2');
  });

  it('gives tanks their level and switch-fuses the power they isolate', () => {
    const world = newWorld();
    expect(describeForWorld(world, 'PL3-BT1')).toMatch(
      /^The only balance tank in Plant Room 3, currently \d+ % full$/,
    );
    expect(describeForWorld(world, 'PL3-SF1')).toBe(
      'Isolates power for the jacuzzi plant room.',
    );
    expect(describeForWorld(world, 'PL3-CAB1')).toMatch(
      /^The only packaged cabinet in Plant Room 3, currently /,
    );
    expect(componentDescription('PL3')).toBe('');
  });

  it('is one description for the inventory, the world and a tag', () => {
    const world = withMotors(newWorld(), { 'P-101A': { running: true } });
    const live = inventoryForWorld(world);
    for (const entry of live)
      expect(entry.purpose, entry.id).toBe(describeForWorld(world, entry.id));
    // Without a snapshot: the same, less the live status.
    for (const entry of plantInventory())
      expect(entry.purpose, entry.id).toBe(componentDescription(entry.id));
    expect(live.find((e) => e.id === 'P-101A')?.purpose).toBe(
      'The 1st pump in Plant Room 2, currently On',
    );
    expect(worldContext(world).status).toBeDefined();
  });

  it('knows every kind it describes, and never shows a kind’s generic purpose', () => {
    const { subjects } = describedComponents();
    const generic = new Set<string>(
      Object.values(EQUIPMENT_KINDS).map((k) => k.purpose),
    );
    for (const s of subjects.values()) {
      expect(isKindId(s.kind), `${s.tag} ${s.kind}`).toBe(true);
      expect(generic.has(componentDescription(s.tag)), s.tag).toBe(false);
    }
    expect(subjects.size).toBeGreaterThan(200);
  });

  it('calls a room’s one item of a kind its only one, and numbers the rest (the owner, 2026-10-25)', () => {
    expect(equipmentLine(1, 'UV unit', 'PL1', undefined, 1)).toBe(
      'The only UV unit in Plant Room 1',
    );
    expect(equipmentLine(1, 'Pump', 'PL2', undefined, 2)).toBe(
      'The 1st pump in Plant Room 2',
    );
  });
});

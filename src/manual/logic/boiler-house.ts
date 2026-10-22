import { BOILER } from '../../game/plant/heat-loop';
import { GAS_DETECTOR, GAS_HOUSE, GAS_METER } from '../../game/plant/gas-house';
import { ROOM_SERVICES } from '../../game/plant/services';
import { START_ORDER } from '../../game/plant/startup';
import { LIGHTING_ZONES, zoneOfRoom } from '../../game/plant/lighting';
import { layoutRoom } from '../../toolkit/gallery/logic/room-equipment';
import type { Placed } from '../../toolkit/gallery/logic/room-equipment';
import { SHELL_ROOMS } from '../../toolkit/gallery/logic/shell-rooms';
import { SWITCHBOARD_FEEDS } from '../../toolkit/gallery/logic/switch-room';
import { DOOR_WARNING_PRESETS } from '../../toolkit/components/architectural/logic/door-warnings';
import type { DoorStickerId } from '../../toolkit/components/architectural/logic/door-warnings';
import { brandById } from '../../toolkit/components/core/logic/brands';
import type { BrandId } from '../../toolkit/components/core/logic/brands';
import type { Block, Chapter, FigureSource } from './document';
import { compositeDot, kindName, symbolsUsed } from './schematic';
import type { SchematicOptions } from './schematic';
import { roomPlanSvg } from './room-plan';

/**
 * The boiler house's chapter of the manual, gathered from the model: the
 * room and its doors (`shell-rooms.ts`), its equipment where the layout
 * puts it and who made each piece (the machines' exhibits), the boilers'
 * and gas house's settings (`heat-loop.ts`, `gas-house.ts`), its supplies
 * (`services.ts`, the switchboard, the lighting board), the order SLOW
 * START brings it in (`startup.ts`), and the signs at its door. Only the
 * wording round the numbers is written here. Pure: the machines'
 * catalogue is handed in by the build, which can load the 3D models.
 */

/** What the manual needs of a machine's model. */
export interface ExhibitInfo {
  title: string;
  maker?: BrandId;
}

const ROOM = 'boiler_house';
const TAG = 'BH';

/** Each door sign's words, as the manual lists them (`door-warning-stickers.ts`). */
const SIGN_WORDS: Record<DoorStickerId, string> = {
  authorised: 'No entry: authorised personnel only',
  'moving-machinery': 'Caution: pumps start automatically',
  'hot-surfaces': 'Caution: hot surfaces',
  'gas-equipment': 'Gas equipment: isolate before service',
  'corrosive-chemicals': 'Danger: corrosive substances',
  'keep-chemicals-apart': 'Never mix acid and hypochlorite',
  'live-electrical': 'Danger: 400 volts',
  'shoe-coverings': 'Wear shoe coverings before entering the pool',
  'ear-protection': 'Hearing protection zone: ear protection must be worn',
  'chemical-ppe': 'Chemical PPE must be worn',
  'no-flames': 'No smoking or naked flames',
  'fire-door': 'Fire door: keep shut',
};

const mm = (m: number) => String(Math.round(m * 1000));

/** The gas house's parts on its schematic: their tags and symbols. */
const GAS_DRAWING: SchematicOptions = {
  tags: {
    ecv: 'ECV',
    meter: 'GM-1',
    ssov: 'SSOV-1',
    detector: 'GD-1',
    stop: 'ES-1',
  },
  symbols: {
    ecv: 'manual-valve',
    meter: 'meter',
    ssov: 'solenoid-valve',
    detector: 'gas-detector',
    stop: 'emergency-stop',
  },
};

/** Where an item stands, in words. */
const location = (p: Placed) =>
  p.side === 'island'
    ? 'Free-standing'
    : `${p.side[0].toUpperCase()}${p.side.slice(1)} wall${p.item.mount === 'wall' ? `, ${(p.item.y ?? 1.5).toFixed(1)} m up` : ''}`;

export function boilerHouseChapter(
  exhibitFor: (kind: string) => ExhibitInfo | undefined,
): { chapter: Chapter; figures: FigureSource[] } {
  const layout = layoutRoom(ROOM);
  if (!layout) throw new Error('The boiler house has no layout');
  const shell = SHELL_ROOMS[ROOM];
  // Its plant, in the order the layout lists it, signs left out.
  const placed = layout.placed.filter((p) => !p.item.key.startsWith('sign:'));
  const tagged = placed.map((p, i) => ({
    p,
    tag: `${TAG}-${String(i + 1).padStart(2, '0')}`,
    info: exhibitFor(p.item.key.split(':')[0]),
  }));
  const cascades = placed.filter((p) =>
    p.item.key.startsWith('boiler-cascade'),
  );
  const boilers = cascades.length * 2;
  const b = BOILER.params;
  const meter = GAS_METER.params;
  const detector = GAS_DETECTOR.params;
  const zone = zoneOfRoom(ROOM);
  const way = Object.entries(SWITCHBOARD_FEEDS).find(([, rooms]) =>
    rooms.includes(ROOM),
  )?.[0];
  const stage = START_ORDER.indexOf(ROOM) + 1;
  const tagOf = (key: string) =>
    tagged.find((t) => t.p.item.key.startsWith(key))?.tag ?? '';

  const figures: FigureSource[] = [
    {
      file: 'boiler-house-plan',
      kind: 'svg',
      source: roomPlanSvg({
        title: 'Boiler house: equipment location plan',
        w: layout.box.w,
        d: layout.box.d,
        doors: shell.doors.map((d) => ({
          wall: d.wall,
          at: d.at,
          width: 1.8,
          label: `To ${d.to.replaceAll('_', ' ')}`,
        })),
        items: tagged.map(({ p, tag }) => ({
          tag,
          ...p.footprint,
          wall: p.item.mount === 'wall',
        })),
      }),
    },
    {
      file: 'boiler-house-gas',
      kind: 'dot',
      source: compositeDot('Gas house', GAS_HOUSE.composite!, GAS_DRAWING),
      symbols: symbolsUsed(GAS_DRAWING),
    },
  ];

  const blocks: Block[] = [
    { kind: 'heading', text: 'Purpose' },
    {
      kind: 'para',
      text: `The boiler house raises the low temperature hot water (LTHW) that heats the pools, through their plate heat exchangers, the air handling plant's heater batteries and the domestic hot water calorifier. It holds ${boilers} gas-fired condensing boilers of ${b.power} kW each, in ${cascades.length} cascades, with the low-loss header, the LTHW circulators, the pressurisation unit and the calorifier, and is fed from the street through the gas house: the emergency control valve, the meter, the safety shut-off valve, the gas detection and the emergency stop.`,
    },
    {
      kind: 'para',
      text: `The room is ${shell.w} m by ${shell.d} m and ${shell.height} m high, entered from the main corridor through a single fire door in its ${shell.doors[0].wall} wall. Drawing 1 shows where each item stands; the schedule below lists them by tag.`,
    },
    {
      kind: 'figure',
      file: 'boiler-house-plan',
      caption:
        'Boiler house: equipment location plan. Floor-standing plant shaded, wall-hung plant dashed.',
      width: 0.85,
    },
    { kind: 'heading', text: 'Equipment schedule' },
    {
      kind: 'table',
      caption: 'Boiler house equipment',
      columns: [
        { head: 'Tag' },
        { head: 'Item', width: 0.28 },
        { head: 'Maker', width: 0.19 },
        { head: 'W × D × H (mm)', align: 'right' },
        { head: 'Location', width: 0.17 },
      ],
      rows: tagged.map(({ p, tag, info }) => [
        tag,
        p.item.label,
        info?.maker
          ? brandById(info.maker).name
          : 'Bramhall Fenwick (site-built)',
        `${mm(p.item.w)} × ${mm(p.item.d)} × ${mm(p.item.h)}`,
        location(p),
      ]),
    },
    { kind: 'heading', text: 'Boiler settings' },
    {
      kind: 'table',
      caption: 'Each boiler, as commissioned',
      columns: [
        { head: 'Setting', width: 0.6 },
        { head: 'Value', align: 'right' },
      ],
      rows: [
        ['Output at full fire', `${b.power} kW`],
        ['Flow temperature setpoint', `${b.setpoint} °C`],
        ['Modulating band', `${b.band} K`],
        ['High limit (locks out above)', `${b.highLimit} °C`],
        ['Return limit (shuts down above)', `${b.returnLimit} °C`],
        ['Minimum flow to fire (flow switch)', `${b.minFlow} m³/h`],
        ['Minimum gas pressure to fire', `${b.minGasPressure} mbar`],
        ['Minimum water pressure to fire', `${b.minWaterPressure} bar`],
        ['Pre-purge, then ignition', `${b.purge} s, then ${b.ignition} s`],
      ],
    },
    { kind: 'heading', text: 'Gas supply' },
    {
      kind: 'para',
      text: `Gas comes in from the street through the emergency control valve (ECV) and the meter, which governs it to ${meter.supply} mbar; the pressure at the boilers falls with the flow, by about ${meter.loss} mbar at ${meter.atFlow} m³/h. The safety shut-off valve (SSOV-1) is held open only while its permits are made: the ECV open, no gas detected and the emergency stop out. Once it has tripped it stays shut until it is reset with every permit made again. The gas detector (GD-1) alarms at ${detector.alarmAt} % of the lower explosive limit and holds its alarm until reset.`,
    },
    {
      kind: 'figure',
      file: 'boiler-house-gas',
      caption:
        'Gas house: control schematic, drawn from the plant model. Solid arrows are signals between its parts; dashed ones its connections to the rest of the plant.',
      width: 1,
    },
    {
      kind: 'table',
      caption: 'Gas house parts',
      columns: [{ head: 'Tag' }, { head: 'Part', width: 0.5 }],
      rows: Object.entries(GAS_HOUSE.composite!.blocks).map(([id, block]) => [
        {
          ecv: 'ECV',
          meter: 'GM-1',
          ssov: 'SSOV-1',
          detector: 'GD-1',
          stop: 'ES-1',
        }[id] ?? id,
        kindName(block.kind.kind),
      ]),
    },
    { kind: 'heading', text: 'Supplies' },
    {
      kind: 'table',
      caption: 'What the boiler house needs, and where it comes from',
      columns: [
        { head: 'Supply', width: 0.3 },
        { head: 'From', width: 0.6 },
      ],
      rows: [
        [
          'Electricity',
          `Main switchboard, way ${way ?? '(none)'}; the room's feeder isolator beside its door`,
        ],
        [
          'Lighting',
          zone
            ? `Lighting board DB-L1, way ${LIGHTING_ZONES[zone].way} (${LIGHTING_ZONES[zone].name})`
            : 'None',
        ],
        ...ROOM_SERVICES[ROOM]
          .filter((u) => u !== 'power')
          .map((u) => [
            u === 'water'
              ? 'Water'
              : u === 'air'
                ? 'Combustion and ventilation air'
                : u,
            u === 'water'
              ? 'The wet hall: mains break tank and booster set'
              : u === 'air'
                ? 'The air handling plant'
                : '',
          ]),
        ['Gas', 'The street main, through the gas house'],
      ],
    },
    { kind: 'heading', text: 'Starting the boiler house' },
    {
      kind: 'para',
      text: `SLOW START on the scenario simulator brings the boiler house in at stage ${stage} of ${START_ORDER.length}, after ${START_ORDER.slice(
        0,
        stage - 1,
      )
        .map((r) => r.replaceAll('_', ' '))
        .join(' and ')}. To start it by hand:`,
    },
    {
      kind: 'steps',
      items: [
        `At the main switchboard in the switch room, close way ${way ?? ''}.`,
        'At the boiler house door, switch its feeder isolator on. Its green lamp lights.',
        'Open the emergency control valve (ECV) on the gas train.',
        'Check the gas detection panel shows no alarm and the emergency stop is out; press RESET to open the safety shut-off valve.',
        `Check the system pressure on the pressurisation unit is above ${b.minWaterPressure} bar.`,
        `Start the LTHW circulators (${tagOf('lthw-pumps')}): the boilers will not fire below ${b.minFlow} m³/h through them.`,
        `The boilers then fire in cascade, purging and lighting in turn, and modulate to hold the flow at ${b.setpoint} °C.`,
      ],
    },
    {
      kind: 'warning',
      title: 'Gas emergency',
      text: 'If you smell gas or the gas alarm sounds: do not operate electrical switches or use naked flames. Press the emergency stop, or shut the emergency control valve if it is safe to reach. Open doors to ventilate, leave the room and keep others out. From a safe place, call the gas emergency number on the notice at the gas train. Do not re-enter or reset the gas supply until the cause has been found and put right by a Gas Safe registered engineer.',
    },
    { kind: 'heading', text: 'Hazards and signs' },
    {
      kind: 'para',
      text: 'The boiler house holds gas, hot surfaces and running machinery, and it is loud: it is a hearing protection zone. Its door carries these signs:',
    },
    {
      kind: 'list',
      items: DOOR_WARNING_PRESETS.furnace.map((id) => SIGN_WORDS[id]),
    },
  ];
  return {
    chapter: { id: 'boiler-house', title: 'The boiler house', blocks },
    figures,
  };
}

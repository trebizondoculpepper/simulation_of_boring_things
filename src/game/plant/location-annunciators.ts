import type { World } from '../world';
import {
  acceptLocationAlarms,
  newLocationAnnunciator,
  resetLocationAlarms,
  senseLocationAlarms,
} from './location-annunciator';
import type { LocationAnnunciatorState } from './location-annunciator';
import {
  LOUNGE_ALARMS,
  LOUNGE_ALARM_TEXT,
  loungeAlarms,
} from './lounge-annunciator';
import {
  OLYMPIC_ALARMS,
  OLYMPIC_ALARM_TEXT,
  olympicAlarms,
} from './olympic-annunciator';
import {
  WET_HALL_ALARMS,
  WET_HALL_ALARM_TEXT,
  wetHallAlarmsIn,
} from './wet-hall-annunciator';

/**
 * Every location's annunciator (mission 099; the owner, 2026-10-28: "in
 * the control room, there should be at least 3 annunciators. One for the
 * Olympic pool, one for the lazy pool, and one for the wet hall"): each
 * one board in its own place and its twin in the old control room, one
 * state in the world (`World.locationAnnunciators`); and every one of
 * their windows also on the bridge, accepted there for all (the owner's
 * standing rule: any change to warning and error states updates the
 * bridge too). Pure.
 */

export const LOCATIONS = ['pool_01', 'pool_02', 'wet_hall'] as const;
export type LocationId = (typeof LOCATIONS)[number];

export interface LocationAnnunciatorSpec {
  /** The tag its board and the bridge's lists name it by. */
  tag: string;
  /** Engraved across its top. */
  title: string;
  /** Its name, as the inspection and the bridge give it. */
  name: string;
  /** The room the bridge sends the operator to. */
  room: string;
  alarms: readonly string[];
  /** Each window's engraving, two short lines (blank: a spare way). */
  text: Readonly<Record<string, string>>;
  /** Its windows' columns: four, or six on the larger boards. */
  columns: number;
  /** The alarms present in `world` now, in its windows' order. */
  sense(world: World): string[];
}

export const LOCATION_ANNUNCIATORS: Record<
  LocationId,
  LocationAnnunciatorSpec
> = {
  pool_01: {
    tag: 'PL1',
    title: 'PL1 · LOUNGE POOL PLANT',
    name: 'Lounge pool annunciator',
    room: 'PL1 LOUNGE PLANT ROOM',
    alarms: LOUNGE_ALARMS,
    text: LOUNGE_ALARM_TEXT,
    columns: 4,
    sense: loungeAlarms,
  },
  pool_02: {
    tag: 'PL2',
    title: 'PL2 · OLYMPIC POOL PLANT',
    name: 'Olympic pool annunciator',
    room: 'PL2 OLYMPIC PLANT ROOM',
    alarms: OLYMPIC_ALARMS,
    text: OLYMPIC_ALARM_TEXT,
    columns: 6,
    sense: olympicAlarms,
  },
  wet_hall: {
    tag: 'WH',
    title: 'WH · WET HALL',
    name: 'Wet hall annunciator',
    room: 'WET HALL',
    alarms: WET_HALL_ALARMS,
    text: WET_HALL_ALARM_TEXT,
    columns: 6,
    sense: wetHallAlarmsIn,
  },
};

export type LocationAnnunciators = Record<LocationId, LocationAnnunciatorState>;

export const newLocationAnnunciators = (): LocationAnnunciators =>
  Object.fromEntries(
    LOCATIONS.map((id) => [
      id,
      newLocationAnnunciator(LOCATION_ANNUNCIATORS[id].alarms),
    ]),
  ) as LocationAnnunciators;

/** Each one's state changed by `change`; the same object back if none changed. */
function each(
  all: LocationAnnunciators,
  which: readonly LocationId[],
  change: (
    ids: readonly string[],
    s: LocationAnnunciatorState,
    id: LocationId,
  ) => LocationAnnunciatorState,
): LocationAnnunciators {
  let out = all;
  for (const id of which) {
    const next = change(LOCATION_ANNUNCIATORS[id].alarms, all[id], id);
    if (next !== all[id]) {
      if (out === all) out = { ...all };
      out[id] = next;
    }
  }
  return out;
}

/** Every location's alarms sensed in `world`, whichever room the walker is in. */
export const senseLocations = (
  all: LocationAnnunciators,
  world: World,
): LocationAnnunciators =>
  each(all, LOCATIONS, (ids, s, id) =>
    senseLocationAlarms(ids, s, LOCATION_ANNUNCIATORS[id].sense(world)),
  );

/** ACCEPT at a location's board (or, with none given, at the bridge: every one). */
export const acceptLocations = (
  all: LocationAnnunciators,
  location?: LocationId,
): LocationAnnunciators =>
  each(all, location ? [location] : LOCATIONS, acceptLocationAlarms);

/** RESET at a location's board (or, with none given, every one). */
export const resetLocations = (
  all: LocationAnnunciators,
  location?: LocationId,
): LocationAnnunciators =>
  each(all, location ? [location] : LOCATIONS, resetLocationAlarms);

/** A lit window, as the bridge lists it. */
export interface LitWindow {
  location: LocationId;
  id: string;
  /** Its engraving on one line, with its board's tag. */
  words: string;
  room: string;
  flashing: boolean;
  firstOut: boolean;
}

/**
 * Every location's lit windows, board by board, each board's first-out
 * last (as the newest that matters), for the bridge's lists.
 */
export function litLocationWindows(world: World): LitWindow[] {
  return LOCATIONS.flatMap((location) => {
    const spec = LOCATION_ANNUNCIATORS[location];
    const s = world.locationAnnunciators[location];
    return spec.alarms
      .filter((id) => (s.windows[id] ?? 'off') !== 'off')
      .map((id) => ({
        location,
        id,
        words: `${spec.tag} ${spec.text[id].replace('\n', ' ')}`,
        room: spec.room,
        flashing: s.windows[id] === 'flashing',
        firstOut: s.firstOut === id,
      }))
      .sort((a, b) => Number(a.firstOut) - Number(b.firstOut));
  });
}

/** How many windows flash, unaccepted, on every location's board. */
export const unacceptedLocationAlarms = (world: World): number =>
  LOCATIONS.reduce(
    (n, location) =>
      n +
      LOCATION_ANNUNCIATORS[location].alarms.filter(
        (id) => world.locationAnnunciators[location].windows[id] === 'flashing',
      ).length,
    0,
  );

/**
 * The ends of the valves' pipe runs (prompt 060): what each installed
 * valve stands between, so its description can say what it isolates
 * ("Isolates water flowing from the water service to the balance tank").
 * Each end is a stable key with the words a sentence uses for it; where
 * the plant network (`network/`) has the same thing, the key is that
 * node's id and `network` says so, so the valve register and the network
 * can be checked against each other. A valve's ends describe its designed
 * route in normal running, not the flow at any moment, which can stop or
 * reverse (a backwash). Pure.
 */

/** What a valve's pipe carries, in the words of a description. */
export type Medium = 'water' | 'heating water' | 'air' | 'gas';

export interface ValveEnds {
  /** Where its designed flow comes from, a key of `ENDPOINTS`. */
  from: EndpointKey;
  /** Where it goes to, a key of `ENDPOINTS`. */
  to: EndpointKey;
  medium: Medium;
}

export interface Endpoint {
  /** The end in a sentence: "the balance tank", "filter 1". */
  label: string;
  /** True where the plant network has a node of this id. */
  network?: true;
}

export const ENDPOINTS = {
  // The lounge pool's plant room.
  'pl1.pw.discharge-header': {
    label: 'the pump discharge header',
    network: true,
  },
  'pl1.pw.filtered-header': {
    label: 'the filtered water header',
    network: true,
  },
  'pl1.f1': { label: 'filter 1', network: true },
  'pl1.f2': { label: 'filter 2', network: true },
  'pl1.t1': { label: 'the balance tank', network: true },
  'pl1.p1': { label: 'pump 1', network: true },
  'pl1.p2': { label: 'pump 2', network: true },
  'pl1.dr.header': { label: 'the drain', network: true },
  // The wet hall.
  'wh.town-main': { label: 'the town main' },
  'wh.t1': { label: 'the break tank', network: true },
  'wh.mu.suction-header': {
    label: 'the booster set’s suction header',
    network: true,
  },
  'wh.p1': { label: 'the booster set' },
  'wh.mu.main': { label: 'the make-up main to the pool plant rooms' },
  'wh.t2': { label: 'the backwash holding tank', network: true },
  'wh.sewer': { label: 'the sewer' },
  'wh.drain': { label: 'the drain' },
  // The boiler house.
  'bh.gas-header': { label: 'the boiler gas header' },
  'bh.b-501': { label: 'boiler B-501' },
  'bh.b-502': { label: 'boiler B-502' },
  'bh.b-503': { label: 'boiler B-503' },
  'bh.b-504': { label: 'boiler B-504' },
  'bh.b-505': { label: 'boiler B-505' },
  'bh.b-506': { label: 'boiler B-506' },
  'bh.hw1': { label: 'the low-loss header' },
  'site.heating-flow': { label: 'the heating flow main' },
  'site.heating-return': { label: 'the heating return main' },
  // The Olympic pool's plant room.
  'pl2.pw.suction-header': { label: 'the pump suction header', network: true },
  'pl2.pw.discharge-header': {
    label: 'the pump discharge header',
    network: true,
  },
  'pl2.pw.filtered-header': {
    label: 'the filtered water header',
    network: true,
  },
  'pl2.p-101a': { label: 'pump P-101A' },
  'pl2.p-101b': { label: 'pump P-101B' },
  'pl2.f1': { label: 'filter 1', network: true },
  'pl2.f2': { label: 'filter 2', network: true },
  'pl2.f3': { label: 'filter 3', network: true },
  'pl2.f4': { label: 'filter 4', network: true },
  'pl2.f5': { label: 'filter 5', network: true },
  'pl2.dr.header': { label: 'the drain', network: true },
  'pl2.t2': { label: 'the ozone contact tank', network: true },
  'pl2.uv1': { label: 'the UV unit', network: true },
  'pl2.hx1': { label: 'the heat exchanger', network: true },
  'pl2.dosing-spool': { label: 'the dosing spool and the pool' },
  'pl2.battery-outlet': { label: 'the filter battery’s outlet' },
  // The jacuzzi's plant room.
  'pl3.water-service': { label: 'the water service' },
  'pl3.bt1': { label: 'the balance tank' },
  'pl3.drain': { label: 'the waste drain' },
  'pl3.circulation-pump': { label: 'the circulation pump' },
  'pl3.cab1': { label: 'the treatment cabinet' },
  'pl3.return-jets': { label: 'the jacuzzi’s return jets' },
  'pl3.jets-suction': { label: 'the jacuzzi’s jets suction' },
  'pl3.jet-pump': { label: 'the jet pump' },
  'pl3.jets': { label: 'the jacuzzi’s jets' },
  'pl3.blower': { label: 'the air blower' },
  'pl3.air-ring': { label: 'the jacuzzi’s air ring' },
  'pl3.hx': { label: 'the jacuzzi’s heat exchanger' },
  'pl3.drain-outlet': { label: 'the jacuzzi’s drain outlet' },
  // The footbath's plant room.
  'pl4.water-service': { label: 'the water service' },
  'pl4.cab1': { label: 'the footbath cabinet' },
  'pl4.footbath': { label: 'the footbath' },
  'pl4.foul-drain': { label: 'the foul drain' },
  'pl4.overflow': { label: 'the footbath’s overflow' },
  'pl4.hx': { label: 'the footbath cabinet’s heat exchanger' },
} as const satisfies Record<string, Endpoint>;

export type EndpointKey = keyof typeof ENDPOINTS;

/** The words for an end. */
export const endpointLabel = (key: EndpointKey): string => ENDPOINTS[key].label;

/**
 * The ends of the identified model's valves (`identification.ts`), by
 * tag: the footbath's, which the model tree holds rather than the drawn
 * register.
 */
export const MODEL_VALVE_ENDS: Readonly<Record<string, ValveEnds>> = {
  'PL4-PW1-RV1': { from: 'pl4.cab1', to: 'pl4.footbath', medium: 'water' },
  'PL4-PW1-DV1': { from: 'pl4.cab1', to: 'pl4.foul-drain', medium: 'water' },
  'PL4-MU1-LCV1': {
    from: 'pl4.water-service',
    to: 'pl4.cab1',
    medium: 'water',
  },
};

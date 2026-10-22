/**
 * How each kind of machine in the real plant rooms meets the simulation
 * (`src/game/world.ts`), by its key in `room-equipment.ts`: the register
 * that, walked against the plant's catalogue (`equipment-catalogue.ts`),
 * proves every catalogued machine is wired, or says why it need not be,
 * or is still to do. Pure.
 *
 * - `world`: it shows, and where it has controls works, the world's
 *   state; `reads` says what.
 * - `passive`: it has nothing that switches, moves or reads out (a plate
 *   heat exchanger, a spill kit); `why` says so.
 * - `todo`: not yet wired; `needs` says what it would show. The list only
 *   shrinks: its test pins it.
 */
export type WorldBinding =
  | { binding: 'world'; reads: string }
  | { binding: 'passive'; why: string }
  | { binding: 'todo'; needs: string };

const world = (reads: string): WorldBinding => ({ binding: 'world', reads });
const passive = (why: string): WorldBinding => ({ binding: 'passive', why });
const todo = (needs: string): WorldBinding => ({ binding: 'todo', needs });

/** Through the plant reading (`world-reading.ts`), the main pool's. */
const CONTROL =
  'the main pool’s plant reading: pumps, flow, levels, chemistry, alarms';

export const WORLD_BINDINGS: Readonly<Record<string, WorldBinding>> = {
  // The pool plant rooms.
  'pump-pair': world('its pool’s pumps: duty, standby, trips, flow; its sound'),
  'pump-panel': world(
    'its pool’s pumps and flow, on its tri-state lamps and ammeters',
  ),
  'ozone-generator': world(
    'its isolator and its room’s power; its own ozone plant',
  ),
  'dosing-controller': world(
    'its pool’s chlorine, combined chlorine, pH, redox, temperature',
  ),
  'hypo-pumps': world('its pool’s dosing and the hypochlorite store'),
  'acid-pump': world('its pool’s dosing and the acid store'),
  'uv-unit': world('its UV isolator and its pool’s circulation'),
  'jacuzzi-pack': world('its cabinet isolator; its circulation'),
  'spa-pack': world('its cabinet isolator and its named POWER switch'),
  'heat-exchanger': passive('plates in a frame: nothing switches or reads out'),
  'balance-tank': todo('its pool’s balance-tank level, on a sight gauge'),
  'sand-filter': todo('its inlet and outlet pressures from its pool’s flow'),
  'contact-tank': todo('its own room’s ozone plant, not the dev room’s'),
  // The wet hall.
  'booster-set': world('the wet hall: break tank, booster set'),
  'water-meter': world('the wet hall’s make-up meter'),
  'mimic-wet': world('the wet hall'),
  'break-tank': todo('the wet hall’s break-tank level'),
  'backwash-tank': todo('the wet hall’s backwash-tank level'),
  // The boiler house: its own model, fed by the world’s power and heat demand.
  'boiler-cascade': world(
    'the boiler house model: the world’s power and heat demand',
  ),
  'gas-train': world('the boiler house model’s gas train'),
  'gas-safety': world('the boiler house model’s gas detection'),
  'combustion-panel': world('the boiler house model’s combustion'),
  'mimic-gas': world('the boiler house model'),
  'mimic-boiler-heat': world('the boiler house model'),
  'lthw-pumps': todo(
    'the heating circuit running: run lamps, its pumps’ sound',
  ),
  pressurisation: todo('the heating circuit’s pressure'),
  calorifier: todo('its stored water’s temperature'),
  'low-loss-header': passive('a vessel: its thermometers are the boilers’'),
  'dosing-pot': passive('a vessel with valves, used only when dosing by hand'),
  // The chemical stores and loading bay.
  'hypo-tank': world('the hypochlorite store’s stock'),
  'acid-ibc': world('the acid store’s stock'),
  'store-extract': world('its room’s gas detection and extract'),
  'tanker-stand': passive('a painted bay'),
  'spill-kit': passive('a bin of absorbents'),
  'safety-shower': passive(
    'a shower and eyewash, worked by hand, not modelled',
  ),
  'fill-cabinet': passive('a locked cabinet of fill points'),
  'ppe-cabinet': passive('a cabinet of protective equipment'),
  'store-signs': passive('signs'),
  // The switch room.
  'lv-switchboard': world('its ways: the rooms’ feeders'),
  'main-switch': world('the site’s supply'),
  'lighting-board': world('the lighting zones'),
  mcc: todo('its starters: the pumps and fans the world runs'),
  'central-battery': todo('the site’s supply: charging, or on battery'),
  'distribution-board': todo('its ways: the small power the world feeds'),
  'rotary-isolators': todo('the machines’ isolators'),
  'generator-point': passive('a connection box for a hired generator'),
  'earthing-terminal': passive('a copper bar'),
  // The air plant: its own model, fed by the world’s power.
  'ahu-stack': world('the air plant model: the world’s power'),
  'mimic-air': world('the air plant model'),
  // The control room.
  'operator-desk': world(CONTROL),
  'alarm-printer': world(CONTROL),
  annunciator: world(CONTROL),
  'chart-recorders': world(CONTROL),
  'readout-board': world(CONTROL),
  'mimic-pool': world(CONTROL),
  'mimic-heating': world(CONTROL),
  'bms-outstation': todo('the plant reading, on its module lamps'),
  'fire-repeater': todo(
    'a fire alarm system, which the world does not yet have',
  ),
  cctv: world('its cameras: what they see'),
  'water-test-kit': passive('a photometer and reagents, used by hand'),
  // The engineers’ office.
  'scenario-simulator': world('the whole world: it sets its scenarios'),
  desk: passive('furniture'),
  filing: passive('furniture'),
};

/** The kinds still to wire. */
export const UNWIRED = Object.entries(WORLD_BINDINGS)
  .filter(([, b]) => b.binding === 'todo')
  .map(([kind]) => kind)
  .sort();

import { LIMITS, TAGS, shortTag } from '../../../game/plant/museum-9-plant';
import { FAULTS } from '../../../game/plant/museum-9-faults';
import { RESET_SIGN } from './ideal-pool-plant-placards';
import type { Placard } from './ideal-pool-plant-placards';

export { RESET_SIGN };

/**
 * Hall 9's words (107e): its entrance panel, a placard at each of its five
 * stations, the fault card on the pedestal, and the closing wall, the
 * counterpart to Hall 0's welcome (the owner's message, 2026-10-28, in
 * his words). Tags and limits come from the model; only the explanation
 * is written here. Pure.
 */

export function hall9Placards(): Placard[] {
  const v = shortTag;
  return [
    {
      station: 1,
      of: 'desk',
      icon: 'map',
      headline: 'The desk',
      title: `Control desk · ${TAGS['desk.ua']}, ${TAGS['desk.qi']}`,
      body: `The mimic shows everything. The annunciator tells you something is wrong. But most things are put right at the machine: the desk only starts and stops the pumps and opens and shuts the heating valve ${v('hx.primary.mv')}. Resets, selectors and hand valves are out in the plant.`,
      fact: 'A real pool plant room is often looked after by one person on a shift.',
      tryIt:
        'Press LAMP TEST: every window lights. Then read the water panel: chlorine, pH, temperature and flow, each from its own instrument.',
    },
    {
      station: 2,
      of: 'poolPump',
      icon: 'filter',
      headline: 'The water',
      title: `Circulation · ${TAGS['poolPump']}, ${TAGS['filter']}`,
      body: `The pool overflows to its balance tank; the pump draws it through its basket strainer ${v('strainer')}, pushes it through the sand filter and the heat exchanger, and back to the pool. You met the pump in Hall 1 and the filter in Hall 2.`,
      fact: `The strainer's basket catches hair and plasters before they reach the pump. When it blocks, the suction gauge ${v('pump.suction.pi')} goes below zero.`,
      tryIt: `Turn the pump's selector to OFF, shut ${v('pump.suction.iso')} and ${v('pump.discharge.iso')}, and lift the strainer's lid.`,
    },
    {
      station: 3,
      of: 'boiler',
      icon: 'heat',
      headline: 'The heat',
      title: `Heating · ${TAGS['boiler']}, ${TAGS['hx']}`,
      body: `The boiler heats its own water; the pump ${v('primaryPump')} carries it to the exchanger, where the thermostat ${v('pool.tc')} opens the motorised valve ${v('hx.primary.mv')} when the pool wants heat. You met all of it in Hall 1.`,
      fact: "The pool holds so much heat that a heating failure takes hours to show on its thermometer. Watch the thermostat's CALL lamp and the two thermometers either side of the exchanger instead.",
      tryIt: `If ${v('hxIn.ti')} and ${v('hxOut.ti')} read the same while the thermostat calls, no heat is getting through.`,
    },
    {
      station: 4,
      of: 'sampleCell',
      icon: 'meter',
      headline: 'The chemistry',
      title: `Dosing · ${TAGS['sampleCell']}, ${TAGS['controller']}`,
      body: `A trickle of pool water runs past the probes in the sample cell; the controller doses hypochlorite and acid to hold the chlorine and pH. You met the controller in Hall 3 and the chemistry in Hall 4.`,
      fact: 'Automatic control is checked, never trusted: staff test the water by hand several times a day, and calibrate the controller to the test.',
      tryIt: `Test the water with the kit ${v('testKit')} and compare it with the desk's chlorine reading.`,
    },
    {
      station: 5,
      of: 'faults',
      icon: 'pump',
      headline: 'The fault button',
      title: `Fault pedestal · ${TAGS['faults']}`,
      body: 'Press it. Something will go wrong. Read the alarm, find it, fix it, reset. The scoreboard times you from the fault to your first ACCEPT, and to the plant put right.',
      fact: 'The first window to light is usually nearest the cause: it flashes faster than the rest.',
      tryIt: `There are ${FAULTS.length} faults, and the button never gives you the same one twice running.`,
    },
  ];
}

export function hall9Entrance() {
  return {
    title: 'The whole plant',
    subtitle: 'Hall 9: control and fault finding',
    introduction:
      'Everything you have seen, working together. When something goes wrong, the plant tells you, if you read it from cause to effect. A real pool plant room is often looked after by one person on a shift.',
    route: hall9Placards().map((p) => ({
      station: p.station!,
      name: p.headline,
      what: p.title.split(' · ')[0],
    })),
    reset:
      'Can’t break it: the big red RESET SIMULATION button puts every fault right and the plant back to the start.',
  };
}

/** The water panel's limits, as its legend prints them. */
export const WATER_LIMITS = LIMITS;

/** The closing wall (the owner, 2026-10-28), on the way out into Hall 0. */
export const CLOSING_WALL = {
  headline: 'Now you know what’s behind the tiles.',
  message:
    'Now you’ve seen it, now you understand how a swimming pool works, you probably won’t take it for granted anymore, will you?',
  paragraph:
    'When you came in, we said there is almost nothing we take for granted more than the swimming pool. You just dive in. Now you have met what makes that possible: the boiler that warms the water, the sand that cleans it, the chlorine that keeps it safe, the chemistry that keeps it in balance, and the plant, and the people, that keep it all running every hour the pool is open. So next time you dive in, spare a thought for the plant room. It’s down there, working, so that all you have to do is swim.',
  wayOn:
    'Thank you for visiting PLANTROOMS. You found the plant room. The way out is straight on.',
  wink: 'Unlike the Poolrooms, every room here was real, and every machine in it worked.',
} as const;

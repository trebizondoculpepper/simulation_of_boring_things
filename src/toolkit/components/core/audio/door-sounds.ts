import { recording } from './part-audio';

const files = [
  'door-large-01.wav',
  'door-large-02.wav',
  'door-large-03.wav',
  'door-large-04.wav',
  'door-large-05.wav',
  'door-large-06.wav',
  'door-large-07.wav',
  'door-large-08.wav',
  'door-large-09.wav',
  'door-large-10.wav',
];
const movements = files.map((file) =>
  recording(new URL(`./assets/${file}`, import.meta.url), 0.025),
);

/** Every recorded movement once per shuffled set, with no adjacent repeats. */
export function createDoorSoundPicker(random: () => number = Math.random) {
  let bag: number[] = [];
  let previous = -1;
  return () => {
    if (!bag.length) {
      bag = movements.map((_, index) => index);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      // Selection removes the last item; keep set boundaries distinct too.
      const last = bag.length - 1;
      if (bag[last] === previous) [bag[0], bag[last]] = [bag[last], bag[0]];
    }
    previous = bag.pop()!;
    return movements[previous];
  };
}

/** Shared across large doors so neighbouring doors also avoid repeats. */
export const largeDoorMovement = createDoorSoundPicker();

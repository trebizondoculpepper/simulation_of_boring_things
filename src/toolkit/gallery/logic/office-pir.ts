import { VACANCY_SECONDS } from '../../components/architectural/logic/building-services';

/** A short make delay and a vacancy hold for the engineer's office PIR. */
export function createOfficePir(onChange: (lit: boolean) => void) {
  let lit = false;
  let makeDelay = -1;
  let vacancy = 0;
  return {
    senseMotion() {
      vacancy = VACANCY_SECONDS;
      if (!lit && makeDelay < 0) makeDelay = 0.35;
    },
    update(delta: number) {
      if (makeDelay >= 0) {
        makeDelay -= delta;
        if (makeDelay < 0 && vacancy > 0) {
          lit = true;
          onChange(true);
        }
      } else if (lit) {
        vacancy -= delta;
        if (vacancy <= 0) {
          lit = false;
          onChange(false);
        }
      }
    },
    dispose() {
      if (lit) onChange(false);
      lit = false;
    },
  };
}

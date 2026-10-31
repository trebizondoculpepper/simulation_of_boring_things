import { TANKS, VOLUME } from './museum-4-lab';
import type { TankId } from './museum-4-lab';

/**
 * Hall 4's dose table (mission 113, `doc/plans/113/d-chemical-table.md`):
 * for each of the hall's ten tanks, its physical form and unit, the
 * largest single dose a pool operator would sensibly add at once to the
 * hall's 500 m³ pool (`VOLUME`), where that figure comes from, and what the
 * chemical does and how pools use it, for the console's chemical screen.
 * The five dose sizes run from a hundredth of the maximum to all of it,
 * each √10 the one before. Pure.
 */

export type Form = 'liquid' | 'solid' | 'gas' | 'water';

export interface DoseEntry {
  tank: TankId;
  /** The chemical's everyday name, for the console's words. */
  name: string;
  form: Form;
  unit: 'l' | 'kg' | 'm3';
  /** Huge: the largest sensible single dose for the hall's pool, in `unit`. */
  max: number;
  /** Where `max` comes from (a guide, or our arithmetic from one). */
  source: string;
  /** What it does, in the model's terms. */
  does: string;
  /** How pools commonly use it. */
  use: string;
}

/** The unit each physical form is dispensed in (CO₂ by weight, from its cylinder). */
export const UNIT_OF_FORM: Record<Form, DoseEntry['unit']> = {
  liquid: 'l',
  solid: 'kg',
  gas: 'kg',
  water: 'm3',
};

export const DOSES: readonly DoseEntry[] = [
  {
    tank: 'hypo',
    name: 'sodium hypochlorite',
    form: 'liquid',
    unit: 'l',
    max: 40,
    source:
      'Arithmetic from PWTAG superchlorination guidance: +10 mg/l free chlorine in 500 m³ is 5 kg of chlorine, 36 l at 140 g/l',
    does: 'Chlorine, the disinfectant: it kills germs and burns off what swimmers bring in. It adds a little salt and alkalinity, and raises the pH.',
    use: 'The usual pool disinfectant, fed continuously by a dosing pump under a controller, and added by hand to shock a pool after an incident.',
  },
  {
    tank: 'calHypo',
    name: 'calcium hypochlorite',
    form: 'solid',
    unit: 'kg',
    max: 8,
    source:
      'Arithmetic from PWTAG superchlorination guidance: 5 kg of chlorine at 65 % available is 7.7 kg',
    does: 'Chlorine as granules: the same disinfectant as hypochlorite, but it brings calcium hardness with it.',
    use: 'Used where soft water needs the calcium, or fed from a tablet or granule feeder instead of a liquid tank.',
  },
  {
    tank: 'hcl',
    name: 'hydrochloric acid',
    form: 'liquid',
    unit: 'l',
    max: 180,
    source:
      'Arithmetic from suppliers’ acid charts: 50 mg/l of alkalinity (as CaCO₃) in 500 m³ takes 18 kg of HCl, 180 l at 10 %',
    does: 'Acid: it brings the pH down. It eats alkalinity, the water’s buffer, and adds chloride.',
    use: 'The commonest pH correction, fed by a pump under the pH controller to balance the hypochlorite’s rise.',
  },
  {
    tank: 'bisulphate',
    name: 'sodium bisulphate',
    form: 'solid',
    unit: 'kg',
    max: 60,
    source:
      'Arithmetic from suppliers’ dry acid charts: 50 mg/l of alkalinity in 500 m³ takes about 2.4 kg per kg of CaCO₃, 60 kg',
    does: 'Dry acid: it brings the pH down and the alkalinity with it, and adds sulphate, which eats grout above 360 mg/l.',
    use: 'Safer to store than liquid acid, so small pools use it by hand; a season of it builds up sulphate.',
  },
  {
    tank: 'co2',
    name: 'carbon dioxide',
    form: 'gas',
    unit: 'kg',
    max: 25,
    source:
      'From CO₂ dosing suppliers’ figures (0.02 to 0.05 kg/m³ a day for pH control): a pH trim of about 0.4 in 500 m³',
    does: 'Brings the pH down while leaving the alkalinity alone. It leaves to the air over hours, so the pH creeps back up.',
    use: 'Bubbled into the return from a cylinder; gentle and safe, popular where the water is hard and alkaline.',
  },
  {
    tank: 'bicarbonate',
    name: 'sodium bicarbonate',
    form: 'solid',
    unit: 'kg',
    max: 40,
    source:
      'PWTAG: about 1.5 kg per 100 m³ raises alkalinity 10 mg/l; +50 mg/l in 500 m³ is 37.5 kg',
    does: 'Raises alkalinity, the buffer that keeps the pH steady, while hardly moving the pH itself.',
    use: 'Added by hand, bag by bag, when the alkalinity is low and the pH will not hold.',
  },
  {
    tank: 'sodaAsh',
    name: 'soda ash',
    form: 'solid',
    unit: 'kg',
    max: 10,
    source:
      'Suppliers’ pH increaser charts: about 2 kg per 100 m³ lifts pH by around 0.5',
    does: 'Raises the pH sharply, and the alkalinity with it.',
    use: 'Used to lift a pH that has fallen too low, a little at a time, or fed where gas chlorine or CO₂ pulls the pH down.',
  },
  {
    tank: 'calciumChloride',
    name: 'calcium chloride',
    form: 'solid',
    unit: 'kg',
    max: 55,
    source:
      'Arithmetic: +100 mg/l hardness (as CaCO₃) in 500 m³ is 50 kg of CaCO₃, 55 kg of anhydrous CaCl₂',
    does: 'Raises calcium hardness, so the water stops eating grout and plaster. It hardly moves the pH.',
    use: 'Added after a refill from soft mains water, or where the balance index shows aggressive water.',
  },
  {
    tank: 'thiosulphate',
    name: 'sodium thiosulphate',
    form: 'solid',
    unit: 'kg',
    max: 25,
    source:
      'PWTAG TN23 (superchlorination) working figure, as the model is calibrated (pool-chemistry.ts): 5 g/m³ for each 1 mg/l of chlorine removed; 10 mg/l in 500 m³ is 25 kg',
    does: 'Takes chlorine away. Afterwards the pH rises: check it and add acid.',
    use: 'Used after a shock dose, or before emptying a pool to the drain, to bring the chlorine down fast.',
  },
  {
    tank: 'fresh',
    name: 'fresh water',
    form: 'water',
    unit: 'm3',
    max: 100,
    source:
      'PWTAG: dilute by at least 30 l per bather a day; a one-off 20 % change of 500 m³ is 100 m³',
    does: 'Dilutes everything towards the mains water.',
    use: 'The only cure for built-up salts, sulphate and stabiliser; it costs water and the heat to warm it.',
  },
];

export const doseOf = (tank: TankId) => DOSES.find((d) => d.tank === tank)!;

export const SIZES = ['TINY', 'SMALL', 'MEDIUM', 'LARGE', 'HUGE'] as const;
export type SizeIndex = 0 | 1 | 2 | 3 | 4;

/** The share of the maximum each size is: 1 %, 3.2 %, 10 %, 32 %, 100 %. */
export const sizeShare = (size: number) => 10 ** ((size - 4) / 2);

/** A size's amount of `tank`, in its unit, unrounded. */
export const doseAmount = (tank: TankId, size: number) =>
  doseOf(tank).max * sizeShare(size);

/** Two significant figures: one decimal under 10, none from 100. */
export function roundDose(v: number) {
  if (v >= 100) return Math.round(v);
  const p = 10 ** (Math.floor(Math.log10(v)) - 1);
  return Math.round(v / p) * p;
}

const UNIT_TEXT = { l: 'l', kg: 'kg', m3: 'm³' } as const;

/** "4.0 kg", "18 l", "100 m³". */
export function amountText(tank: TankId, size: number) {
  const v = roundDose(doseAmount(tank, size));
  const text = v >= 10 ? String(Math.round(v)) : v.toFixed(v < 1 ? 2 : 1);
  return `${text} ${UNIT_TEXT[doseOf(tank).unit]}`;
}

/** "MEDIUM · 4.0 kg". */
export const doseText = (tank: TankId, size: number) =>
  `${SIZES[size]} · ${amountText(tank, size)}`;

/** "Medium sodium bicarbonate". */
export const doseWords = (tank: TankId, size: number) =>
  `${SIZES[size][0]}${SIZES[size].slice(1).toLowerCase()} ${doseOf(tank).name}`;

/** The hall's pool, for the record: the maxima are for this volume. */
export const DOSE_VOLUME = VOLUME;

/** Every tank in the order of the hall's tanks. */
export const DOSE_ORDER: readonly TankId[] = TANKS.map((t) => t.id);

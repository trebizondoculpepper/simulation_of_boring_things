/**
 * A pool's water chemistry, stepped (the owner, 2026-10-28: "take an
 * existing study and then write our own version of the model and test it
 * in the abstract"; `doc/research/water-chemistry-models.md`). Pure: no
 * DOM, no Three.js, no world; deterministic; each process algebraic or
 * integrated exactly over the step, so it holds at 10 to 60 s steps.
 *
 * Built on published work, each piece cited where it is used:
 *
 * - **Carbonate system and pH**: the textbook closed carbonate system
 *   (Stumm & Morgan, _Aquatic Chemistry_), with the temperature
 *   polynomials of the US EPA's Chlorine Breakpoint Curve Simulator
 *   (D. G. Wahman, USEPA, `app.R` v0.25, MIT) and Davies activity
 *   coefficients; pH is solved each step from total alkalinity and total
 *   carbonate, checked against PHREEQC 3.8.6 (USGS, public domain).
 * - **Chlorine and chloramines**: the Jafvert & Valentine (1992) scheme as
 *   coded in the EPA simulator, reduced to what a pool needs: ammonia
 *   chlorinated at once (5.07 mg Cl₂ per mg N), breakpoint second order in
 *   HOCl and chloramine, its rate, chlorine use and trichloramine yield
 *   fitted to that scheme (`fixtures/jafvert-valentine.json`).
 * - **Pool additions** (Davis & Bullock 2002, Bristol, for PWTAG): urea
 *   chlorinated slowly (k = 778.8 M⁻¹h⁻¹), and a first-order background
 *   loss; bathers' releases after Keuten et al. (urea, ammonium) and Berg
 *   et al. 2019 (about 4 g Cl₂ demand a bather); trichloramine from urea
 *   (Schmalz et al. 2011) and its transfer to the air; carbon dioxide lost
 *   by Wojtowicz's second-order law (JSPSI 2001).
 * - **Additions** in moles and equivalents (`doc/research/
 *   pool-dosing-and-water-chemistry.md` §2.1), dilution exponential.
 *
 * Units: mg/l (= g/m³); chlorine species as Cl₂; nitrogen species as N;
 * alkalinity and hardness as CaCO₃; total carbonate mmol/l; thiosulphate
 * as the pentahydrate (the form PWTAG doses); m³, °C, seconds.
 */

// ---- Molar masses, g/mol ---------------------------------------------------------

export const MOLAR = {
  Cl2: 70.906,
  N: 14.007,
  CaCO3: 100.087,
  HCl: 36.461,
  CO2: 44.01,
  NaHCO3: 84.007,
  Na2CO3: 105.988,
  NaHSO4: 120.06,
  CaCl2: 110.98,
  NaOH: 39.997,
  thiosulphate: 248.18, // Na2S2O3·5H2O
  SO4: 96.06,
  urea: 60.056,
} as const;
/** mg/l of alkalinity as CaCO₃ per meq/l. */
const ALK_EQ = MOLAR.CaCO3 / 2;

// ---- The state -------------------------------------------------------------------

/** One well-mixed body of pool water: its chemistry, all plain numbers. */
export interface PoolChemistry {
  /** Free chlorine, HOCl + OCl⁻, mg/l as Cl₂. */
  freeChlorine: number;
  /** Inorganic chloramine (taken as monochloramine), mg/l as Cl₂. */
  chloramine: number;
  /** Organic chloramines, which DPD 3 reads as combined, mg/l as Cl₂. */
  organicChloramine: number;
  /** Trichloramine in the water, mg/l as Cl₂: what the hall smells of. */
  trichloramine: number;
  /** Ammoniacal nitrogen not yet chlorinated, mg/l as N. */
  ammonia: number;
  /** Urea, mg/l as N. */
  urea: number;
  /** Bathers' organic chlorine demand, fast (an hour or so), mg/l as Cl₂. */
  demand: number;
  /** Bathers' organic chlorine demand, slow (about a day), mg/l as Cl₂. */
  demandSlow: number;
  /** Total alkalinity, as titrated (carbonate, hydroxide and hypochlorite), mg/l as CaCO₃. */
  alkalinity: number;
  /** Total carbonate C_T (CO₂* + HCO₃⁻ + CO₃²⁻), mmol/l. */
  carbonate: number;
  /** Calcium hardness, mg/l as CaCO₃. */
  hardness: number;
  /** Total dissolved solids, mg/l. */
  tds: number;
  /** Sulphate, mg/l as SO₄. */
  sulphate: number;
  /** Chlorate, mg/l as ClO₃. */
  chlorate: number;
  /** Cyanuric acid, mg/l: 0 unless a wrong chemical went in. */
  cyanuric: number;
  /** Thiosulphate not yet reacted, mg/l as Na₂S₂O₃·5H₂O. */
  thiosulphate: number;
  /** pH, solved from alkalinity and carbonate at the last step (kept as the next solve's start). */
  ph: number;
}

// ---- The constants ---------------------------------------------------------------

/**
 * Every constant the model uses, with where it comes from: _sourced_ (from
 * a study or a standard), _fitted_ (to a reference model, by
 * `pool-chemistry.test.ts`'s calibration), _derived_ (arithmetic on
 * sourced numbers) or _invented_ (no source; a target to calibrate).
 */
export const CHEMISTRY = {
  /** Ammonia meeting free chlorine becomes monochloramine at once: mg Cl₂ per mg N (71/14), _derived_. */
  chloraminePerN: MOLAR.Cl2 / MOLAR.N,
  /**
   * Breakpoint: chloramine destroyed by HOCl, l/(mg HOCl as Cl₂ · h),
   * _fitted_ to the Jafvert & Valentine scheme at pool conditions (its
   * mono- plus dichloramine falls about 8 an hour at 0.4 mg/l HOCl; the
   * least-squares fit with the yield below over the six pool cases).
   */
  breakpointRate: 15,
  /**
   * Free chlorine used per mg N taken to nitrogen gas, all told, mg Cl₂:
   * _fitted_ (8.5 in the J&V scheme against 7.6 by the textbook
   * reaction, as real breakpoint curves also show).
   */
  breakpointRatio: 8.5,
  /**
   * Share of breakpoint nitrogen that ends as trichloramine,
   * `a·r²/(1 + b·r²)` with r = HOCl/chloramine (both mg/l as Cl₂): more
   * the more chlorine is in excess. _Fitted_ to the six J&V pool cases
   * (0.5 % to 14 %).
   */
  breakpointTrichloramine: { a: 0.005, b: 0.02 },
  /** Urea's chlorination, l/(mg HOCl as Cl₂ · h): 778.8 M⁻¹h⁻¹ (Davis & Bullock 2002), _sourced_. */
  ureaRate: 778.8 / MOLAR.Cl2,
  /** Share of urea nitrogen that becomes trichloramine: 76 % at pH 7.1 (Schmalz et al. 2011), _sourced_. */
  ureaTrichloramine: 0.76,
  /** Fast organic demand's rate, l/(mg HOCl · h): two thirds of a bather's demand in an hour (AIVC), _derived_. */
  demandRate: 1.8,
  /** Slow organic demand's rate, l/(mg HOCl · h): the rest over a day (AIVC), _derived_. */
  demandSlowRate: 0.25,
  /** Share of the fast demand's chlorine that stays bound as organic chloramine, _invented_. */
  organicChloramineYield: 0.1,
  /** Organic chloramine oxidised by HOCl, l/(mg HOCl · h), _invented_ (a day or so at 1 mg/l). */
  organicChloramineRate: 0.06,
  /** Chloramines' own slow decay without free chlorine, per hour, _invented_ (weeks). */
  chloramineDecay: 0.002,
  /** Background loss of free chlorine, per hour (Davis & Bullock's first-order term), _invented_ value. */
  chlorineDecay: 0.005,
  /** Trichloramine to the air, per hour: 20 h with a rough surface, 5.8 days still (Schmalz et al. 2011), _sourced_. */
  trichloramineToAirRough: 1 / 20,
  trichloramineToAirStill: 1 / (5.8 * 24),
  /** Medium-pressure UV at full dose: share removed a pass (`water-chemistry-models.md` §3), _invented_ within sourced ranges. */
  uv: {
    freeChlorine: 0.1,
    chloramine: 0.3,
    organicChloramine: 0.3,
    trichloramine: 0.8,
  },
  /**
   * Carbon dioxide's loss, (mg/l · day)⁻¹ at Wojtowicz's reference
   * (surface/volume 0.67 m⁻¹, 27.8 °C): `k = 0.0341 + 0.009·TR + 0.0016·TR²`,
   * TR turnovers a day (Wojtowicz 2001), _sourced_; scaled by
   * surface/volume and Arrhenius at 5.0 kcal/mol.
   */
  co2: {
    a: 0.0341,
    b: 0.009,
    c: 0.0016,
    refSurfaceToVolume: 0.67,
    refT: 27.8,
    activation: 5000,
  },
  /** Excess sodium hydroxide in hypochlorite, g NaOH per g available chlorine (0.6 % w/w at 171 g/l), _derived_. */
  hypochloriteCaustic: 0.043,
  /** Sodium chloride in hypochlorite and from its use, mg TDS per mg Cl₂ dosed (NaOCl + NaCl, both ending as NaCl), _derived_. */
  hypochloriteTds: (2 * 58.44) / MOLAR.Cl2,
  /**
   * Thiosulphate's split between its products: the share oxidised to
   * sulphate (4 HOCl a mole) rather than tetrathionate (½ HOCl a mole).
   * 0.057 makes 5 g of the pentahydrate per m³ remove 1 mg/l of free
   * chlorine, PWTAG TN23's working figure, _fitted to PWTAG_.
   */
  thiosulphateToSulphate: 0.057,
  /** Bathers' salts, mg TDS a visit (50 ml urine, 200 ml sweat: Judd & Bullock 2003), _invented_ value. */
  batherTds: 1000,
};

/** What one bather releases on a visit, after Keuten et al. and Berg et al. (see `CHEMISTRY`). */
export const BATHER = {
  /** Urea nitrogen, mg (37.1 mg of urea, Keuten), _sourced_. */
  ureaN: (37.1 * 2 * MOLAR.N) / MOLAR.urea,
  /** Ammoniacal nitrogen, mg (10.1 mg NH₄⁺, Keuten), _sourced_. */
  ammoniaN: (10.1 * MOLAR.N) / 18.04,
  /** Organic chlorine demand, mg Cl₂: about 4 g a bather all told (Berg et al. 2019, 4.12 g), less the nitrogen's share, _derived_. */
  demand: 3700,
  /** Share of it that is fast (exerted within an hour), _derived_ from AIVC (7 g in 1 h of 10.5 g in 24 h). */
  fastShare: 2 / 3,
} as const;

// ---- Equilibria ------------------------------------------------------------------

const pK = (a: number, b: number, c: number, T: number) =>
  a * T * T + b * T + c;

/** The equilibrium constants at a temperature, °C (thermodynamic, at zero ionic strength). */
export function equilibria(temperature: number) {
  const T = temperature + 273.15;
  // The EPA simulator's polynomials (app.R), as in the earlier notes.
  const pKa = pK(1.18e-4, -7.86e-2, 20.5, T); // HOCl ⇌ H⁺ + OCl⁻
  const pK1 = pK(1.48e-4, -9.39e-2, 21.2, T); // H₂CO₃* ⇌ H⁺ + HCO₃⁻
  const pK2 = pK(1.19e-4, -7.99e-2, 23.6, T); // HCO₃⁻ ⇌ H⁺ + CO₃²⁻
  const pKw = pK(1.5e-4, -1.23e-1, 37.3, T);
  // Henry's law for CO₂, mol/(l·atm), Plummer & Busenberg (1982).
  const log10T = Math.log10(T);
  const logKH =
    108.3865 +
    0.01985076 * T -
    6919.53 / T -
    40.45154 * log10T +
    669365 / (T * T);
  // Calcite's solubility product, Plummer & Busenberg (1982).
  const logKsp = -171.9065 - 0.077993 * T + 2839.319 / T + 71.595 * log10T;
  return { pKa, pK1, pK2, pKw, logKH, logKsp };
}

/** Ionic strength, mol/l, from dissolved solids (Langelier's rule, 2.5 × 10⁻⁵ per mg/l). */
export const ionicStrength = (tds: number) => 2.5e-5 * Math.max(0, tds);

/** Davies activity coefficient of an ion of charge z. */
export function activity(z: number, I: number, temperature: number): number {
  const A = 0.4883 + 8.074e-4 * temperature;
  const s = Math.sqrt(I);
  return 10 ** (-A * z * z * (s / (1 + s) - 0.3 * I));
}

/** Free chlorine's share as HOCl at a pH (pH as activity, as a probe reads it). */
export function hoclFraction(
  ph: number,
  temperature: number,
  tds = 1000,
): number {
  const e = equilibria(temperature);
  const g1 = activity(1, ionicStrength(tds), temperature);
  const ratio = 10 ** (ph - e.pKa) / g1; // [OCl⁻]/[HOCl]
  return 1 / (1 + ratio);
}

/** The carbonate system's shares at a pH: CO₂*, HCO₃⁻, CO₃²⁻, as concentrations. */
function carbonateShares(ph: number, temperature: number, I: number) {
  const e = equilibria(temperature);
  const g1 = activity(1, I, temperature);
  const g2 = activity(2, I, temperature);
  const aH = 10 ** -ph;
  const r1 = 10 ** -e.pK1 / (aH * g1); // [HCO₃⁻]/[CO₂*]
  const r2 = (10 ** -e.pK2 * g1) / (aH * g2); // [CO₃²⁻]/[HCO₃⁻]
  const d = 1 + r1 + r1 * r2;
  return { a0: 1 / d, a1: r1 / d, a2: (r1 * r2) / d, g1, g2, e, aH };
}

/** Alkalinity, meq/l, that a pH gives with this carbonate and free chlorine. */
function alkalinityAt(
  ph: number,
  carbonate: number,
  freeChlorine: number,
  temperature: number,
  I: number,
): number {
  const s = carbonateShares(ph, temperature, I);
  const hMolar = s.aH / s.g1;
  const ohMolar = 10 ** -s.e.pKw / (s.aH * s.g1);
  const oclShare = 1 - 1 / (1 + 10 ** (ph - s.e.pKa) / s.g1);
  const oclMilli = (freeChlorine / MOLAR.Cl2) * oclShare; // mmol/l
  return carbonate * (s.a1 + 2 * s.a2) + (ohMolar - hMolar) * 1000 + oclMilli;
}

/**
 * pH from total alkalinity and total carbonate (and the hypochlorite's
 * share of the alkalinity): `TA = C_T(α₁ + 2α₂) + [OH⁻] − [H⁺] + [OCl⁻]`,
 * monotonic in pH, solved by safeguarded Newton from `guess`.
 */
export function solvePh(
  alkalinity: number,
  carbonate: number,
  freeChlorine: number,
  temperature: number,
  tds: number,
  guess = 7.4,
): number {
  const ta = alkalinity / ALK_EQ; // meq/l
  const I = ionicStrength(tds);
  const f = (ph: number) =>
    alkalinityAt(ph, carbonate, freeChlorine, temperature, I) - ta;
  let lo = 2;
  let hi = 12.5;
  let x = Math.min(hi, Math.max(lo, Number.isFinite(guess) ? guess : 7.4));
  for (let i = 0; i < 40; i++) {
    const fx = f(x);
    if (Math.abs(fx) < 1e-10) return x;
    if (fx > 0) hi = x;
    else lo = x;
    const d = (f(x + 1e-5) - fx) / 1e-5;
    let next = d > 0 ? x - fx / d : (lo + hi) / 2;
    if (!(next > lo && next < hi)) next = (lo + hi) / 2;
    if (Math.abs(next - x) < 1e-9) return next;
    x = next;
  }
  return x;
}

/** Total carbonate, mmol/l, of a water given by its pH and alkalinity (as a test kit gives it). */
export function carbonateFor(
  ph: number,
  alkalinity: number,
  freeChlorine: number,
  temperature: number,
  tds: number,
): number {
  const I = ionicStrength(tds);
  const s = carbonateShares(ph, temperature, I);
  const rest = alkalinityAt(ph, 0, freeChlorine, temperature, I);
  return (alkalinity / ALK_EQ - rest) / (s.a1 + 2 * s.a2);
}

// ---- Readings: what the water is, derived ----------------------------------------

export interface ChemistryReadings {
  ph: number;
  /** HOCl, mg/l as Cl₂. */
  hocl: number;
  /** Combined chlorine as DPD 3 − DPD 1 reads it, mg/l as Cl₂. */
  combinedChlorine: number;
  totalChlorine: number;
  /** Dissolved CO₂, mg/l. */
  co2: number;
  /** Carbonate alkalinity (without the hypochlorite's), mg/l as CaCO₃. */
  carbonateAlkalinity: number;
  /** Langelier saturation index (`pool-dosing-and-water-chemistry.md` §2.5). */
  langelier: number;
  /** TroubleFreePool's calcium saturation index (pypoolchem `csi.py`, MIT). */
  csi: number;
  /** Calcite's saturation index, log(IAP/Ksp), as PHREEQC reports it. */
  calciteSi: number;
  /** Redox, mV against Ag/AgCl: the earlier note's Nernst-shaped curve in log HOCl. */
  redox: number;
}

/** Cyanuric acid binds free chlorine: HOCl's share left free, a crude half-binding at 1.4 mg/l, _invented_. */
const cyanuricFree = (cya: number) => 1 / (1 + Math.max(0, cya) / 1.4);

export function readings(
  w: PoolChemistry,
  temperature: number,
): ChemistryReadings {
  const ph = w.ph;
  const I = ionicStrength(w.tds);
  const s = carbonateShares(ph, temperature, I);
  const hocl =
    w.freeChlorine *
    hoclFraction(ph, temperature, w.tds) *
    cyanuricFree(w.cyanuric);
  const co2 = w.carbonate * s.a0 * MOLAR.CO2;
  const carbAlkMeq = w.carbonate * (s.a1 + 2 * s.a2);
  const carbonateAlkalinity = carbAlkMeq * ALK_EQ;
  const T = temperature;
  const ta = Math.max(1e-6, w.alkalinity);
  const ch = Math.max(1e-6, w.hardness);
  const tds = Math.max(1, w.tds);
  const pHs =
    9.3 +
    (Math.log10(tds) - 1) / 10 +
    (-13.12 * Math.log10(T + 273) + 34.55) -
    (Math.log10(ch) - 0.4 + Math.log10(ta));
  const csiI =
    (1.5 * ch + ta) / 50045 + Math.max(0, w.tds - 1.5 * ch - ta) / 58440;
  const csi =
    ph -
    11.677 +
    Math.log10(ch) +
    Math.log10(Math.max(1e-6, carbonateAlkalinity)) -
    (2.56 * Math.sqrt(csiI)) / (1 + 1.65 * Math.sqrt(csiI)) -
    1412.5 / (T + 273.15) +
    4.7375;
  const ca = ch / MOLAR.CaCO3 / 1000; // mol/l
  const co3 = (w.carbonate * s.a2) / 1000;
  const calciteSi =
    Math.log10(Math.max(1e-30, s.g2 * ca * s.g2 * co3)) - s.e.logKsp;
  return {
    ph,
    hocl,
    combinedChlorine: w.chloramine + w.organicChloramine + w.trichloramine,
    totalChlorine:
      w.freeChlorine + w.chloramine + w.organicChloramine + w.trichloramine,
    co2,
    carbonateAlkalinity,
    langelier: ph - pHs,
    csi,
    calciteSi,
    redox: 786 + 80 * Math.log10(hocl + 1e-4),
  };
}

// ---- Waters ----------------------------------------------------------------------

/** A water given as a test kit gives it: pH, alkalinity, hardness, TDS and the rest. */
export interface WaterSpec {
  ph: number;
  alkalinity: number;
  hardness: number;
  tds: number;
  temperature: number;
  freeChlorine?: number;
  sulphate?: number;
}

/** A water's chemistry from its test results: total carbonate found from pH and alkalinity. */
export function waterFrom(spec: WaterSpec): PoolChemistry {
  const fc = spec.freeChlorine ?? 0;
  return {
    freeChlorine: fc,
    chloramine: 0,
    organicChloramine: 0,
    trichloramine: 0,
    ammonia: 0,
    urea: 0,
    demand: 0,
    demandSlow: 0,
    alkalinity: spec.alkalinity,
    carbonate: carbonateFor(
      spec.ph,
      spec.alkalinity,
      fc,
      spec.temperature,
      spec.tds,
    ),
    hardness: spec.hardness,
    tds: spec.tds,
    sulphate: spec.sulphate ?? 0,
    chlorate: 0,
    cyanuric: 0,
    thiosulphate: 0,
    ph: spec.ph,
  };
}

// ---- What goes in ----------------------------------------------------------------

/** What can be dosed, each in grams of the substance named. */
export interface Additions {
  /** Sodium hypochlorite, g of available chlorine (as Cl₂). */
  hypochlorite?: number;
  /** Chlorate arriving with it, g ClO₃ (from the tank's decay). */
  chlorate?: number;
  /** Hydrochloric acid, g HCl. */
  hcl?: number;
  /** Carbon dioxide, g CO₂. */
  co2?: number;
  /** Sodium bisulphate, g NaHSO₄. */
  bisulphate?: number;
  /** Sodium bicarbonate, g NaHCO₃. */
  bicarbonate?: number;
  /** Sodium carbonate (soda ash), g Na₂CO₃. */
  sodaAsh?: number;
  /** Calcium chloride, g CaCl₂ (anhydrous). */
  calciumChloride?: number;
  /** Calcium hypochlorite, g of available chlorine (as Cl₂). */
  calciumHypochlorite?: number;
  /** Sodium thiosulphate pentahydrate, g. */
  thiosulphate?: number;
  /** Cyanuric acid, g (a wrong delivery). */
  cyanuric?: number;
}

export interface ChemistryInputs {
  /** The water's volume, m³, and temperature, °C. */
  volume: number;
  temperature: number;
  /** Its surface, m², and its circulation, m³/h (for CO₂ loss). */
  surface: number;
  circulation: number;
  /** What was dosed this step, grams. */
  added?: Additions;
  /** Bathers in the water, on average over the step, and how long a visit is, h. */
  bathers?: number;
  visitHours?: number;
  /** How rough the surface is, 0 (still) to 1 (busy), for trichloramine to the air. */
  agitation?: number;
  /** Fresh water this step, m³: as much pool water leaves (backwash to waste, overflow), so it dilutes. */
  freshWater?: number;
  /** Fresh water this step that replaces evaporation, m³: it brings the mains' salts and takes none away. */
  evaporationMakeUp?: number;
  /** The mains' water. */
  mains?: PoolChemistry;
  /** Circulation through lit UV, m³/h, times its share of a full dose. */
  uvFlow?: number;
  /** The hall air's CO₂, ppm (outdoor about 420; a busy hall more). */
  airCo2?: number;
}

/** What crossed the water's boundary or reacted this step, for mass balances. */
export interface ChemistryFluxes {
  /** Free chlorine reduced to chloride, g as Cl₂ (by every reaction). */
  chlorineReduced: number;
  /** Trichloramine to the air, g as Cl₂. */
  trichloramineToAir: number;
  /** Nitrogen to N₂, g N. */
  nitrogenGas: number;
  /** Nitrogen to the air as trichloramine, g N. */
  nitrogenToAir: number;
  /** CO₂ to the air, g (negative: taken up). */
  co2ToAir: number;
}

const zeroFluxes = (): ChemistryFluxes => ({
  chlorineReduced: 0,
  trichloramineToAir: 0,
  nitrogenGas: 0,
  nitrogenToAir: 0,
  co2ToAir: 0,
});

/** The species that mix and dilute as plain concentrations (everything but pH): what the circulation carries. */
export const CONSERVED = [
  'freeChlorine',
  'chloramine',
  'organicChloramine',
  'trichloramine',
  'ammonia',
  'urea',
  'demand',
  'demandSlow',
  'alkalinity',
  'carbonate',
  'hardness',
  'tds',
  'sulphate',
  'chlorate',
  'cyanuric',
  'thiosulphate',
] as const satisfies readonly (keyof PoolChemistry)[];

/** Mixed waters, by volume: every species but pH is conservative; pH is solved again. */
export function mixWaters(
  parts: readonly { water: PoolChemistry; volume: number }[],
  temperature: number,
): PoolChemistry {
  const total = parts.reduce((t, p) => t + Math.max(0, p.volume), 0);
  const first = parts[0].water;
  if (!(total > 0)) return first;
  const out = { ...first };
  for (const k of CONSERVED)
    out[k] =
      parts.reduce((t, p) => t + p.water[k] * Math.max(0, p.volume), 0) / total;
  out.ph = solvePh(
    out.alkalinity,
    out.carbonate,
    out.freeChlorine,
    temperature,
    out.tds,
    first.ph,
  );
  return out;
}

/**
 * Additions, as concentration changes (mg/l, or mmol/l for carbonate) per
 * gram in a cubic metre, from their moles and equivalents
 * (`pool-dosing-and-water-chemistry.md` §2.1). Alkalinity is counted with
 * HOCl, CO₂*, NH₄⁺, Cl⁻ and SO₄²⁻ as the reference species, so hypochlorite
 * ion adds one equivalent a mole and every chlorine reduced to chloride
 * takes one away.
 */
function add(w: PoolChemistry, a: Additions, volume: number): PoolChemistry {
  const per = (g = 0) => Math.max(0, g) / volume; // mg/l
  const out = { ...w };
  const alk = (meq: number) => (out.alkalinity += meq * ALK_EQ);
  const hypo = per(a.hypochlorite);
  if (hypo) {
    out.freeChlorine += hypo;
    alk(hypo / MOLAR.Cl2 + (hypo * CHEMISTRY.hypochloriteCaustic) / MOLAR.NaOH);
    out.tds +=
      hypo * (CHEMISTRY.hypochloriteTds + CHEMISTRY.hypochloriteCaustic);
  }
  const chlorate = per(a.chlorate);
  out.chlorate += chlorate;
  out.tds += chlorate * (1 + 22.99 / 83.45);
  const calHypo = per(a.calciumHypochlorite);
  if (calHypo) {
    out.freeChlorine += calHypo;
    alk(calHypo / MOLAR.Cl2);
    out.hardness += (calHypo / (2 * MOLAR.Cl2)) * MOLAR.CaCO3;
    out.tds += calHypo * ((40.08 + MOLAR.Cl2) / (2 * MOLAR.Cl2));
  }
  const hcl = per(a.hcl);
  alk(-hcl / MOLAR.HCl);
  out.tds += hcl * (35.453 / MOLAR.HCl);
  const co2 = per(a.co2);
  out.carbonate += co2 / MOLAR.CO2;
  const bis = per(a.bisulphate);
  alk(-bis / MOLAR.NaHSO4);
  out.sulphate += bis * (MOLAR.SO4 / MOLAR.NaHSO4);
  out.tds += bis;
  const bicarb = per(a.bicarbonate);
  alk(bicarb / MOLAR.NaHCO3);
  out.carbonate += bicarb / MOLAR.NaHCO3;
  out.tds += bicarb;
  const ash = per(a.sodaAsh);
  alk((2 * ash) / MOLAR.Na2CO3);
  out.carbonate += ash / MOLAR.Na2CO3;
  out.tds += ash;
  const cacl = per(a.calciumChloride);
  out.hardness += cacl * (MOLAR.CaCO3 / MOLAR.CaCl2);
  out.tds += cacl;
  const thio = per(a.thiosulphate);
  out.thiosulphate += thio;
  out.tds += thio * (158.11 / MOLAR.thiosulphate);
  const cya = per(a.cyanuric);
  out.cyanuric += cya;
  out.tds += cya;
  return out;
}

/** Thiosulphate's chlorine, mg Cl₂ per mg pentahydrate, and its alkalinity, meq per mmol, by its product split. */
export function thiosulphateStoichiometry(C: ChemistryConstants = CHEMISTRY) {
  const f = C.thiosulphateToSulphate;
  const hoclPerMole = 4 * f + 0.5 * (1 - f); // mol HOCl per mol S₂O₃²⁻
  // S₂O₃²⁻ + 4 HOCl + H₂O → 2 SO₄²⁻ + 4 Cl⁻ + 6 H⁺ ; 2 S₂O₃²⁻ + HOCl + H⁺ → S₄O₆²⁻ + Cl⁻ + H₂O
  const alkPerMole = -6 * f + 0.5 * (1 - f);
  return {
    chlorinePerMg: (hoclPerMole * MOLAR.Cl2) / MOLAR.thiosulphate,
    alkPerMole,
    sulphatePerMg: (2 * f * MOLAR.SO4) / MOLAR.thiosulphate,
  };
}

/** Wojtowicz's CO₂ loss constant for a pool, (mg/l · day)⁻¹. */
export function co2LossConstant(
  i: ChemistryInputs,
  C: ChemistryConstants = CHEMISTRY,
): number {
  const c = C.co2;
  const turnovers = (i.circulation * 24) / Math.max(1e-9, i.volume);
  const k = c.a + c.b * turnovers + c.c * turnovers * turnovers;
  const sv = i.surface / Math.max(1e-9, i.volume) / c.refSurfaceToVolume;
  const R = 1.987; // cal/(mol·K)
  const arr = Math.exp(
    (-c.activation / R) *
      (1 / (i.temperature + 273.15) - 1 / (c.refT + 273.15)),
  );
  return k * sv * arr;
}

/**
 * The water `dt` seconds on: additions, bathers and dilution; then the
 * fast reactions (ammonia and thiosulphate with free chlorine, at once);
 * then the slow ones, each exact over the step with HOCl taken at the
 * step's start, scaled back together if they would use more free chlorine
 * than there is; then first-order losses (UV, air, decay) and carbon
 * dioxide's second-order loss, exact; and pH solved last.
 */
export type ChemistryConstants = typeof CHEMISTRY;

export function stepChemistry(
  water: PoolChemistry,
  i: ChemistryInputs,
  dt: number,
  C: ChemistryConstants = CHEMISTRY,
): { water: PoolChemistry; fluxes: ChemistryFluxes } {
  const fluxes = zeroFluxes();
  if (!(dt > 0)) return { water, fluxes };
  const V = i.volume;
  const T = i.temperature;
  const hours = dt / 3600;
  let w = add(water, i.added ?? {}, V);
  const alk = (meq: number) => (w.alkalinity += meq * ALK_EQ);
  const g = (mgPerL: number) => mgPerL * V; // mg/l over the volume → grams

  // Bathers: their releases over the step, mg/l.
  const visits =
    (Math.max(0, i.bathers ?? 0) * hours) / Math.max(1e-6, i.visitHours ?? 1);
  if (visits > 0) {
    w.urea += (visits * BATHER.ureaN) / 1000 / V;
    w.ammonia += (visits * BATHER.ammoniaN) / 1000 / V;
    w.demand += (visits * BATHER.demand * BATHER.fastShare) / 1000 / V;
    w.demandSlow +=
      (visits * BATHER.demand * (1 - BATHER.fastShare)) / 1000 / V;
    w.tds += (visits * C.batherTds) / 1000 / V;
  }

  // Dilution (exponential, exact) and evaporation's make-up (salts in, none out).
  const mains = i.mains;
  if (mains && (i.freshWater ?? 0) > 0) {
    const keep = Math.exp(-(i.freshWater ?? 0) / V);
    for (const k of CONSERVED) w[k] = mains[k] + (w[k] - mains[k]) * keep;
  }
  if (mains && (i.evaporationMakeUp ?? 0) > 0) {
    const share = (i.evaporationMakeUp ?? 0) / V;
    for (const k of CONSERVED) w[k] += mains[k] * share;
  }

  // Fast: thiosulphate with free chlorine (minutes at pool pH), then ammonia (under a second).
  if (w.thiosulphate > 0 && w.freeChlorine > 0) {
    const s = thiosulphateStoichiometry(C);
    const thio = Math.min(w.thiosulphate, w.freeChlorine / s.chlorinePerMg);
    const cl = thio * s.chlorinePerMg;
    w.thiosulphate -= thio;
    w.freeChlorine -= cl;
    w.sulphate += thio * s.sulphatePerMg;
    alk((thio / MOLAR.thiosulphate) * s.alkPerMole);
    fluxes.chlorineReduced += g(cl);
  }
  if (w.ammonia > 0 && w.freeChlorine > 0) {
    const n = Math.min(w.ammonia, w.freeChlorine / C.chloraminePerN);
    w.ammonia -= n;
    w.freeChlorine -= n * C.chloraminePerN;
    w.chloramine += n * C.chloraminePerN;
    alk(-n / MOLAR.N); // NH₄⁺ + HOCl → NH₂Cl + H₂O + H⁺
  }

  // Slow: second order in HOCl and each reactant, HOCl held at its value now.
  const ph0 = solvePh(
    w.alkalinity,
    w.carbonate,
    w.freeChlorine,
    T,
    w.tds,
    w.ph,
  );
  const hocl =
    w.freeChlorine * hoclFraction(ph0, T, w.tds) * cyanuricFree(w.cyanuric);
  const gone = (x: number, k: number) => x * (1 - Math.exp(-k * hocl * hours));
  const dDemand = gone(w.demand, C.demandRate);
  const dSlow = gone(w.demandSlow, C.demandSlowRate);
  const dUrea = gone(w.urea, C.ureaRate);
  const dCc = gone(w.chloramine, C.breakpointRate);
  const dOc = gone(w.organicChloramine, C.organicChloramineRate);
  const r = w.chloramine > 0 ? hocl / w.chloramine : 0;
  const yB =
    (C.breakpointTrichloramine.a * r * r) /
    (1 + C.breakpointTrichloramine.b * r * r);
  const yU = C.ureaTrichloramine;
  const clPerN = C.chloraminePerN;
  // Free chlorine each uses (mg Cl₂), and what of it stays bound.
  const useDemand = dDemand; // 1 mg Cl₂ per mg of demand, by definition
  const useSlow = dSlow;
  const ureaN2 = dUrea * (1 - yU);
  const ureaTri = dUrea * yU;
  const useUrea = ureaN2 * 1.5 * clPerN + ureaTri * 3 * clPerN;
  const ccN = dCc / clPerN;
  const ccN2 = ccN * (1 - yB);
  const ccTri = ccN * yB;
  const useCc = ccN2 * (C.breakpointRatio - clPerN) + ccTri * 2 * clPerN;
  const useOc = 0.5 * dOc;
  const want = useDemand + useSlow + useUrea + useCc + useOc;
  const s = want > w.freeChlorine ? w.freeChlorine / want : 1;
  if (want > 0) {
    w.freeChlorine = Math.max(0, w.freeChlorine - s * want);
    w.demand -= s * dDemand;
    w.demandSlow -= s * dSlow;
    w.urea -= s * dUrea;
    w.chloramine -= s * dCc;
    w.organicChloramine -= s * dOc;
    // Bound as organic chloramine: a share of the fast demand's chlorine.
    w.organicChloramine += s * useDemand * C.organicChloramineYield;
    // Trichloramine: from urea (3 Cl a N) and from breakpoint (its own 1 Cl plus 2).
    w.trichloramine += s * (ureaTri * 3 * clPerN + ccTri * 3 * clPerN);
    // Reduced to chloride, each one equivalent of acid a mole; breakpoint 1.5 a mole of chloramine destroyed.
    const reduced =
      s *
      (useDemand * (1 - C.organicChloramineYield) +
        useSlow +
        ureaN2 * 1.5 * clPerN +
        ccN2 * C.breakpointRatio +
        dOc * 1.5);
    fluxes.chlorineReduced += g(reduced);
    fluxes.nitrogenGas += g(s * (ureaN2 + ccN2));
    // Acid: generic chlorine use −1 a mole; urea to N₂ −3 a urea (−1.5 a N) and +1 C_T a urea;
    // urea to NCl₃ adds CO₂ only; chloramine breakpoint −1.5 a mole of Cl₂ destroyed, the rest −1.
    alk(
      -(s / MOLAR.Cl2) *
        (useDemand * (1 - C.organicChloramineYield) +
          useSlow +
          ccN2 * clPerN * 1.5 +
          ccN2 * (C.breakpointRatio - clPerN) +
          dOc * 1.5),
    );
    alk((-s * ureaN2 * 1.5) / MOLAR.N);
    w.carbonate += (s * dUrea) / (2 * MOLAR.N);
  }

  // First order: background loss, UV, the air, chloramines' own decay.
  const pass = (i.uvFlow ?? 0) / V; // passes an hour
  const decayFc = C.chlorineDecay + pass * C.uv.freeChlorine;
  const fcLost = w.freeChlorine * (1 - Math.exp(-decayFc * hours));
  w.freeChlorine -= fcLost;
  alk(-fcLost / MOLAR.Cl2);
  fluxes.chlorineReduced += g(fcLost);
  const ccK = C.chloramineDecay + pass * C.uv.chloramine;
  const ccLost = w.chloramine * (1 - Math.exp(-ccK * hours));
  w.chloramine -= ccLost;
  const ocK = C.chloramineDecay + pass * C.uv.organicChloramine;
  const ocLost = w.organicChloramine * (1 - Math.exp(-ocK * hours));
  w.organicChloramine -= ocLost;
  alk((-1.5 * (ccLost + ocLost)) / MOLAR.Cl2);
  fluxes.chlorineReduced += g(ccLost + ocLost);
  fluxes.nitrogenGas += g(ccLost / clPerN);
  const agitation = Math.min(1, Math.max(0, i.agitation ?? 0));
  const airK =
    C.trichloramineToAirStill +
    (C.trichloramineToAirRough - C.trichloramineToAirStill) * agitation;
  const triAirShare = airK / (airK + pass * C.uv.trichloramine || 1);
  const triLost =
    w.trichloramine *
    (1 - Math.exp(-(airK + pass * C.uv.trichloramine) * hours));
  w.trichloramine -= triLost;
  fluxes.trichloramineToAir += g(triLost) * triAirShare;
  fluxes.nitrogenToAir += g(triLost / (3 * clPerN)) * triAirShare;
  fluxes.chlorineReduced += g(triLost) * (1 - triAirShare);
  fluxes.nitrogenGas += g(triLost / (3 * clPerN)) * (1 - triAirShare);
  alk((-1.5 * triLost * (1 - triAirShare)) / MOLAR.Cl2);

  // Carbon dioxide to (or from) the air: dE/dt = −k·E·|E|, E the excess over equilibrium, exact.
  const ph1 = solvePh(w.alkalinity, w.carbonate, w.freeChlorine, T, w.tds, ph0);
  const sh = carbonateShares(ph1, T, ionicStrength(w.tds));
  const co2 = w.carbonate * sh.a0 * MOLAR.CO2; // mg/l
  const co2Eq =
    10 ** sh.e.logKH * ((i.airCo2 ?? 420) * 1e-6) * MOLAR.CO2 * 1000;
  const excess = co2 - co2Eq;
  const k = co2LossConstant(i, C);
  const days = dt / 86400;
  const after = excess / (1 + k * Math.abs(excess) * days);
  const lost = Math.min(co2, excess - after);
  w.carbonate = Math.max(0, w.carbonate - lost / MOLAR.CO2);
  fluxes.co2ToAir += g(lost);

  for (const key of CONSERVED)
    if (key !== 'alkalinity' && w[key] < 0) w[key] = 0;
  w = {
    ...w,
    ph: solvePh(w.alkalinity, w.carbonate, w.freeChlorine, T, w.tds, ph1),
  };
  return { water: w, fluxes };
}

/**
 * Grams of hydrochloric acid that bring a water of `volume` m³ to `ph`
 * (none if it is already there or lower): what a technician works out from
 * a phenol-red test before adding acid by hand. Bisection on the model's
 * own pH solve.
 */
export function acidFor(
  w: PoolChemistry,
  ph: number,
  volume: number,
  temperature: number,
): number {
  const phWith = (g: number) => {
    const ta = w.alkalinity - ((g / volume / MOLAR.HCl) * MOLAR.CaCO3) / 2;
    return solvePh(ta, w.carbonate, w.freeChlorine, temperature, w.tds, w.ph);
  };
  if (phWith(0) <= ph) return 0;
  let lo = 0;
  let hi = (w.alkalinity / (MOLAR.CaCO3 / 2)) * MOLAR.HCl * volume; // all the alkalinity
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (phWith(mid) > ph) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** A water with something added to it, mixed at once, its pH solved: what a jar test would show. */
export function dose(
  w: PoolChemistry,
  added: Additions,
  volume: number,
  temperature: number,
): PoolChemistry {
  const out = add(w, added, volume);
  return {
    ...out,
    ph: solvePh(
      out.alkalinity,
      out.carbonate,
      out.freeChlorine,
      temperature,
      out.tds,
      w.ph,
    ),
  };
}

/** Dissolved CO₂, mg/l, in equilibrium with air at `ppm`. */
export function co2Equilibrium(ppm: number, temperature: number): number {
  return 10 ** equilibria(temperature).logKH * ppm * 1e-6 * MOLAR.CO2 * 1000;
}

/** A water brought to equilibrium with air at `ppm` CO₂ (its alkalinity unchanged): the pH it heads for. */
export function equilibrateWithAir(
  w: PoolChemistry,
  ppm: number,
  temperature: number,
): PoolChemistry {
  const target = co2Equilibrium(ppm, temperature);
  const co2At = (ct: number) => {
    const ph = solvePh(
      w.alkalinity,
      ct,
      w.freeChlorine,
      temperature,
      w.tds,
      w.ph,
    );
    return {
      ph,
      co2:
        ct *
        carbonateShares(ph, temperature, ionicStrength(w.tds)).a0 *
        MOLAR.CO2,
    };
  };
  let lo = 0;
  let hi = w.carbonate * 2 + 10;
  for (let n = 0; n < 80; n++) {
    const mid = (lo + hi) / 2;
    if (co2At(mid).co2 > target) hi = mid;
    else lo = mid;
  }
  return { ...w, carbonate: lo, ph: co2At(lo).ph };
}

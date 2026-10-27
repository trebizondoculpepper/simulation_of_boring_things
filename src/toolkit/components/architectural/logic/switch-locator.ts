/**
 * A plate light switch's locator LEDs (the owner, 2026-10-27): a small
 * neon-style lamp by each rocker, glowing softly while its gang is OFF so
 * the switch can be found in the dark, and out while it is ON (its lights
 * then show the way), as MK's and Click's illuminated switches do. Lit
 * only while the switch's supply is live. Pure.
 */

export const SWITCH_LOCATOR = {
  /** Its lens's colour: a warm amber, as a neon indicator. */
  colour: '#ffa43a',
  /** Its glow while the gang is off: soft, subtle in a lit room. */
  glow: 0.65,
} as const;

/** How brightly a gang's locator glows, 0 to 1: lit while off and live. */
export const locatorGlow = (on: boolean, live: boolean): number =>
  live && !on ? SWITCH_LOCATOR.glow : 0;

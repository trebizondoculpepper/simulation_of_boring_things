/**
 * A look for the kit: its colours, lettering and proportions. Components
 * name colours by role (`primary`, `alert`) or by a palette name, or give
 * a CSS colour outright, and size themselves from the theme's
 * proportions, so another look is another `Theme`.
 */

export interface Theme {
  /** The screen behind everything. */
  background: string;
  /** Plain lettering on the background. */
  text: string;
  /** Lettering on a coloured block. */
  ink: string;
  /** Named colours, and the roles every component uses. */
  palette: Readonly<Record<string, string>>;
  /** A button's colour while pressed. */
  pressed: string;
  /** A font-family list, the host's chosen face first (the host loads it). */
  font: string;
  /** Capitals throughout, as the style has it. */
  uppercase: boolean;
  /**
   * Proportions, as multiples of a button's height: a button's width, the
   * gap between blocks, an elbow's arm, its outer and inner radii, and the
   * elbow's height.
   */
  proportions: {
    buttonWidth: number;
    gap: number;
    arm: number;
    outerRadius: number;
    innerRadius: number;
    elbowHeight: number;
  };
  /** Seconds a touched button shows pressed, for hosts that never send a release. */
  pressHold: number;
  /** Blink periods, seconds: an alarm's, and a warning's. */
  blink: { alarm: number; warning: number };
}

/** A colour by role or palette name, else as given (a CSS colour). */
export const colourOf = (theme: Theme, colour: string) =>
  theme.palette[colour] ?? colour;

/** A canvas font for `px` pixels in the theme's face. */
export const fontOf = (theme: Theme, px: number, weight = 500) =>
  `${weight} ${Math.max(1, Math.round(px))}px ${theme.font}`;

/** Text as the theme letters it. */
export const lettered = (theme: Theme, text: string) =>
  theme.uppercase ? text.toUpperCase() : text;

/**
 * The colour-blocked look on black. Its palette is joernweissenborn/lcars's
 * (`lcars/stylus/lcars_colors.styl`, MIT, © 2014 Garrett, © 2020 Jörn
 * Weißenborn), its pressed colour that library's highlight (hopbush), its
 * proportions the two MIT libraries' (joernweissenborn/lcars's
 * `lcars_variables.styl` and agent-P's `LCARS_Components.js`, MIT, © 2019
 * Perry Spagnola, agree: a button 2.5 times as wide as it is high, a gap
 * of a twelfth of its height, an elbow's arm half its height, the outer
 * radius 1.25 heights and the inner about 0.6), and its blink periods
 * agent-P's (0.5 s for an error, 0.75 s for a warning).
 */
export const BLOCK_THEME: Theme = {
  background: '#000000',
  text: '#ff9933',
  ink: '#000000',
  palette: {
    // joernweissenborn/lcars's named colours.
    'pale-canary': '#ffff99',
    'golden-tanoi': '#ffcc66',
    'neon-carrot': '#ff9933',
    eggplant: '#664466',
    lilac: '#cc99cc',
    anakiwa: '#99ccff',
    mariner: '#3366cc',
    'bahama-blue': '#006699',
    'red-alert': '#ee1100',
    'blue-bell': '#9999cc',
    melrose: '#9999ff',
    hopbush: '#cc6699',
    'chestnut-rose': '#cc6666',
    'orange-peel': '#ff9966',
    'atomic-tangerine': '#ff9900',
    danub: '#6688cc',
    indigo: '#4455bb',
    'lavender-purple': '#9977aa',
    cosmic: '#774466',
    'red-damask': '#dd6644',
    'medium-carmine': '#aa5533',
    bourbon: '#bb6622',
    'sandy-brown': '#ee9955',
    periwinkle: '#ccddff',
    'dodger-blue': '#5599ff',
    husk: '#bbaa55',
    rust: '#bb4411',
    tamarillo: '#882211',
    // Roles.
    primary: '#ffcc66',
    secondary: '#cc99cc',
    tertiary: '#9999cc',
    accent: '#ff9933',
    info: '#99ccff',
    ok: '#99ccff',
    warning: '#ff9900',
    alert: '#ee1100',
    lit: '#ffff99',
    dim: '#4d3d33',
    track: '#2a2a3a',
    frame: '#cc99cc',
  },
  pressed: '#cc6699',
  font: '"Antonio", "Arial Narrow", "Roboto Condensed", "Helvetica Neue", sans-serif',
  uppercase: true,
  proportions: {
    buttonWidth: 2.5,
    gap: 1 / 12,
    arm: 0.5,
    outerRadius: 1.25,
    innerRadius: 0.6,
    elbowHeight: 1.5,
  },
  pressHold: 0.15,
  blink: { alarm: 0.5, warning: 0.75 },
};

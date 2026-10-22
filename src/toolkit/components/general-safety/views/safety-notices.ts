import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { plantTools } from '../../plant/views/plant-tools';
import { SIGN_COLOURS, drawPictogram, fitLine } from './safety-signs';
import type { Pictogram } from './safety-signs';

/**
 * Modern UK workplace notices and posters (`doc/research/mandatory-safety-posters.md`):
 * the statutory ones every workplace with staff must show, and the
 * procedures a pool's plant keeps on its walls, as printed today. All in
 * the game's own wording, not copies of any published poster, and naming
 * no real employer or insurer: the borough and its contractors are
 * fictional.
 */

type Ctx = CanvasRenderingContext2D;

/** Handwriting, for what is filled in by hand. */
const HAND = '"Permanent Marker", "Marker Felt", "Segoe Print", cursive';

/** A piece of a poster's body, top to bottom. */
export type PosterBlock =
  | { heading: string; colour?: string }
  | { text: readonly string[] }
  | { steps: readonly string[] }
  | { fill: string; value: string }
  | { pictograms: readonly Pictogram[] };

export interface PosterSpec {
  /** Its header band: colour, ink, title, a line under it, pictograms in it. */
  band: {
    colour: string;
    ink?: string;
    title: string;
    subtitle?: string;
    pictograms?: readonly Pictogram[];
  };
  blocks: readonly PosterBlock[];
  /** A line of small print at its foot. */
  footer?: string;
}

/** Paper sizes, metres. */
export const PAPER = {
  A4: { w: 0.21, h: 0.297 },
  A3: { w: 0.297, h: 0.42 },
  A5: { w: 0.148, h: 0.21 },
} as const;

/** How tall each block stands, in body lines. */
function rows(b: PosterBlock): number {
  if ('heading' in b) return 1.6;
  if ('text' in b) return b.text.length * 1.15 + 0.4;
  if ('steps' in b) return b.steps.length * 1.3 + 0.3;
  if ('fill' in b) return 1.5;
  return 3.4;
}

/** A poster or notice, `w` × `h` metres, facing +z: its band, its body, its foot. */
export function createPoster(
  kit: PanelKit,
  spec: PosterSpec,
  w: number = PAPER.A4.w,
  h: number = PAPER.A4.h,
) {
  const t = plantTools(kit);
  const poster = t.printed(
    w,
    h,
    (c, cw, ch) => {
      draw(c, cw, ch, spec);
    },
    768,
  );
  poster.mesh.name = `${spec.band.title} notice`;
  return poster.mesh;
}

function draw(c: Ctx, cw: number, ch: number, spec: PosterSpec) {
  const m = cw * 0.06;
  c.fillStyle = SIGN_COLOURS.white;
  c.fillRect(0, 0, cw, ch);
  // The band.
  const bandH = ch * (spec.band.subtitle ? 0.17 : 0.13);
  c.fillStyle = spec.band.colour;
  c.fillRect(0, 0, cw, bandH);
  const pics = spec.band.pictograms ?? [];
  const ps = bandH * 0.78;
  pics.forEach((p, i) => {
    c.fillStyle = SIGN_COLOURS.white;
    drawPictogram(c, p, m + ps / 2 + i * ps * 1.05, bandH / 2, ps);
  });
  const textX = pics.length ? m + pics.length * ps * 1.05 + m * 0.5 : m;
  c.fillStyle = spec.band.ink ?? SIGN_COLOURS.white;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  const titleY = spec.band.subtitle ? bandH * 0.38 : bandH / 2;
  fitLeft(
    c,
    spec.band.title,
    textX,
    titleY,
    cw - textX - m,
    bandH * 0.42,
    'bold',
  );
  if (spec.band.subtitle)
    fitLeft(
      c,
      spec.band.subtitle,
      textX,
      bandH * 0.74,
      cw - textX - m,
      bandH * 0.2,
      '600',
    );
  // The body: every block at one line height, shrunk to fit.
  const top = bandH + m * 0.8;
  const bottom = ch - (spec.footer ? m * 1.6 : m);
  const total = spec.blocks.reduce((sum, b) => sum + rows(b), 0);
  // As large as the page allows, to a readable limit.
  const line = Math.min(ch * 0.055, (bottom - top) / Math.max(total, 1));
  let y = top;
  let step = 0;
  for (const b of spec.blocks) {
    const height = rows(b) * line;
    if ('heading' in b) {
      c.fillStyle = b.colour ?? SIGN_COLOURS.black;
      fitLeft(c, b.heading, m, y + line * 0.8, cw - 2 * m, line * 0.95, 'bold');
    } else if ('text' in b) {
      c.fillStyle = SIGN_COLOURS.black;
      const px = blockSize(c, b.text, cw - 2 * m, line * 0.72, 'normal');
      b.text.forEach((s, i) =>
        fitLeft(c, s, m, y + line * (0.6 + i * 1.15), cw - 2 * m, px, 'normal'),
      );
    } else if ('steps' in b) {
      const px = blockSize(
        c,
        b.steps,
        cw - 2 * m - line * 1.4,
        line * 0.72,
        '600',
      );
      b.steps.forEach((s, i) => {
        step++;
        const cy = y + line * (0.65 + i * 1.3);
        c.fillStyle = spec.band.colour;
        c.beginPath();
        c.arc(m + line * 0.5, cy, line * 0.5, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = spec.band.ink ?? SIGN_COLOURS.white;
        c.textAlign = 'center';
        fitLine(c, String(step), m + line * 0.5, cy, line * 0.8, line * 0.7);
        c.textAlign = 'left';
        c.fillStyle = SIGN_COLOURS.black;
        fitLeft(c, s, m + line * 1.4, cy, cw - 2 * m - line * 1.4, px, '600');
      });
    } else if ('fill' in b) {
      c.fillStyle = SIGN_COLOURS.black;
      fitLeft(c, b.fill, m, y + line * 0.5, cw * 0.4, line * 0.6, '600');
      // The box it is written in, by hand.
      c.strokeStyle = '#555555';
      c.lineWidth = line * 0.06;
      c.strokeRect(cw * 0.45, y, cw * 0.55 - m, line * 1.25);
      c.fillStyle = '#16337a';
      c.font = `${line * 0.78}px ${HAND}`;
      c.fillText(b.value, cw * 0.47, y + line * 0.66, cw * 0.5 - m);
    } else {
      const s = line * 3;
      b.pictograms.forEach((p, i) =>
        drawPictogram(
          c,
          p,
          cw / 2 + (i - (b.pictograms.length - 1) / 2) * s * 1.1,
          y + s / 2 + line * 0.2,
          s,
        ),
      );
    }
    y += height;
  }
  if (spec.footer) {
    c.fillStyle = '#555555';
    fitLeft(c, spec.footer, m, ch - m * 0.8, cw - 2 * m, line * 0.5, 'normal');
  }
}

/**
 * One size for a block's lines: `size`, or less if its longest line would
 * not fit `width` at it, so the lines match.
 */
function blockSize(
  c: Ctx,
  lines: readonly string[],
  width: number,
  size: number,
  weight: string,
) {
  c.font = `${weight} ${size}px ${SANS}`;
  const widest = Math.max(...lines.map((s) => c.measureText(s).width));
  return widest > width ? (size * width) / widest : size;
}

/** Fit `text` within `width`, left-aligned at (x, y). */
function fitLeft(
  c: Ctx,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  weight: string,
) {
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  let px = size;
  c.font = `${weight} ${px}px ${SANS}`;
  const w = c.measureText(text).width;
  if (w > width) px *= width / w;
  c.font = `${weight} ${px}px ${SANS}`;
  c.fillText(text, x, y);
}

/** The borough the centre belongs to, and its people, all fictional. */
export const BOROUGH = {
  council: 'Ashworth Borough Council',
  service: 'Leisure and Culture Services',
  insurer: 'Northgate Municipal Insurance plc',
  policy: 'EL/ABC/0447219',
  firstAiders: [
    'R. Okafor  ext. 214',
    'J. Pearce  ext. 226',
    'S. Lindqvist  ext. 231',
  ],
  safetyRep: 'D. Marsh (Unison)  ext. 219',
  manager: 'T. Hollis, Duty Manager  ext. 210',
};

/**
 * The health and safety law poster every employer must show (Health and
 * Safety Information for Employees Regulations 1989): what employer and
 * employee must do, and, filled in by hand, who to ask. A3.
 */
export function createLawPoster(kit: PanelKit) {
  return createPoster(
    kit,
    {
      band: {
        colour: '#5b2a86',
        title: 'Health and Safety Law',
        subtitle: 'What you need to know',
      },
      blocks: [
        { heading: 'What your employer must do', colour: '#5b2a86' },
        {
          text: [
            'Assess the risks of your work and control them.',
            'Tell you about the risks and how you are protected.',
            'Train you, and give you the equipment you need, free.',
            'Provide toilets, washing, drinking water and first aid.',
            'Consult you, or your representatives, on health and safety.',
            'Report certain injuries, diseases and dangerous occurrences.',
          ],
        },
        { heading: 'What you must do', colour: '#5b2a86' },
        {
          text: [
            'Follow the training you have been given.',
            'Take care of your own and other people’s safety.',
            'Co-operate with your employer on health and safety.',
            'Tell someone if you think the work, or the precautions, are unsafe.',
          ],
        },
        { heading: 'Who to ask', colour: '#5b2a86' },
        { fill: 'Health and safety contact', value: BOROUGH.manager },
        { fill: 'Safety representative', value: BOROUGH.safetyRep },
        { fill: 'Enforcing authority', value: 'HSE, Birmingham area office' },
      ],
      footer: `${BOROUGH.council} · ${BOROUGH.service}`,
    },
    PAPER.A3.w,
    PAPER.A3.h,
  );
}

/**
 * The employer's liability insurance certificate (Employers' Liability
 * (Compulsory Insurance) Act 1969): who is insured, by whom, for how much
 * and when. A4.
 */
export function createInsuranceCertificate(kit: PanelKit) {
  return createPoster(kit, {
    band: {
      colour: '#24364f',
      title: 'Certificate of Employers’ Liability Insurance',
      subtitle: 'Employers’ Liability (Compulsory Insurance) Act 1969',
    },
    blocks: [
      { fill: 'Policy number', value: BOROUGH.policy },
      { fill: 'Employer', value: BOROUGH.council },
      { fill: 'Date of commencement', value: '1 April' },
      { fill: 'Date of expiry', value: '31 March' },
      {
        text: [
          'We certify that the policy to which this certificate relates',
          'satisfies the requirements of the Act, for £10 million',
          'in respect of any one occurrence.',
        ],
      },
      { heading: BOROUGH.insurer, colour: '#24364f' },
    ],
    footer:
      'This certificate must be displayed where employees can easily read it.',
  });
}

/** The first-aid notice: who the first-aiders are, where the kit is. A4. */
export function createFirstAidNotice(kit: PanelKit) {
  return createPoster(kit, {
    band: {
      colour: SIGN_COLOURS.green,
      title: 'First Aid',
      subtitle: 'Your first-aiders and first-aid kits',
      pictograms: ['first-aid'],
    },
    blocks: [
      { heading: 'First-aiders', colour: SIGN_COLOURS.green },
      ...BOROUGH.firstAiders.map((f) => ({ fill: 'First-aider', value: f })),
      { heading: 'First-aid kits', colour: SIGN_COLOURS.green },
      {
        text: [
          'Control room, by the door.',
          'Each pool hall’s first-aid point.',
          'Chemical stores: eyewash and safety shower.',
        ],
      },
      { heading: 'In an emergency dial 999', colour: SIGN_COLOURS.red },
      {
        text: [
          '(9 for an outside line), then tell the control room, ext. 200.',
        ],
      },
    ],
  });
}

/** The fire action notice, beside each fire alarm call point. A4. */
export function createFireActionNotice(kit: PanelKit) {
  return createPoster(kit, {
    band: { colour: SIGN_COLOURS.blue, title: 'FIRE ACTION' },
    blocks: [
      { heading: 'If you discover a fire', colour: SIGN_COLOURS.blue },
      {
        steps: [
          'Raise the alarm at the nearest fire alarm call point.',
          'Call the fire brigade: dial 999.',
          'Tackle the fire only if trained and it is safe to.',
        ],
      },
      { heading: 'On hearing the alarm', colour: SIGN_COLOURS.blue },
      {
        steps: [
          'Leave by the nearest exit. Help bathers out of the water.',
          'Close doors behind you. Do not use the lifts.',
          'Do not stop for belongings. Do not go back in.',
        ],
      },
      { heading: 'Assembly point', colour: SIGN_COLOURS.blue },
      { fill: 'Assemble at', value: 'Car park, east side' },
    ],
  });
}

/** What to do if you smell gas, at the gas emergency control valve. A4. */
export function createGasEmergencyNotice(kit: PanelKit) {
  return createPoster(kit, {
    band: {
      colour: SIGN_COLOURS.yellow,
      ink: SIGN_COLOURS.black,
      title: 'Gas Emergency',
      subtitle: 'If you smell gas',
      pictograms: ['general'],
    },
    blocks: [
      {
        steps: [
          'Do not smoke or use any naked flame.',
          'Do not operate electrical switches, on or off.',
          'Open the doors to ventilate.',
          'Turn off the supply at the emergency control valve.',
          'Leave the building and keep people away.',
        ],
      },
      {
        heading: 'Call the National Gas Emergency',
        colour: SIGN_COLOURS.black,
      },
      { heading: 'Service: 0800 111 999', colour: SIGN_COLOURS.red },
      { fill: 'Emergency control valve', value: 'Boiler house, gas train' },
    ],
  });
}

/** What to do for a person who has had an electric shock. A3. */
export function createElectricShockPoster(kit: PanelKit) {
  return createPoster(
    kit,
    {
      band: {
        colour: SIGN_COLOURS.yellow,
        ink: SIGN_COLOURS.black,
        title: 'Electric Shock',
        subtitle: 'What to do',
        pictograms: ['electricity'],
      },
      blocks: [
        {
          steps: [
            'Do not touch them until the supply is off.',
            'Switch off at the isolator, or pull the plug.',
            'If you cannot, push them clear with dry wood.',
            'Dial 999 for an ambulance.',
            'Check their breathing. If they are not breathing:',
            'Start CPR: 30 chest compressions, then 2 breaths.',
            'Use the defibrillator (AED) if one is to hand.',
            'Keep going until help arrives.',
          ],
        },
        { heading: 'Burns: cool with cold water for 20 minutes.' },
      ],
    },
    PAPER.A3.w,
    PAPER.A3.h,
  );
}

/** What to do after a chemical spill, in the chemical stores. A4. */
export function createSpillageNotice(kit: PanelKit) {
  return createPoster(kit, {
    band: {
      colour: SIGN_COLOURS.yellow,
      ink: SIGN_COLOURS.black,
      title: 'Chemical Spillage',
      subtitle: 'Procedure',
      pictograms: ['corrosive'],
    },
    blocks: [
      {
        steps: [
          'Warn others and keep them away.',
          'Put on gloves, face shield, apron and boots.',
          'Stop the leak if it is safe to: close the valve.',
          'Contain the spill with the spill kit’s booms.',
          'Never let acid and hypochlorite meet.',
          'Report it to the duty manager, ext. 210.',
        ],
      },
      { pictograms: ['gloves', 'face-shield', 'apron', 'boots'] },
    ],
  });
}

/** The warning never to mix the two chemicals. A4 landscape. */
export function createNeverMixNotice(kit: PanelKit) {
  return createPoster(
    kit,
    {
      band: {
        colour: SIGN_COLOURS.red,
        title: 'DANGER: NEVER MIX',
        pictograms: ['general'],
      },
      blocks: [
        { heading: 'Sodium hypochlorite and acid', colour: SIGN_COLOURS.red },
        {
          text: [
            'Together they give off chlorine gas, which can kill.',
            'Separate stores, separate pumps, separate lines.',
            'Never use the same container, funnel or hose for both.',
          ],
        },
      ],
    },
    PAPER.A4.h,
    PAPER.A4.w,
  );
}

/** The pool's rules, for bathers, poolside. A2-ish board. */
export function createPoolRules(kit: PanelKit, pool = 'Pool') {
  return createPoster(
    kit,
    {
      band: { colour: SIGN_COLOURS.blue, title: `${pool} Rules` },
      blocks: [
        {
          steps: [
            'Shower before you swim.',
            'No running on the poolside.',
            'No diving except where shown.',
            'Children under 8 must be with a responsible adult.',
            'No food, drink or glass on the poolside.',
            'Do as the lifeguards ask.',
          ],
        },
        { pictograms: ['no-diving', 'slippery'] },
      ],
    },
    0.42,
    0.594,
  );
}

/** The spa's rules (HSG282): its limits, for bathers. A3. */
export function createSpaRules(kit: PanelKit) {
  return createPoster(
    kit,
    {
      band: {
        colour: SIGN_COLOURS.blue,
        title: 'Spa Pool',
        subtitle: 'For your safety',
      },
      blocks: [
        {
          steps: [
            'No more than 8 bathers at a time.',
            'No longer than 15 minutes at a time.',
            'Shower before you use it.',
            'Not for children under 14.',
            'Not if you are pregnant, or have heart or blood pressure trouble.',
            'No alcohol.',
          ],
        },
        { heading: 'Water temperature 37 °C', colour: SIGN_COLOURS.blue },
      ],
    },
    PAPER.A3.w,
    PAPER.A3.h,
  );
}

/** A pool's depth marking, on its wall or poolside: the depth in metres. */
export function createDepthSign(kit: PanelKit, depth: number) {
  const t = plantTools(kit);
  const sign = t.printed(
    0.3,
    0.15,
    (c, cw, ch) => {
      c.fillStyle = SIGN_COLOURS.white;
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = SIGN_COLOURS.blue;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitLine(
        c,
        `${depth.toFixed(1)} m`,
        cw / 2,
        ch * 0.55,
        cw * 0.86,
        ch * 0.75,
      );
    },
    256,
  );
  sign.mesh.name = `depth ${depth} m sign`;
  return sign.mesh;
}

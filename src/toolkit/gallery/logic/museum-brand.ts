import { brandById } from '../../components/core/logic/brands';

/**
 * The museum's and the exhibition's brand (mission 107), in one place.
 * The owner chose it, 2026-10-28: "PLANTROOMS: The real backrooms of the
 * Poolrooms". The museum's marketing department is chasing a meme (the
 * liminal, tiled "Poolrooms" pictures) to bring in young visitors, for an
 * earnest, well-made exhibition about real pool plant rooms: so the
 * branding is knowing and a little try-hard (pale aqua tiles, a hint of
 * fluorescent glow, a hashtag), and the signs themselves stay clear and
 * educational. The exhibition's maker entry, mark and colours are in
 * `brands.ts` (`plantrooms`); this adds what signs need beyond them. Both
 * the museum and the exhibition are our own invention, and nothing here
 * is drawn from any Backrooms or Poolrooms image. Pure data.
 */

const PLANTROOMS = brandById('plantrooms');

export interface MuseumBrand {
  /** The museum: a converted dye works in an old industrial quarter. */
  museum: string;
  /** Under the museum's name. */
  museumLine: string;
  /** The exhibition, as its wordmark sets it. */
  name: string;
  /** Its line under the name. */
  strapline: string;
  /** What it is really about, plainly. */
  subtitle: string;
  /** The marketing department's question, and its hashtag. */
  tagline: string;
  hashtag: string;
  /** The dry note, for a light touch on the signs. */
  wink: string;
  /** The signs' colours: main teal, an accent, the ink, the panels' tile-white ground, pale aqua. */
  colours: {
    main: string;
    accent: string;
    ink: string;
    ground: string;
    soft: string;
  };
  /** The signs' type: a friendly, rounded, geometric sans, bold for headings. */
  font: string;
}

export const MUSEUM_EXHIBITION: MuseumBrand = {
  museum: 'The Dyehouse',
  museumLine: 'Museum of Science and Work',
  name: PLANTROOMS.wordmark ?? PLANTROOMS.name,
  strapline: PLANTROOMS.tagline,
  subtitle: 'How a swimming pool really works',
  tagline: 'Can YOU find the plant room?',
  hashtag: '#ThePlantRooms',
  wink: 'Unlike the Poolrooms, every room here is real, and every machine in it works.',
  colours: {
    main: PLANTROOMS.colours[0],
    accent: '#ef6f4f',
    ink: PLANTROOMS.colours[2],
    ground: '#f3f8f6',
    soft: PLANTROOMS.colours[1],
  },
  font: '"Avenir Next", "Nunito", "Trebuchet MS", "Segoe UI", Arial, sans-serif',
};

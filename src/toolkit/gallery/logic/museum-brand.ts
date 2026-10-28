/**
 * The museum's and the exhibition's working brand (mission 107), in one
 * place so it is easy to swap: the owner has not chosen yet among the
 * options in `doc/prompts/107-pool-science-museum.md`, so this is the
 * first choice, used on every sign meanwhile. Both are our own invention;
 * no real museum is named or imitated. Pure data.
 */

export interface MuseumBrand {
  /** The museum: a converted dye works in an old industrial quarter. */
  museum: string;
  /** Under the museum's name. */
  museumLine: string;
  /** The exhibition. */
  name: string;
  strapline: string;
  /** The exhibition's colours: its main blue, its accent, the ink, the panels' ground. */
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
  name: 'Making a Splash',
  strapline: 'How a swimming pool works',
  colours: {
    main: '#0b6fa4',
    accent: '#f26b21',
    ink: '#14212b',
    ground: '#fbfaf6',
    soft: '#dcecf4',
  },
  font: '"Avenir Next", "Nunito", "Trebuchet MS", "Segoe UI", Arial, sans-serif',
};

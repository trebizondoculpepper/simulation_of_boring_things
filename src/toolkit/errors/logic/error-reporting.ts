/**
 * Whether a page reports its errors to Sentry, and as what (the owner,
 * 2026-10-28: "can I use something like Rollbar or Sentry to catch
 * bugs?"). Every run reports, each under its own environment so they are
 * told apart (the owner, 2026-10-30): `itch` (the releases on itch.io),
 * `pages` (GitHub Pages, every push to main), `development` (the dev
 * server) and `local` (a production build served anywhere else, a local
 * preview). The developers' `?dev` panel and automated browsers (the
 * headless checks) never report, so testing does not fill the project's
 * issues. Pure.
 */

/** The project's DSN: where reports go. Public by design: it only lets a page send events. */
export const SENTRY_DSN =
  'https://19485fedcae52ee4a192f8ff4f8c7fd6@o516097.ingest.us.sentry.io/4512336297066496';

export type ReportingEnvironment = 'pages' | 'itch' | 'development' | 'local';

/** Where a page runs, as Sentry's environment: a published host's, else the dev server's, else a local build's. */
export function reportingEnvironment(
  host: string,
  production = true,
): ReportingEnvironment {
  const h = host.toLowerCase();
  if (production && h.endsWith('.github.io')) return 'pages';
  // itch.io serves HTML5 games from its own CDN, in an iframe.
  if (
    production &&
    (h.endsWith('.itch.zone') || h.endsWith('.itch.io') || h === 'itch.io')
  )
    return 'itch';
  return production ? 'local' : 'development';
}

/** Whether this page reports its errors: anywhere but the dev panel and an automated browser. */
export function shouldReport(page: {
  search: string;
  /** `navigator.webdriver`: driven by a test or a headless check. */
  automated: boolean;
}): boolean {
  if (page.automated) return false;
  return !new URLSearchParams(page.search).has('dev');
}

/** The room a report came from, as the address names it, or 'title'. */
export const roomOf = (search: string) =>
  new URLSearchParams(search).get('room') ?? 'title';

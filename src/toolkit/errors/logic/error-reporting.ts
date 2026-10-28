/**
 * Whether a build reports its errors to Sentry, and as what (the owner,
 * 2026-10-28: "can I use something like Rollbar or Sentry to catch
 * bugs?"). Only the published builds report: GitHub Pages (every push to
 * main) and itch.io (releases). The dev server, a local preview and the
 * developers' `?dev` panel never do, so testing does not fill the
 * project's issues. Pure.
 */

/** The project's DSN: where reports go. Public by design: it only lets a page send events. */
export const SENTRY_DSN =
  'https://19485fedcae52ee4a192f8ff4f8c7fd6@o516097.ingest.us.sentry.io/4512336297066496';

export type ReportingEnvironment = 'pages' | 'itch';

/** Where a page is served from, as Sentry's environment, or null for anywhere that does not report. */
export function reportingEnvironment(
  host: string,
): ReportingEnvironment | null {
  const h = host.toLowerCase();
  if (h.endsWith('.github.io')) return 'pages';
  // itch.io serves HTML5 games from its own CDN, in an iframe.
  if (h.endsWith('.itch.zone') || h.endsWith('.itch.io') || h === 'itch.io')
    return 'itch';
  return null;
}

/** Whether this page reports its errors: a production build, on a published host, not the dev panel. */
export function shouldReport(page: {
  production: boolean;
  host: string;
  search: string;
}): boolean {
  if (!page.production) return false;
  if (new URLSearchParams(page.search).has('dev')) return false;
  return reportingEnvironment(page.host) !== null;
}

/** The room a report came from, as the address names it, or 'title'. */
export const roomOf = (search: string) =>
  new URLSearchParams(search).get('room') ?? 'title';

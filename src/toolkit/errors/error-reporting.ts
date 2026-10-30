import * as Sentry from '@sentry/browser';
import { VERSION } from '../../game/version';
import { settings } from '../settings/settings-store';
import {
  SENTRY_DSN,
  reportingEnvironment,
  roomOf,
  shouldReport,
} from './logic/error-reporting';

/**
 * Sends the game's errors to Sentry (`logic/error-reporting.ts`): every
 * uncaught error and unhandled rejection, and what the game catches
 * itself and passes to `reportError`. Errors only: no tracing, no
 * profiling, no replays, no personal data (Sentry's browser SDK sets no
 * cookies, and is told not to send the player's address). Each report
 * carries the release (`the-pool@` the version, as the build derived it),
 * where it ran (prod, pre-release or dev), its build (the commit,
 * marked if it had uncommitted changes), the room it came from and the
 * graphics preset.
 */

let on = false;

/** Starts reporting, unless this page is the dev panel or automated. Call once, first. */
export function startErrorReporting() {
  if (
    !shouldReport({
      search: location.search,
      automated: navigator.webdriver,
    })
  )
    return;
  Sentry.init({
    dsn: SENTRY_DSN,
    release: `the-pool@${VERSION}`,
    environment: reportingEnvironment(
      location.host,
      import.meta.env.PROD,
      location.protocol,
    ),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      event.tags = {
        ...event.tags,
        room: roomOf(location.search),
        build: import.meta.env.VITE_BUILD,
        graphics: settings.value.graphics,
      };
      return event;
    },
  });
  on = true;
}

/** Reports an error the game caught itself (and showed or survived). */
export function reportError(error: unknown) {
  if (on) Sentry.captureException(error);
}

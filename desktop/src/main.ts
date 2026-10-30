/**
 * The Pool as a desktop app (mission 111): the release's web build,
 * unchanged, in one Electron window. The game is served on its own
 * protocol (`app://game/`), not `file://`, so its origin never changes
 * (the saves and settings in localStorage stay put between versions) and
 * modules and fetch behave as on the web. No game code knows it is here,
 * except Sentry, which reports these runs as `desktop` by the protocol.
 */
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { app, BrowserWindow, protocol, shell } from 'electron';
import {
  APP_HOST,
  APP_ORIGIN,
  APP_SCHEME,
  appPath,
  contentType,
} from './logic/app-path.ts';

/** The web build: packed beside the app as `game/`, or the repository's `dist/` when run from source. */
const GAME = app.isPackaged
  ? join(process.resourcesPath, 'game')
  : resolve(import.meta.dirname, '..', '..', 'dist');

// A standard, secure scheme behaves like https: modules, fetch, storage.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      codeCache: true,
    },
  },
]);

// A game wants its GPU even on drivers Chromium distrusts, and the
// discrete one on laptops that have two.
app.commandLine.appendSwitch('ignore-gpu-blocklist');
if (process.platform === 'win32')
  app.commandLine.appendSwitch('force_high_performance_gpu');

if (!app.requestSingleInstanceLock()) app.quit();

function serveGame() {
  protocol.handle(APP_SCHEME, async (request) => {
    const path = appPath(request.url);
    if (path === null) return new Response('Not found', { status: 404 });
    try {
      const body = await readFile(join(GAME, ...path.split('/')));
      return new Response(body, {
        headers: { 'content-type': contentType(path) },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

function openWindow() {
  const window = new BrowserWindow({
    title: 'The Pool',
    width: 1600,
    height: 900,
    fullscreen: true,
    backgroundColor: '#16130f',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // The world keeps stepping when the window loses focus.
      backgroundThrottling: false,
      // The title music starts at once, without waiting for a click.
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  window.removeMenu();
  // macOS ignores fullscreen on a hidden window: go fullscreen once shown.
  window.once('ready-to-show', () => {
    window.show();
    window.setFullScreen(true);
  });
  // Anything leaving the game (the credits, GitHub) opens in the system browser.
  const external = (url: string) => {
    if (url.startsWith('https:') || url.startsWith('http:'))
      void shell.openExternal(url);
  };
  window.webContents.setWindowOpenHandler(({ url }) => {
    external(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).host === APP_HOST && url.startsWith(APP_ORIGIN)) return;
    event.preventDefault();
    external(url);
  });
  void window.loadURL(`${APP_ORIGIN}/`);
  return window;
}

void app.whenReady().then(() => {
  serveGame();
  let window = openWindow();
  app.on('second-instance', () => {
    if (window.isDestroyed()) window = openWindow();
    if (window.isMinimized()) window.restore();
    window.focus();
  });
});

// A game quits with its window, on macOS too.
app.on('window-all-closed', () => app.quit());

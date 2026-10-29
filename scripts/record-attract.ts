/**
 * Records the title's attract shots, each played end to end, as videos for
 * the itch.io page and the trailer (the owner, 2026-10-29): 3840 × 2160 at
 * 30 frames a second, H.264, no sound, in `doc/marketing/tmp/video/`
 * (not versioned).
 *
 *   node scripts/record-attract.ts             every shot
 *   node scripts/record-attract.ts lounge-flyby  just these
 *
 * Options (environment): RECORD_URL (the dev server, started if not
 * running; default http://127.0.0.1:5175), RECORD_GRAPHICS (default
 * high), RECORD_SCALE (render scale, default 1; 2 draws at twice the size
 * and ffmpeg scales it down), RECORD_SETTLE (seconds to let a room load
 * before recording, default 8), CHROME (its path).
 *
 * Frames are rendered one at a time, not captured in real time: the page's
 * clocks (`performance.now`, `Date.now`, `requestAnimationFrame`) are
 * replaced by one the recorder steps by a thirtieth of a second, so the
 * camera, the world and every display move exactly as they would at 30
 * frames a second however long each frame takes to draw. Needs ffmpeg
 * and Google Chrome.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const WIDTH = 3840;
const HEIGHT = 2160;
const FPS = 30;
const OUT = join(import.meta.dirname, '..', 'doc', 'marketing', 'tmp', 'video');
const URL_BASE = process.env.RECORD_URL ?? 'http://127.0.0.1:5175';
const GRAPHICS = process.env.RECORD_GRAPHICS ?? 'high';
const SCALE = Number(process.env.RECORD_SCALE ?? 1);
const SETTLE = Number(process.env.RECORD_SETTLE ?? 8);
const CHROME =
  process.env.CHROME ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;

/** The shots' ids, read from the shot list (its modules are not Node's to import). */
const SHOT_IDS = [
  ...readFileSync(
    join(
      import.meta.dirname,
      '..',
      'src/toolkit/title/logic/attract-sequence.ts',
    ),
    'utf8',
  )
    .split('export const ATTRACT_SHOTS')[1]
    .matchAll(/id: '([^']+)'/g),
].map((m) => m[1]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The page's clocks, replaced before anything of the game runs. */
const CLOCK = `(() => {
  const realNow = performance.now.bind(performance);
  const realDate = Date.now;
  const realRaf = window.requestAnimationFrame.bind(window);
  const realCancel = window.cancelAnimationFrame.bind(window);
  const offset = realDate() - realNow();
  let virtual = null;
  let queue = new Map();
  let next = 1e9;
  performance.now = () => (virtual === null ? realNow() : virtual);
  Date.now = () => (virtual === null ? realDate() : Math.round(virtual + offset));
  window.requestAnimationFrame = (cb) => {
    if (virtual === null) return realRaf(cb);
    queue.set(next, cb);
    return next++;
  };
  window.cancelAnimationFrame = (id) => {
    queue.delete(id);
    realCancel(id);
  };
  window.recordClock = {
    freeze() { virtual = realNow(); },
    step(ms) {
      virtual += ms;
      const due = queue;
      queue = new Map();
      for (const cb of due.values()) cb(virtual);
    },
  };
})();`;

/** A connection to one page over the Chrome DevTools Protocol. */
async function connect(wsUrl: string) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const waiting = new Map<number, (m: any) => void>();
  ws.onmessage = (e) => {
    const m = JSON.parse(String(e.data));
    if (m.id && waiting.has(m.id)) {
      waiting.get(m.id)!(m);
      waiting.delete(m.id);
    }
  };
  const send = (method: string, params: object = {}) =>
    new Promise<any>((resolve, reject) => {
      const n = ++id;
      waiting.set(n, (m) =>
        m.error ? reject(new Error(m.error.message)) : resolve(m.result),
      );
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async (expression: string) => {
    const r = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails)
      throw new Error(
        r.exceptionDetails.exception?.description ?? r.exceptionDetails.text,
      );
    return r.result.value;
  };
  return { send, evaluate, close: () => ws.close() };
}

async function up(url: string) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

async function main() {
  const wanted = process.argv.slice(2);
  for (const id of wanted)
    if (!SHOT_IDS.includes(id))
      throw new Error(`No shot ${id}; there are ${SHOT_IDS.join(', ')}`);
  const shots = (wanted.length ? wanted : SHOT_IDS).map((id) => ({ id }));
  mkdirSync(OUT, { recursive: true });

  let server: ChildProcess | null = null;
  if (!(await up(URL_BASE))) {
    const port = new URL(URL_BASE).port || '5175';
    server = spawn(
      'npx',
      ['vp', 'dev', '--host', '127.0.0.1', '--port', port],
      {
        stdio: 'ignore',
      },
    );
    for (let i = 0; i < 60 && !(await up(URL_BASE)); i++) await sleep(500);
  }

  const profile = mkdtempSync(join(tmpdir(), 'record-attract-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      '--use-angle=metal',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required',
      `--window-size=${WIDTH},${HEIGHT}`,
    ],
    { stdio: 'ignore' },
  );
  try {
    let version: { webSocketDebuggerUrl?: string } = {};
    for (let i = 0; i < 40 && !version.webSocketDebuggerUrl; i++) {
      await sleep(250);
      version = await fetch(`http://127.0.0.1:${PORT}/json/version`)
        .then((r) => r.json())
        .catch(() => ({}));
    }
    for (const shot of shots) {
      const target = await fetch(
        `http://127.0.0.1:${PORT}/json/new?about:blank`,
        { method: 'PUT' },
      ).then((r) => r.json());
      const page = await connect(target.webSocketDebuggerUrl);
      await page.send('Page.enable');
      await page.send('Emulation.setDeviceMetricsOverride', {
        width: WIDTH,
        height: HEIGHT,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await page.send('Page.addScriptToEvaluateOnNewDocument', {
        source: CLOCK,
      });
      await page.send('Page.navigate', {
        url: `${URL_BASE}/?record=${shot.id}&graphics=${GRAPHICS}&scale=${SCALE}`,
      });
      let seconds = 0;
      for (let i = 0; i < 240 && !seconds; i++) {
        await sleep(500);
        seconds = await page
          .evaluate('window.attractRecording?.seconds ?? 0')
          .catch(() => 0);
      }
      if (!seconds) throw new Error(`Shot ${shot.id} did not load`);
      await sleep(SETTLE * 1000);
      await page.evaluate('recordClock.freeze()');
      // Draw its first frame a few times, so everything has settled.
      for (let i = 0; i < 5; i++)
        await page.evaluate(
          'attractRecording.at(0); recordClock.step(1000 / 30)',
        );

      const frames = Math.ceil(seconds * FPS) + 1;
      const file = join(OUT, `${shot.id}.mp4`);
      const ffmpeg = spawn(
        'ffmpeg',
        [
          '-y',
          '-loglevel',
          'error',
          '-f',
          'image2pipe',
          '-framerate',
          String(FPS),
          '-i',
          '-',
          ...(SCALE !== 1
            ? ['-vf', `scale=${WIDTH}:${HEIGHT}:flags=lanczos`]
            : []),
          '-c:v',
          'libx264',
          '-preset',
          'slow',
          '-crf',
          '16',
          '-pix_fmt',
          'yuv420p',
          '-an',
          '-movflags',
          '+faststart',
          file,
        ],
        { stdio: ['pipe', 'inherit', 'inherit'] },
      );
      const done = new Promise<number>((r) => ffmpeg.on('close', r));
      const started = Date.now();
      for (let f = 0; f < frames; f++) {
        const t = Math.min(seconds, f / FPS);
        const png: string = await page.evaluate(
          `(() => { attractRecording.at(${t}); recordClock.step(${1000 / FPS}); return attractRecording.canvas.toDataURL('image/png'); })()`,
        );
        const data = Buffer.from(png.slice(png.indexOf(',') + 1), 'base64');
        if (!ffmpeg.stdin!.write(data))
          await new Promise((r) => ffmpeg.stdin!.once('drain', r));
        if (f % FPS === 0)
          process.stdout.write(
            `\r${shot.id}: ${(f / FPS).toFixed(0)} / ${seconds.toFixed(0)} s (${((Date.now() - started) / 1000).toFixed(0)} s taken)   `,
          );
      }
      ffmpeg.stdin!.end();
      if ((await done) !== 0) throw new Error(`ffmpeg failed on ${shot.id}`);
      process.stdout.write(`\r${shot.id}: ${frames} frames → ${file}\n`);
      page.close();
      await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`);
    }
  } finally {
    chrome.kill();
    server?.kill();
    rmSync(profile, { recursive: true, force: true });
  }
}

await main();

/**
 * Where a request on the desktop app's own protocol finds its file
 * (mission 111): `app://game/assets/x.js` is `assets/x.js` under the
 * release's `dist/`, `app://game/` its `index.html`. Nothing outside
 * `dist/` can be named, however the path is spelled or encoded, and a
 * request for another host is refused. Pure: paths are joined with `/`
 * and the caller resolves the result against the folder.
 */

/** The protocol's scheme and the one host it serves. */
export const APP_SCHEME = 'app';
export const APP_HOST = 'game';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

/** The file a request names, relative to `dist/`, or null if it names nothing there. */
export function appPath(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== `${APP_SCHEME}:` || parsed.host !== APP_HOST)
    return null;
  let path: string;
  try {
    path = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    // URL parsing folds `..` away; one that survives encoding, or a
    // backslash or NUL, is an attempt to leave dist/.
    if (part === '..' || part.includes('\\') || part.includes('\0'))
      return null;
    parts.push(part);
  }
  if (parts.length === 0 || path.endsWith('/')) parts.push('index.html');
  return parts.join('/');
}

/** A served file's type, by its extension; the browser needs it for modules, WebAssembly and media. */
export function contentType(path: string): string {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  ico: 'image/x-icon',
  wasm: 'application/wasm',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  webm: 'video/webm',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  ktx2: 'image/ktx2',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
};

import { describe, expect, it } from 'vite-plus/test';
import { appPath, contentType } from './app-path';

describe('the desktop app’s protocol', () => {
  it('finds a file under dist/, and the index at the root', () => {
    expect(appPath('app://game/')).toBe('index.html');
    expect(appPath('app://game')).toBe('index.html');
    expect(appPath('app://game/index.html?room=dev0')).toBe('index.html');
    expect(appPath('app://game/assets/main-abc.js')).toBe('assets/main-abc.js');
    expect(appPath('app://game/sound/a%20b.mp3')).toBe('sound/a b.mp3');
    expect(appPath('app://game/posters/')).toBe('posters/index.html');
  });

  it('never names anything outside dist/', () => {
    expect(appPath('app://game/../secret')).toBe('secret');
    expect(appPath('app://game/%2e%2e/secret')).toBe('secret');
    expect(appPath('app://game/a/%2e%2e%2f%2e%2e%2fsecret')).toBeNull();
    expect(appPath('app://game/..%5csecret')).toBeNull();
    expect(appPath('app://game/a%00b')).toBeNull();
    expect(appPath('app://game/%E0%A4%A')).toBeNull();
  });

  it('serves only its own host and scheme', () => {
    expect(appPath('app://elsewhere/index.html')).toBeNull();
    expect(appPath('https://game/index.html')).toBeNull();
    expect(appPath('not a url')).toBeNull();
  });

  it('gives each file its type', () => {
    expect(contentType('assets/main.js')).toMatch(/^text\/javascript/);
    expect(contentType('index.html')).toMatch(/^text\/html/);
    expect(contentType('x/y.WASM')).toBe('application/wasm');
    expect(contentType('model.glb')).toBe('model/gltf-binary');
    expect(contentType('README')).toBe('application/octet-stream');
  });
});

import { afterEach, expect, it, vi } from 'vite-plus/test';
import { partAudio } from '../components/core/audio/part-audio';
import { createTitleMusic } from './title-music';

afterEach(() => vi.restoreAllMocks());

it('plays once while the title is shown, stops on entry, and resumes on return', () => {
  const hold = vi.spyOn(partAudio, 'hold').mockImplementation(() => {});
  const music = createTitleMusic();
  music.show();
  const [owner, programme, from, options] = hold.mock.calls[0];
  expect(programme).toBeTypeOf('function');
  // The title's own, heard while the attract sequence hushes the game.
  expect(from).toBeUndefined();
  expect(options).toEqual({ title: true });
  music.show();
  expect(hold).toHaveBeenCalledTimes(1);
  music.hide();
  expect(hold).toHaveBeenLastCalledWith(owner, null);
  music.hide();
  expect(hold).toHaveBeenCalledTimes(2);
  music.show();
  expect(hold).toHaveBeenLastCalledWith(owner, programme, undefined, {
    title: true,
  });
  music.hide();
});

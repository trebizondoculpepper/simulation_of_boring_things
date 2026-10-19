import { expect, it } from 'vite-plus/test';
import { RELOCK_COOLDOWN_MS, lockUnavailable } from './pointer-lock';

it("treats a refusal just after Esc as the browser's cooldown, not a lack of capture", () => {
  expect(lockUnavailable(0)).toBe(false);
  expect(lockUnavailable(900)).toBe(false);
  expect(lockUnavailable(RELOCK_COOLDOWN_MS)).toBe(false);
});

it('treats a refusal well clear of a release, or with none, as capture being unavailable', () => {
  expect(lockUnavailable(RELOCK_COOLDOWN_MS + 1)).toBe(true);
  expect(lockUnavailable(Infinity)).toBe(true);
});

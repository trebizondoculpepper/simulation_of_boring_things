import { expect, it } from 'vite-plus/test';
import { socketDecision } from './repair-socket';

const ready = {
  live: false,
  occupied: false,
  partKind: 'plc-power',
  socketKind: 'plc-power',
};

it('seats a part of its kind at an empty socket, from any board, live or not', () => {
  expect(socketDecision(ready)).toBe('insert');
  expect(socketDecision({ ...ready, live: true })).toBe('insert-live');
  expect(socketDecision({ ...ready, occupied: true })).toBe('occupied');
  expect(socketDecision({ ...ready, partKind: 'plc-cpu' })).toBe('wrong-part');
});

it('still rejects occupied or incompatible sockets while powered', () => {
  const live = { ...ready, live: true };
  expect(socketDecision({ ...live, occupied: true })).toBe('occupied');
  expect(socketDecision({ ...live, partKind: 'plc-cpu' })).toBe('wrong-part');
});

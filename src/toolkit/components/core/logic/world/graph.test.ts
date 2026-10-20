import { describe, expect, it } from 'vite-plus/test';
import { createGraph } from './graph';

/** A small machine: a switch, a heater warming a tank, a lamp on it. */
function tank() {
  const g = createGraph();
  const heater = g.input('heater.switch', false, { where: 'heater switch' });
  const spare = g.input('spare.switch', false);
  const ambient = g.fixed('room.temperature', 20);
  const temperature = g.state('tank.temperature', 20);
  g.process('heating', [heater, ambient], [temperature], (dt) => {
    const target = heater.peek() ? 90 : ambient.peek();
    temperature.set(
      temperature.peek() + (target - temperature.peek()) * dt * 0.1,
    );
  });
  const hot = g.output('lamp.hot', [temperature], (t) => t > 60);
  const reset = g.action('reset', [], [temperature], () => temperature.set(20));
  return { g, heater, spare, temperature, hot, reset };
}

describe('the world graph', () => {
  it('advances states by its processes and derives what is shown', () => {
    const { g, heater, hot } = tank();
    heater.set(true);
    for (let i = 0; i < 200; i++) g.tick(0.1);
    expect(hot.value).toBe(true);
  });

  it('recomputes a derived value only when its result changes', () => {
    const { g, temperature, hot } = tank();
    void hot.value;
    g.resetRecomputes();
    temperature.set(30);
    void hot.value;
    expect(g.recomputes().get('lamp.hot')).toBe(1);
  });

  it('finds controls that change nothing', () => {
    const analysis = tank().g.analyse();
    expect(analysis.deadControls).toEqual(['spare.switch']);
    expect(analysis.unseenControls).toEqual(['spare.switch']);
    expect(analysis.fixedParameters).toEqual(['room.temperature']);
    expect(analysis.constantOutputs).toEqual([]);
    expect(analysis.unwrittenStates).toEqual([]);
  });

  it('snapshots and restores its inputs and states', () => {
    const { g, heater, temperature, reset } = tank();
    heater.set(true);
    temperature.set(70);
    const saved = g.snapshot();
    reset();
    expect(temperature.value).toBe(20);
    g.restore(saved);
    expect(temperature.value).toBe(70);
  });

  it('refuses a vertex that reads one that does not exist', () => {
    const g = createGraph();
    const a = g.input('a', 1);
    expect(() =>
      g.derive(
        'b',
        [{ id: 'ghost', value: 0, peek: () => 0 }, a],
        (x, y) => x + y,
      ),
    ).toThrow(/unknown ghost/);
  });
});

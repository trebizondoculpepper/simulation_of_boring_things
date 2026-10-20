import { describe, expect, it } from 'vite-plus/test';
import { signal } from '@preact/signals-core';
import {
  createCircuitBreaker,
  createServiceComponent,
} from './machine-components';

describe('machine circuit components', () => {
  it('requires OFF after a breaker trip before closing the contacts', () => {
    const breaker = createCircuitBreaker();
    expect(breaker.closed.value).toBe(true);
    breaker.trip();
    expect(breaker.closed.value).toBe(false);
    breaker.operate();
    expect(breaker.position.value).toBe('off');
    expect(breaker.closed.value).toBe(false);
    breaker.operate();
    expect(breaker.closed.value).toBe(true);
  });

  it('loses PLC outputs when its supply or processor is withdrawn or fails', () => {
    const supply = createServiceComponent('plc-power');
    const cpu = createServiceComponent('plc-cpu', { power: supply.running });
    const output = createServiceComponent('plc-output', {
      power: supply.running,
      enabled: cpu.running,
      input: signal(1),
    });
    expect(supply.output.value).toBe(5);
    expect(output.output.value).toBe(65535);
    supply.connected.flip();
    expect(cpu.running.value).toBe(false);
    expect(output.channels.value.every((v) => !v)).toBe(true);
    supply.connected.flip();
    cpu.fail();
    expect(supply.output.value).toBe(5);
    expect(output.output.value).toBe(0);
    cpu.repair();
    expect(output.output.value).toBe(65535);
    [supply, cpu, output].forEach((c) => c.dispose());
  });

  it('scans only while powered and enabled, and isolates a loose terminal', () => {
    const enable = signal(true);
    const cpu = createServiceComponent('plc-cpu', { enabled: enable });
    cpu.tick(0.1);
    expect(cpu.cycles.value).toBe(10);
    enable.value = false;
    cpu.tick(10);
    expect(cpu.cycles.value).toBe(10);
    const terminal = createServiceComponent('terminal', { input: signal(1) });
    expect(terminal.output.value).toBe(24);
    terminal.connected.flip();
    expect(terminal.output.value).toBe(0);
    cpu.dispose();
    terminal.dispose();
  });

  it('clamps analogue demand and cuts conversion on faults', () => {
    const input = signal(2);
    const analog = createServiceComponent('plc-analog', { input });
    expect(analog.output.value).toBe(10);
    input.value = -1;
    expect(analog.output.value).toBe(0);
    input.value = 0.5;
    expect(analog.output.value).toBe(5);
    analog.fail();
    expect(analog.output.value).toBe(0);
    analog.dispose();
  });
});

import { describe, expect, it } from 'vite-plus/test';
import {
  createTerminal,
  pressTerminalKey,
  terminalLines,
} from './operator-terminal';

describe('the operator terminal', () => {
  it('changes screens on F1 to F4, and says F5 to F8 do nothing', () => {
    const t = createTerminal();
    pressTerminalKey(t, 'F3');
    expect(terminalLines(t, 0)[0]).toBe('EVENTS');
    pressTerminalKey(t, 'F7');
    expect(terminalLines(t, 0)).toContain('F7 NOT CONFIGURED');
  });

  it('takes a setpoint typed on the keypad and logs it', () => {
    const t = createTerminal();
    pressTerminalKey(t, 'F2');
    for (const k of ['9', '0', '0', '↵']) pressTerminalKey(t, k);
    expect(t.setpoint).toBe(900);
    pressTerminalKey(t, 'F3');
    expect(terminalLines(t, 0)[1]).toBe('SETPOINT 900');
  });

  it('refuses a setpoint out of range', () => {
    const t = createTerminal();
    pressTerminalKey(t, 'F2');
    for (const k of ['5', '0', '0', '0', '↵']) pressTerminalKey(t, k);
    expect(t.setpoint).toBe(1200);
    expect(terminalLines(t, 0)).toContain('OUT OF RANGE 0-1800');
  });

  it('shows the speed it is given on its main screen', () => {
    const t = createTerminal();
    expect(terminalLines(t, 873.4)[1]).toBe('SPEED      873 RPM');
  });
});

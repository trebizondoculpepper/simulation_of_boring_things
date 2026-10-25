import { describe, expect, it } from 'vite-plus/test';
import { ozoneGeneratorStatus } from './ozone-status';
import { inspectComponent } from '../../../game/plant/component-inspection';
import { newWorld } from '../../../game/world';

const shown = (over: Partial<Parameters<typeof ozoneGeneratorStatus>[0]>) => ({
  powered: true,
  producing: false,
  tripped: false,
  message: ['OZ-160   80 g/h', 'RUNNING'],
  ...over,
});

describe('an ozone generator’s status, as it shows it', () => {
  it('says operational, standby, blocked, tripped or unpowered', () => {
    expect(ozoneGeneratorStatus(shown({ producing: true }))).toBe(
      'operational, producing ozone',
    );
    expect(ozoneGeneratorStatus(shown({}))).toBe('operational');
    expect(ozoneGeneratorStatus(shown({ message: ['', 'STANDBY'] }))).toBe(
      'on standby',
    );
    expect(
      ozoneGeneratorStatus(shown({ message: ['', 'BLOCKED: NO FLOW'] })),
    ).toBe('blocked: no flow');
    expect(
      ozoneGeneratorStatus(shown({ tripped: true, message: ['', 'E3 DRYER'] })),
    ).toBe('tripped (E3 DRYER)');
    expect(ozoneGeneratorStatus(shown({ powered: false }))).toBe('unpowered');
  });

  it('reaches the overlay through the generator’s own status', () => {
    expect(
      inspectComponent(
        { tag: 'PL1-OZ1', status: () => 'unpowered' },
        newWorld(),
      )?.detail,
    ).toBe('The only Ozone generator in PL1, currently unpowered');
  });
});

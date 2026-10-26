import { describe, expect, it } from 'vite-plus/test';
import { equipmentHeading, inspectComponent } from './component-inspection';
import { applyAction, newWorld, stepWorld } from '../world';

describe('the information overlay’s lines', () => {
  it('gives a valve’s tag, name and what it isolates', () => {
    expect(inspectComponent({ tag: 'PL2-F1-V1' }, newWorld())).toEqual({
      key: 'PL2-F1-V1',
      title: 'PL2-F1-V1 (butterfly valve) - open',
      detail:
        'Isolates water flowing from the circulation pumps to sand filter 1.',
    });
    // The jacuzzi's, from its schematic (prompt 064).
    expect(inspectComponent({ tag: 'PL3-BT1-IV1' }, newWorld())).toEqual({
      key: 'PL3-BT1-IV1',
      title: 'PL3-BT1-IV1 (butterfly valve) - open',
      detail:
        'Isolates water flowing from the water service to the jacuzzi balance tank.',
    });
  });

  it('gives the first Olympic pump its place and its live state', () => {
    const lines = inspectComponent({ tag: 'P-101A' }, newWorld());
    expect(lines?.title).toBe('P-101A (Grundflow pump) - On');
    expect(lines?.detail).toMatch(/^The 1st pump in Plant Room 2$/);
  });

  it('leaves out a second line it has nothing for, names an untagged thing alone, and knows no stranger', () => {
    expect(inspectComponent({ tag: 'PL2-F-RV1' })).toEqual({
      key: 'PL2-F-RV1',
      title: 'PL2-F-RV1 (butterfly valve)',
    });
    expect(inspectComponent({ name: 'Cabinet RESET' })).toEqual({
      key: 'name:Cabinet RESET',
      title: 'Cabinet RESET',
    });
    expect(inspectComponent({ tag: 'XX-NOPE1' })).toBeNull();
    expect(
      inspectComponent({ tag: 'DEV-FT1', name: 'Demonstration flowmeter' }),
    ).toEqual({ key: 'DEV-FT1', title: 'DEV-FT1 (Demonstration flowmeter)' });
    expect(inspectComponent({})).toBeNull();
  });

  it('gives an ozone monitor its live reading, rising with a leak', () => {
    const quiet = inspectComponent({ tag: 'PL1-GD1' }, newWorld());
    expect(quiet?.detail).toBe('The only ozone-in-air monitor in Plant Room 1');
    expect(quiet?.title).toBe(
      'PL1-GD1 (Warden Fire Systems ozone-in-air monitor) - reading 0.00 ppm',
    );
    let w = applyAction(newWorld(), {
      type: 'gas/leak',
      zone: 'plant_pool_01',
      gramsPerHour: 5,
    });
    w = stepWorld(w, 600);
    // As its display shows it: a reading above nothing, or over its range.
    expect(inspectComponent({ tag: 'PL1-GD1' }, w)?.title).toMatch(
      /reading (0\.(0[1-9]|[1-9]\d)|1\.\d\d) ppm|reading over its range \(O-R\)/,
    );
  });

  it('says a UV unit is On or Off, as the world models it, never “operational”', () => {
    let w = stepWorld(newWorld(), 5);
    expect(inspectComponent({ tag: 'PL1-UV1' }, w)?.title).toMatch(
      /\(.*UV unit\) - On$/,
    );
    w = applyAction(w, {
      type: 'plant/isolator',
      name: 'Lounge UV unit isolator',
      on: false,
    });
    w = stepWorld(w, 2);
    expect(inspectComponent({ tag: 'PL1-UV1' }, w)?.title).toMatch(
      /\(.*UV unit\) - Off$/,
    );
  });

  it('gives a travelling lounge valve where it actually is, not where it is commanded', () => {
    const tag = 'PL1-F1-IV1';
    let w = stepWorld(newWorld(), 1);
    // PL1-F1-IV1 is kept under valve-0001.
    w = applyAction(w, { type: 'plant/valve', id: 'valve-0001', open: false });
    w = stepWorld(w, 2);
    expect(inspectComponent({ tag }, w)?.title).toMatch(/ - part open$/);
    w = stepWorld(w, 3);
    expect(inspectComponent({ tag }, w)?.title).toMatch(/ - shut$/);
  });
});

it('formats only known maker, model and status fields', () => {
  expect(
    equipmentHeading(
      { id: 'B-501', brand: 'hamwarmy', model: 'HW 300', type: 'Boiler' },
      'firing',
    ),
  ).toBe('B-501 (Hamwarmy Heating HW 300 boiler) - firing');
  expect(
    equipmentHeading({ id: 'V1', brand: 'unbranded', type: 'Valve' }),
  ).toBe('V1 (valve)');
  expect(equipmentHeading({ id: 'UV1', type: 'UV unit' }, 'Off')).toBe(
    'UV1 (UV unit) - Off',
  );
});

describe('an untagged component with a state of its own', () => {
  it('shows its state after its name', () => {
    expect(
      inspectComponent({
        name: 'Synclex jacuzzi amplifier',
        status: () => 'Off',
      })?.title,
    ).toBe('Synclex jacuzzi amplifier - Off');
    expect(inspectComponent({ name: 'Rack' })?.title).toBe('Rack');
  });
});

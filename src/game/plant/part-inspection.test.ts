import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from '../world';
import type { World } from '../world';
import { LOUNGE_VALVES } from './lounge-valves';
import { describePart } from './part-inspection';
import { inspectComponent } from './component-inspection';
import {
  LOUNGE_FILTER_MIMIC_PARTS as P,
  loungeFilterMimicCommand,
} from '../../toolkit/gallery/logic/lounge-filter-mimic';

/** Parts inside components, in their own words (prompt 068). */
const id = (tag: string) => LOUNGE_VALVES.find((v) => v.tag === tag)!.assetId;
const running = () => stepWorld(newWorld(), 5);
const backwashing = (w: World) =>
  stepWorld(
    applyAction(
      applyAction(w, {
        type: 'plant/valve',
        id: id('PL1-F2-IV1'),
        open: false,
      }),
      { type: 'plant/valve', id: id('PL1-F2-BV1'), open: true },
    ),
    6,
  );

describe('a part’s inspection', () => {
  it('words a command from the action its press sends, as a request', () => {
    const button = `${id('PL1-P1-IV1')}/open`;
    const part = P.button(button)!;
    // The same action the board dispatches.
    expect(part.kind === 'command' && part.action).toEqual(
      loungeFilterMimicCommand(button),
    );
    const lines = describePart(part, running());
    expect(lines.title).toBe('OPEN button — Requests PL1-P1-IV1 to open.');
    // What the valve is for, a fixed fact; not its state, which the button does not show.
    expect(lines.detail).toMatch(/^PL1-P1-IV1: Isolates water .*\.$/);
    expect(lines.detail).not.toMatch(/[Cc]urrently/);
    expect(describePart(P.button('p2-start')!, running()).title).toBe(
      'START button — Requests P-201B to start.',
    );
  });

  it('gives a lamp its condition and whether it is lit now', () => {
    expect(describePart(P.lamp('p1-run')!, running()).title).toBe(
      'RUN lamp — Lights for P-201A running: lit now.',
    );
    expect(
      describePart(P.lamp(`${id('PL1-F1-BV1')}-open`)!, running()).title,
    ).toBe('OPEN lamp — Lights for PL1-F1-BV1 fully open: out now.');
  });

  it('reads a readout live, signed, in the mode shown, and follows a change while aimed at', () => {
    let mode = 'flow';
    const part = P.readout('f2-flow', () => mode)!;
    expect(describePart(part, running()).title).toBe(
      'F2 FLOW readout — currently reading 45.0 m³/h.',
    );
    expect(describePart(part, backwashing(running())).title).toBe(
      'F2 FLOW readout — currently reading -34.0 m³/h.',
    );
    // A mode the readout shows nothing in: no reading claimed.
    mode = 'temperature';
    expect(describePart(part, running()).title).toBe(
      'F2 FLOW readout — no reading.',
    );
  });

  it('reads a flowmeter as its display shows it, and says what its arrow indicates between the pipe’s two ends', () => {
    expect(inspectComponent({ tag: 'PL1-F2-FT1' }, running())).toEqual({
      key: 'PL1-F2-FT1',
      title:
        'PL1-F2-FT1 (Kessler-Moody Instruments flowmeter) - reading 45.0 m³/h',
      detail:
        'The direction arrow indicates water is flowing from the lounge pool sand filter 2 to the filter outlet header.',
    });
    expect(
      inspectComponent({ tag: 'PL1-F2-FT1' }, backwashing(running())),
    ).toMatchObject({
      title:
        'PL1-F2-FT1 (Kessler-Moody Instruments flowmeter) - reading 34.0 m³/h',
      detail:
        'The direction arrow indicates water is flowing from the filter outlet header to the lounge pool sand filter 2.',
    });
    let w = running();
    for (const n of ['P-201A', 'P-201B'] as const)
      w = applyAction(w, {
        type: 'motor/starter',
        tag: n,
        action: { act: 'stop' },
      });
    w = stepWorld(w, 5);
    expect(inspectComponent({ tag: 'PL1-F2-FT1' }, w)).toMatchObject({
      title:
        'PL1-F2-FT1 (Kessler-Moody Instruments flowmeter) - reading 0.0 m³/h',
      detail:
        'No flow shown; installed between the lounge pool sand filter 2 and the filter outlet header.',
    });
  });

  it('gives only the arrow’s way where the model has no route (the Olympic’s meters)', () => {
    const lines = inspectComponent({ tag: 'PL2-F1-FT1' }, running());
    expect(lines?.title).toMatch(
      /^PL2-F1-FT1 \(Kessler-Moody Instruments flowmeter\) - reading [\d.]+ m³\/h$/,
    );
    // No route in a model: the arrow's way, as the display shows it.
    expect(lines?.detail).toBe('The direction arrow points forward (->).');
  });

  it('words a setting by where it stands, and RESET as a request, the trip unsaid', () => {
    const w = running();
    expect(
      describePart(
        {
          kind: 'setting',
          label: 'HAND · OFF · AUTO selector',
          of: 'P-201A’s starter',
          current: (x) => x.motors.starters['P-201A'].mode.toUpperCase(),
        },
        w,
      ).title,
    ).toBe('HAND · OFF · AUTO selector — Sets P-201A’s starter: now AUTO.');
    expect(
      describePart(
        {
          kind: 'command',
          label: 'RESET',
          action: {
            type: 'motor/starter',
            tag: 'P-201A',
            action: { act: 'reset' },
          },
        },
        w,
      ),
    ).toEqual({
      title: 'RESET button — Requests P-201A’s trip be reset.',
      detail: 'P-201A: Lounge pool duty circulation pump.',
    });
  });
});

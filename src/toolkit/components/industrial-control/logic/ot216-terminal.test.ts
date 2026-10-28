import { describe, expect, it } from 'vite-plus/test';
import {
  OT216,
  heldRepeats,
  newOt216,
  ot216Screen,
  pressOt216,
  tickOt216,
} from './ot216-terminal';
import type {
  FeedTank,
  Ot216,
  TerminalCommand,
  TerminalFeed,
  TerminalKey,
  TerminalLink,
} from './ot216-terminal';

const tank = (
  name: string,
  capacity: number,
  more: Partial<FeedTank> = {},
): FeedTank => ({
  name,
  litres: capacity / 2,
  capacity,
  lowL: capacity * 0.2,
  highL: capacity * 0.9,
  state: 'OK',
  lastFilled: null,
  outletOpen: false,
  limits: {
    low: { min: capacity * 0.1, max: capacity * 0.8 },
    high: { min: capacity * 0.3, max: capacity * 0.95 },
  },
  step: capacity <= 60 ? 1 : capacity <= 300 ? 5 : 10,
  ...more,
});

const feed = (more: Partial<TerminalFeed> = {}): TerminalFeed => ({
  line: 'HYPO',
  store: 3400,
  storeLow: false,
  pump: 'STOP',
  tanks: [
    tank('PL1 LOUNGE', 300),
    tank('PL2 OLYMPIC', 1000),
    tank('PL3 JACUZZI', 60),
    tank('PL4 FOOTBATH', 30),
  ],
  filling: null,
  next: null,
  alarms: [],
  ...more,
});

const OK: TerminalLink = { powered: true, comms: true };

/** Keys pressed in turn; the commands sent. */
function press(
  keys: TerminalKey[],
  {
    from = newOt216(),
    f = feed(),
    access = true,
    link = OK,
  }: {
    from?: Ot216;
    f?: TerminalFeed;
    access?: boolean;
    link?: TerminalLink;
  } = {},
) {
  let t = from;
  const sent: TerminalCommand[] = [];
  for (const key of keys) {
    const r = pressOt216(t, key, f, access, link);
    t = r.terminal;
    if (r.command) sent.push(r.command);
  }
  return {
    t,
    sent,
    screen: (time = 0) => ot216Screen(t, f, access, link, time),
  };
}

describe('the OT-216 terminal', () => {
  it('shows sixteen characters on each line, its mode in the last three', () => {
    const { screen } = press([]);
    const s = screen();
    expect(s.lines.every((l) => l.length === OT216.width)).toBe(true);
    expect(s.lines[0]).toBe('HYPO LINE    MON');
    expect(s.lines[1]).toBe('STORE 3400L   OK');
  });

  it('MON at home shows the tank being filled, and follows the fill as it starts and ends', () => {
    const t = newOt216();
    const filling = feed({
      filling: 1,
      tanks: feed().tanks.map((k, i) =>
        i === 1 ? { ...k, litres: 142, state: 'FILL' } : k,
      ),
    });
    expect(ot216Screen(t, filling, true, OK, 0).lines).toEqual([
      'PL2 OLYMPIC  MON',
      'FILL 142L/1000L ',
    ]);
    expect(ot216Screen(t, feed(), true, OK, 0).lines[0]).toBe(
      'HYPO LINE    MON',
    );
  });

  it('MON at home names the next tank calling and waiting', () => {
    expect(press([], { f: feed({ next: 2 }) }).screen().lines[1]).toBe(
      'NEXT PL3    CALL',
    );
  });

  it('◀ ▶ step through every item, wrapping both ways', () => {
    const right = press(['RIGHT']);
    expect(right.screen().lines).toEqual([
      'STORE HYPO   MON',
      '3400L  PUMP STOP',
    ]);
    const all = press(['RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT']);
    expect(all.screen().lines).toEqual([
      'PL4 FOOTBATH MON',
      '15L/30L       OK',
    ]);
    expect(
      press(['RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT']).t.item,
    ).toBe(0);
    expect(press(['LEFT']).t.item).toBe(5);
  });

  it('ENTER on a tank in MON shows its detail, ▲ ▼ scrolling round, ESC back', () => {
    const { t, screen } = press(['RIGHT', 'RIGHT', 'ENTER']);
    expect(t.inside).toBe(true);
    expect(screen().lines[1]).toBe('>LOW LEVEL   60L');
    const down = press(['DOWN'], { from: t });
    expect(down.screen().lines[1]).toBe('>HIGH LEVEL 270L');
    expect(press(['DOWN', 'DOWN'], { from: t }).screen().lines[1]).toBe(
      '>FILLED       --',
    );
    expect(press(['UP'], { from: t }).screen().lines[1]).toBe(
      '>OUTLET     SHUT',
    );
    // ◀ ▶ do nothing inside an item.
    expect(press(['RIGHT'], { from: t }).t.item).toBe(2);
    expect(press(['ESC'], { from: t }).t.inside).toBe(false);
  });

  it('ENTER on the summary or the store in MON goes nowhere; ESC at the top does nothing', () => {
    expect(press(['ENTER']).t.inside).toBe(false);
    expect(press(['RIGHT', 'ENTER']).t.inside).toBe(false);
    const top = press(['ESC']);
    expect(top.t.mode).toBe('MON');
    expect(top.t.inside).toBe(false);
  });

  it('flashes ALARM and breaks into the bottom line with each alarm in turn; ENTER acknowledges', () => {
    const f = feed({
      alarms: [
        { code: 'hh1', text: 'PL2 HI-HI' },
        { code: 'trip', text: 'LINE TRIPPED' },
      ],
    });
    const t = newOt216();
    expect(ot216Screen(t, f, true, OK, 0).leds.alarm).toBe(true);
    expect(ot216Screen(t, f, true, OK, 0.6).leds.alarm).toBe(false);
    expect(ot216Screen(t, f, true, OK, 1.6).lines[1]).toBe('ALM PL2 HI-HI   ');
    expect(ot216Screen(t, f, true, OK, 3.1).lines[1]).toBe('ALM LINE TRIPPED');
    const acked = press(['ENTER'], { f }).t;
    expect(acked.acked).toEqual(['hh1', 'trip']);
    // Steady while the cause lasts, and the bottom line its own again.
    expect(ot216Screen(acked, f, true, OK, 0.6).leds.alarm).toBe(true);
    expect(ot216Screen(acked, f, true, OK, 1.6).lines[1]).toBe(
      'STORE 3400L   OK',
    );
    // Cleared, the acknowledgement goes, so it flashes if it comes back.
    expect(tickOt216(acked, 0.1, feed(), OK).acked).toEqual([]);
  });

  it('F1, F2 and F3 go straight to their modes, abandoning an edit', () => {
    const editing = press(['F2', 'RIGHT', 'RIGHT', 'ENTER', 'ENTER', 'UP']).t;
    expect(editing.edit).toBe(65);
    for (const [key, mode] of [
      ['F1', 'MON'],
      ['F2', 'SET'],
      ['F3', 'CMD'],
    ] as const) {
      const r = press([key], { from: editing });
      expect(r.t.mode).toBe(mode);
      expect(r.t.edit).toBeNull();
      expect(r.t.inside).toBe(false);
      expect(r.sent).toEqual([]);
    }
  });

  it('SET and CMD need the access key at ON; MON works without it', () => {
    expect(press(['F2'], { access: false }).screen().lines[1]).toBe(
      'ACCESS LOCKED   ',
    );
    expect(press(['F3'], { access: false }).screen().lines[1]).toBe(
      'ACCESS LOCKED   ',
    );
    const locked = press(
      ['F2', 'RIGHT', 'RIGHT', 'ENTER', 'ENTER', 'UP', 'ENTER'],
      { access: false },
    );
    expect(locked.sent).toEqual([]);
    expect(locked.t.inside).toBe(false);
    expect(press(['RIGHT', 'RIGHT', 'ENTER'], { access: false }).t.inside).toBe(
      true,
    );
  });

  it('SET: the summary and the store have no settings', () => {
    expect(press(['F2']).screen().lines[1]).toBe('NO SETTINGS     ');
    expect(press(['F2', 'RIGHT']).screen().lines[1]).toBe('NO SETTINGS     ');
    expect(press(['F2', 'ENTER']).t.inside).toBe(false);
  });

  it('SET: a tank opened, its high level edited in litres and stored', () => {
    const r = press(['F2', 'LEFT', 'ENTER', 'DOWN', 'ENTER']);
    expect(r.screen(0).lines).toEqual(['PL4 FOOTBATH SET', ' HIGH LEVEL  27L']);
    expect(r.screen(0).cursor).toEqual({ row: 1, col: 14 });
    expect(r.screen(0.6).cursor).toBeNull();
    const stored = press(['DOWN', 'DOWN', 'ENTER'], { from: r.t });
    expect(stored.sent).toEqual([{ kind: 'set-high', tank: 3, litres: 25 }]);
    expect(stored.t.beeps).toBe(1);
    expect(stored.screen().lines[1]).toBe('STORED          ');
  });

  it('SET: ESC abandons an edit, then leaves the tank, then does nothing', () => {
    const editing = press([
      'F2',
      'RIGHT',
      'RIGHT',
      'ENTER',
      'ENTER',
      'UP',
      'UP',
    ]).t;
    const once = press(['ESC'], { from: editing });
    expect(once.t.edit).toBeNull();
    expect(once.t.inside).toBe(true);
    expect(once.sent).toEqual([]);
    const twice = press(['ESC', 'ESC'], { from: editing });
    expect(twice.t.inside).toBe(false);
    expect(press(['ESC', 'ESC', 'ESC'], { from: editing }).t.mode).toBe('SET');
  });

  it('SET: changes in the tank’s steps, and stops at its limits with LIMIT for a moment', () => {
    // PL1, 300 L: steps of 5; its low at least 30 L.
    const r = press([
      'F2',
      'RIGHT',
      'RIGHT',
      'ENTER',
      'ENTER',
      'DOWN',
      'DOWN',
      'DOWN',
      'DOWN',
      'DOWN',
      'DOWN',
      'DOWN',
    ]);
    expect(r.t.edit).toBe(30);
    expect(r.screen().lines[1]).toBe('LIMIT           ');
    const later = tickOt216(r.t, OT216.notice + 0.1, feed(), OK);
    expect(ot216Screen(later, feed(), true, OK, 0.6).lines[1]).toBe(
      ' LOW LEVEL   30L',
    );
    // PL2, 1,000 L: steps of 10, its high at most 950 L.
    const big = press([
      'F2',
      'RIGHT',
      'RIGHT',
      'RIGHT',
      'ENTER',
      'DOWN',
      'ENTER',
      'UP',
      'UP',
      'UP',
      'UP',
      'UP',
      'UP',
    ]);
    expect(big.t.edit).toBe(950);
    expect(big.t.notice).toBe('LIMIT');
  });

  it('CMD: the summary and the store take no commands', () => {
    expect(press(['F3']).screen().lines[1]).toBe('NO COMMANDS     ');
    expect(press(['F3', 'RIGHT', 'ENTER', 'ENTER']).sent).toEqual([]);
  });

  it('CMD: FILL NOW, STOP and RESUME each confirmed with ENTER', () => {
    const open = press(['F3', 'RIGHT', 'RIGHT', 'ENTER']);
    expect(open.screen().lines[1]).toBe('>FILL NOW       ');
    const ask = press(['ENTER'], { from: open.t });
    expect(ask.screen().lines[1]).toBe('CONFIRM? ENT/ESC');
    expect(press(['ENTER', 'ENTER'], { from: open.t }).sent).toEqual([
      { kind: 'fill-now', tank: 0 },
    ]);
    expect(press(['DOWN', 'ENTER', 'ENTER'], { from: open.t }).sent).toEqual([
      { kind: 'stop', tank: 0 },
    ]);
    expect(press(['UP', 'ENTER', 'ENTER'], { from: open.t }).sent).toEqual([
      { kind: 'resume', tank: 0 },
    ]);
  });

  it('CMD: ESC at the confirmation does nothing, and other keys wait', () => {
    const open = press(['F3', 'LEFT', 'ENTER', 'DOWN', 'ENTER']).t;
    for (const key of ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const)
      expect(press([key], { from: open }).t.confirm).toBe(true);
    const no = press(['ESC'], { from: open });
    expect(no.sent).toEqual([]);
    expect(no.t.confirm).toBe(false);
    expect(no.screen().lines[1]).toBe('>STOP           ');
  });

  it('CMD: outside a tank it shows the tank’s state', () => {
    const f = feed({
      tanks: feed().tanks.map((k, i) =>
        i === 2 ? { ...k, state: 'INHIB' } : k,
      ),
    });
    expect(press(['F3', 'LEFT', 'LEFT'], { f }).screen().lines).toEqual([
      'PL3 JACUZZI  CMD',
      'STATE      INHIB',
    ]);
  });

  it('after a minute without a key: the edit abandoned, MON at home, the backlight dimmed', () => {
    const editing = press(['F2', 'RIGHT', 'RIGHT', 'ENTER', 'ENTER']).t;
    const later = tickOt216(editing, OT216.timeout, feed(), OK);
    expect(later.mode).toBe('MON');
    expect(later.home).toBe(true);
    expect(later.edit).toBeNull();
    expect(ot216Screen(later, feed(), true, OK, 0).backlight).toBeLessThan(1);
    const woken = press(['RIGHT'], { from: later }).t;
    expect(ot216Screen(woken, feed(), true, OK, 0).backlight).toBe(1);
  });

  it('powers up through its self test, the RUN LED flashing, then goes home', () => {
    const off = tickOt216(newOt216(), 0.1, feed(), {
      powered: false,
      comms: false,
    });
    expect(
      ot216Screen(off, feed(), true, { powered: false, comms: false }, 0),
    ).toMatchObject({
      backlight: 0,
      leds: { run: false, call: false, alarm: false },
    });
    const on = tickOt216(off, 0.1, feed(), OK);
    const s = ot216Screen(on, feed(), true, OK, 0);
    expect(s.lines).toEqual(['CHLORELLA OT-216', 'V2.04 SELF TEST ']);
    expect(ot216Screen(on, feed(), true, OK, 0.6).leds.run).toBe(false);
    expect(press(['F2'], { from: on }).t.mode).toBe('MON');
    const ready = tickOt216(on, OT216.selfTest, feed(), OK);
    expect(ot216Screen(ready, feed(), true, OK, 0.6).lines[0]).toBe(
      'HYPO LINE    MON',
    );
    expect(ot216Screen(ready, feed(), true, OK, 0.6).leds.run).toBe(true);
  });

  it('with its link broken shows NO COMMS, RUN out, keys dead', () => {
    const link = { powered: true, comms: false };
    const r = press(['F2', 'RIGHT'], { link });
    expect(r.t.mode).toBe('MON');
    expect(r.screen().lines[1]).toBe('NO COMMS        ');
    expect(r.screen().leds.run).toBe(false);
  });

  it('lights CALL while any tank calls or fills', () => {
    expect(press([]).screen().leds.call).toBe(false);
    const f = feed({
      tanks: feed().tanks.map((k, i) =>
        i === 3 ? { ...k, state: 'CALL' } : k,
      ),
    });
    expect(press([], { f }).screen().leds.call).toBe(true);
  });

  it('a held cursor key repeats after half a second, faster after two', () => {
    expect(heldRepeats(0, 0.4)).toBe(0);
    expect(heldRepeats(0, 0.5)).toBe(1);
    expect(heldRepeats(0, 1.5)).toBe(6);
    expect(heldRepeats(2, 3)).toBe(20);
  });
});

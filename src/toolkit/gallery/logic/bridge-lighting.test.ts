import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../../../game/world';
import type { World } from '../../../game/world';
import {
  LIGHT_SWITCH,
  bridgeEmergencyLit,
  bridgeMainLit,
  GLOW_SPILL,
  bridgeSwitchLive,
  underConsoleGlow,
  lightSwitchPlace,
} from './bridge-lighting';
import {
  ENTRY,
  STOREY,
  bridgeArrival,
  bridgeDoor,
  PLATFORM,
  insidePolygon,
  rearStationPlaces,
  roomPolygon,
  stationPlaces,
} from './control-room-prototype';

const gang = (w: World, g: 'main' | 'emergency', on: boolean) =>
  applyAction(w, {
    type: 'lighting/board',
    action: { act: 'switch', room: 'bridge', gang: g, on },
  });
const mainsOff = (w: World) =>
  applyAction(w, { type: 'plant/source', utility: 'power', on: false });

describe('the bridge’s light switch (the owner, 2026-10-27)', () => {
  it('starts with MAIN LIGHTS on and EMERGENCY LIGHTS off, the lights on', () => {
    const w = newWorld();
    expect(w.lighting.switches.bridge).toEqual({
      main: true,
      emergency: false,
    });
    expect(bridgeMainLit(w)).toBe(true);
    expect(bridgeEmergencyLit(w)).toBe(false);
  });

  it('puts the main lights out with MAIN LIGHTS, and with the way’s supply', () => {
    expect(bridgeMainLit(gang(newWorld(), 'main', false))).toBe(false);
    expect(bridgeMainLit(mainsOff(newWorld()))).toBe(false);
    const wayOff = applyAction(newWorld(), {
      type: 'lighting/zone',
      zone: 'control_room',
      on: false,
    });
    expect(bridgeMainLit(wayOff)).toBe(false);
  });

  it('lights the glow under the consoles with EMERGENCY LIGHTS, from the way or the battery', () => {
    const on = gang(newWorld(), 'emergency', true);
    expect(bridgeEmergencyLit(on)).toBe(true);
    // Both off: dark but for the displays.
    const both = gang(gang(newWorld(), 'main', false), 'emergency', false);
    expect(bridgeMainLit(both)).toBe(false);
    expect(bridgeEmergencyLit(both)).toBe(false);
    // The battery flat and the mains gone: nothing to light them.
    const flat = mainsOff(on);
    expect(
      bridgeEmergencyLit({
        ...flat,
        centralBattery: { ...flat.centralBattery, charge: 0 },
      }),
    ).toBe(false);
  });

  it('lights them anyway when the way’s supply fails, on the battery', () => {
    const w = mainsOff(newWorld());
    expect(w.lighting.switches.bridge.emergency).toBe(false);
    expect(bridgeEmergencyLit(w)).toBe(true);
  });

  it('lights its locator LEDs while the way or the battery can supply them', () => {
    expect(bridgeSwitchLive(newWorld())).toBe(true);
    // The mains gone: on the battery.
    const off = mainsOff(newWorld());
    expect(bridgeSwitchLive(off)).toBe(true);
    // And the battery flat: dark.
    expect(
      bridgeSwitchLive({
        ...off,
        centralBattery: { ...off.centralBattery, charge: 0 },
      }),
    ).toBe(false);
  });

  it('hangs the switch inside the doors, to the right as one comes in, 1.2 m up', () => {
    const p = lightSwitchPlace();
    const d = bridgeDoor();
    const a = bridgeArrival();
    // Coming in, facing into the room: the switch on the right hand.
    const view = { x: d.into.x, z: d.into.z };
    const right = { x: -view.z, z: view.x };
    expect((p.x - a.x) * right.x + (p.z - a.z) * right.z).toBeGreaterThan(0);
    expect(p.y - STOREY).toBeCloseTo(LIGHT_SWITCH.height);
    // Clear of the opening, on the wall.
    expect(Math.abs(p.along - ENTRY.at)).toBeGreaterThan(d.width / 2 + 0.1);
    expect(Math.abs(p.along - ENTRY.at)).toBeLessThan(d.width / 2 + 0.6);
  });

  it('lights only a glow under the consoles, spilling onto the floor of the room', () => {
    const glows = underConsoleGlow();
    // The desk's five segments' long edges, six stations all round, four
    // rear stations but for their wall sides.
    expect(glows).toHaveLength(5 * 2 + 6 * 4 + 4 * 3);
    for (const g of glows) {
      expect(Math.hypot(g.out.x, g.out.z), g.name).toBeCloseTo(1);
      // Along its edge, the way out square to it.
      const along = { x: g.b.x - g.a.x, z: g.b.z - g.a.z };
      expect(along.x * g.out.x + along.z * g.out.z, g.name).toBeCloseTo(0);
      // Its spill on the floor in the room.
      for (const p of [g.a, g.b]) {
        const x = p.x + g.out.x * GLOW_SPILL;
        const z = p.z + g.out.z * GLOW_SPILL;
        expect(insidePolygon(roomPolygon(), x, z), g.name).toBe(true);
      }
      expect([STOREY, STOREY + PLATFORM.height], g.name).toContain(g.y);
    }
  });

  it('spills each glow away from its console, never under it', () => {
    for (const st of stationPlaces()) {
      const mine = underConsoleGlow().filter((g) => g.name === st.system);
      expect(mine).toHaveLength(4);
      for (const g of mine) {
        const m = { x: (g.a.x + g.b.x) / 2, z: (g.a.z + g.b.z) / 2 };
        expect(
          (m.x - st.x) * g.out.x + (m.z - st.z) * g.out.z,
          g.name,
        ).toBeGreaterThan(0);
      }
    }
    for (const r of rearStationPlaces()) {
      const mine = underConsoleGlow().filter((g) => g.name === r.role);
      // None toward the wall.
      for (const g of mine)
        expect(g.out.x * r.n.x + g.out.z * r.n.z, g.name).toBeGreaterThan(-0.5);
    }
  });
});

import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../../../game/world';
import type { World } from '../../../game/world';
import {
  LIGHT_SWITCH,
  bridgeEmergencyLit,
  bridgeMainLit,
  emergencyPlan,
  lightSwitchPlace,
} from './bridge-lighting';
import {
  ENTRY,
  STOREY,
  bridgeArrival,
  bridgeDoor,
  inReadyRoomReserve,
  insidePolygon,
  roomPolygon,
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

  it('lights the emergency fittings with EMERGENCY LIGHTS, from the way or the battery', () => {
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

  it('places the emergency fittings in the room, none on the ready room’s reserve', () => {
    const { luminaires, strips } = emergencyPlan();
    expect(luminaires.length).toBeGreaterThanOrEqual(3);
    expect(strips.length).toBeGreaterThan(6);
    for (const l of luminaires) {
      expect(insidePolygon(roomPolygon(), l.x, l.z), l.name).toBe(true);
      expect(inReadyRoomReserve(l.x, l.z), l.name).toBe(false);
    }
    for (const s of strips)
      for (const p of [s.a, s.b]) {
        expect(insidePolygon(roomPolygon(), p.x, p.z), s.name).toBe(true);
        expect(p.y, s.name).toBeGreaterThanOrEqual(STOREY);
      }
  });
});

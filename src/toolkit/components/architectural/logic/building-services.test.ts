import { describe, expect, it } from 'vite-plus/test';
import {
  DOOR_RELEASE_SECONDS,
  FAN_RUN_ON_SECONDS,
  INVESTIGATION_SECONDS,
  SEVERE_TRIP_SECONDS,
  VACANCY_SECONDS,
  createBuildingServices,
} from './building-services';

const run = (
  b: ReturnType<typeof createBuildingServices>,
  seconds: number,
  random = () => 0,
) => {
  for (let t = 0; t < seconds; t += 0.1) b.tick(0.1, random);
};
/** The investigation finds a fire (0) or a false alarm (0.9). */
const finds = { fire: () => 0, falseAlarm: () => 0.9 };

describe('dev8 building services', () => {
  it('switch the room lights from either end (two-way)', () => {
    const b = createBuildingServices();
    expect(b.lighting.roomLight.value).toBe(1);
    b.lighting.switchFar.set(true);
    expect(b.lighting.roomLight.value).toBe(0);
    b.lighting.switchDoor.set(false);
    expect(b.lighting.roomLight.value).toBe(1);
    b.lighting.dimmer.set(4);
    expect(b.lighting.roomLight.value).toBeCloseTo(0.4);
  });

  it('turn the lights off when nobody moves, and back on with movement', () => {
    const b = createBuildingServices();
    run(b, VACANCY_SECONDS + 1);
    expect(b.lighting.roomLight.value).toBe(0);
    b.lighting.motion();
    expect(b.lighting.roomLight.value).toBe(1);
  });

  it('light the emergency lights when the lighting circuit fails or is tested', () => {
    const b = createBuildingServices();
    expect(b.lighting.emergencyLit.value).toBe(false);
    // The test key interrupts the emergency fittings' supply alone.
    b.lighting.emergencyTest.set(true);
    expect(b.lighting.emergencyLit.value).toBe(true);
    expect(b.lighting.roomLight.value).toBe(1);
    expect(b.lighting.exitSign.value).toBeGreaterThan(0);
    b.lighting.emergencyTest.set(false);
    expect(b.lighting.emergencyLit.value).toBe(false);
    // A fault trips the lighting breaker: the room goes dark.
    b.power.tripLighting();
    expect(b.power.lightingBreaker.value).toBe(false);
    expect(b.lighting.roomLight.value).toBe(0);
    expect(b.lighting.lightingVolts.value).toBe(0);
    expect(b.lighting.emergencyLit.value).toBe(true);
  });

  it('pass a brownout to the luminaires and the emergency lights, without tripping', () => {
    const b = createBuildingServices();
    b.power.supplyCondition.set(1);
    let lowest = 1;
    for (let i = 0; i < 6000; i++) {
      b.tick(0.01);
      lowest = Math.min(lowest, b.lighting.lightingVolts.value);
      expect(b.lighting.emergencyVolts.value).toBe(
        b.lighting.lightingVolts.value,
      );
    }
    expect(lowest).toBeLessThan(0.7);
    expect(b.power.lightingBreaker.value).toBe(true);
    b.power.supplyCondition.set(0);
    run(b, 1);
    expect(b.lighting.lightingVolts.value).toBeCloseTo(1, 1);
  });

  it('switch a large space by zone, two-way from a bank at each exit', () => {
    const b = createBuildingServices();
    const lit = () => b.lighting.zoneLight.map((z) => z.value);
    expect(lit()).toEqual([1, 1, 1]);
    b.lighting.zoneSwitches[1].a.set(false);
    expect(lit()).toEqual([1, 0, 1]);
    // From the other bank, it comes back on.
    b.lighting.zoneSwitches[1].b.set(true);
    expect(lit()).toEqual([1, 1, 1]);
  });

  it('wire each zone as a circuit of its own, with its own emergency lights', () => {
    const b = createBuildingServices();
    b.power.tripZone(2);
    expect(b.lighting.zoneLight.map((z) => z.value)).toEqual([1, 0, 1]);
    expect(b.lighting.zoneVolts[1].value).toBe(0);
    expect(b.lighting.zoneEmergencyVolts[1].value).toBe(0);
    expect(b.lighting.zoneEmergencyVolts[0].value).toBeGreaterThan(0.9);
    b.power.zoneBreakers[1].set(true);
    // The test key cuts every zone's emergency fittings, and no lights.
    b.lighting.emergencyTest.set(true);
    expect(b.lighting.zoneEmergencyVolts.map((v) => v.value)).toEqual([
      0, 0, 0,
    ]);
    expect(b.lighting.zoneLight.map((z) => z.value)).toEqual([1, 1, 1]);
    // A lighting fault trips them all.
    b.lighting.emergencyTest.set(false);
    b.power.tripLighting();
    expect(b.lighting.zoneLight.map((z) => z.value)).toEqual([0, 0, 0]);
  });

  it('turn a zone off when its detector has seen nobody for its time-out', () => {
    const b = createBuildingServices();
    b.lighting.detectorTimeout.set(30);
    run(b, 20);
    b.lighting.seen(1);
    run(b, 15);
    expect(b.lighting.zoneLight.map((z) => z.value)).toEqual([1, 0, 0]);
    b.lighting.seen(3);
    expect(b.lighting.zoneLight[2].value).toBe(1);
  });

  it('take its supply from a machine on the same supply when fed', () => {
    const b = createBuildingServices();
    b.power.supplyFeed.set(0.72);
    run(b, 0.2);
    expect(b.lighting.zoneVolts[0].value).toBeCloseTo(0.72);
    b.power.supplyFeed.set(null);
    run(b, 0.2);
    expect(b.lighting.zoneVolts[0].value).toBeCloseTo(1, 1);
  });

  it('trip the lighting breaker in a severe disturbance', () => {
    const b = createBuildingServices();
    b.power.supplyCondition.set(2);
    run(b, SEVERE_TRIP_SECONDS - 1);
    expect(b.power.lightingBreaker.value).toBe(true);
    run(b, 2);
    expect(b.power.lightingBreaker.value).toBe(false);
    expect(b.lighting.emergencyLit.value).toBe(true);
  });

  it('detect the lit bin a few seconds later, and investigate it', () => {
    const b = createBuildingServices();
    expect(b.fire.startFire()).toBe(true);
    // It smoulders first: a little smoke, no flames.
    run(b, 3);
    expect(b.fire.flames.value).toBe(0);
    expect(b.fire.smokeShown.value).toBeGreaterThan(0);
    expect(b.fire.stage.value).toBe('normal');
    // Then the flames catch and grow, and their smoke sets off the detector.
    run(b, 9);
    expect(b.fire.flames.value).toBeGreaterThan(0.04);
    expect(b.fire.detector.value).toBe(true);
    expect(b.fire.stage.value).toBe('alert');
    expect(b.fire.voice.value).toBe('alert');
    expect(b.fire.doorsHeld.value).toBe(false);
    expect(b.access.locked.value).toBe(true);
    expect(b.fire.panelLamps.value.countdown).toBeGreaterThan(80);
  });

  it('call a false alarm while the bin burns, then evacuate on the second activation', () => {
    const b = createBuildingServices();
    b.fire.startFire();
    run(b, 12, finds.falseAlarm);
    expect(b.fire.stage.value).toBe('alert');
    run(b, INVESTIGATION_SECONDS, finds.falseAlarm);
    expect(b.fire.announcement.value.kind).toBe('false-alarm');
    expect(b.fire.stage.value).toBe('all-clear');
    // The bin is still alight: its smoke is soon back, and this time
    // everyone leaves.
    run(b, 20, finds.falseAlarm);
    expect(b.fire.stage.value).toBe('evacuate');
  });

  it('evacuate, burst the nearest head and put the bin out', () => {
    const b = createBuildingServices();
    b.fire.startFire();
    run(b, 12 + INVESTIGATION_SECONDS, finds.fire);
    expect(b.fire.stage.value).toBe('evacuate');
    expect(b.fire.voice.value).toBe('evacuate');
    expect(b.access.locked.value).toBe(false);
    expect(b.fire.panelLamps.value.brigade).toBe(true);
    // The fire grows until the hot gas at the nearest head reaches 68 °C.
    run(b, 10, finds.fire);
    expect(b.fire.discharging.value).toBe(false);
    run(b, 10, finds.fire);
    expect(b.fire.discharging.value).toBe(true);
    expect(b.fire.heads.value[0].spraying).toBe(true);
    // The spray puts the bin out; the water runs until the valve is shut.
    run(b, 15, finds.fire);
    expect(b.fire.flames.value).toBe(0);
    expect(b.fire.discharging.value).toBe(true);
    // RESET needs the key and nothing still in alarm: not while water flows.
    b.fire.panelKey.set(true);
    expect(b.fire.reset()).toBe(false);
    b.fire.riserValve.set(false);
    expect(b.fire.discharging.value).toBe(false);
    run(b, 30, finds.fire);
    expect(b.fire.reset()).toBe(true);
    expect(b.fire.announcement.value.kind).toBe('all-clear');
    b.fire.resetSprinklers();
    expect(b.fire.heads.value.some((h) => h.burst)).toBe(false);
  });

  it('go straight to evacuation from a call point', () => {
    const b = createBuildingServices();
    b.fire.startFire();
    run(b, 12);
    expect(b.fire.stage.value).toBe('alert');
    b.fire.pressCallPoint();
    b.tick(0.1);
    expect(b.fire.stage.value).toBe('evacuate');
  });

  it('latch a call point until it is reset with its key', () => {
    const b = createBuildingServices();
    b.fire.pressCallPoint();
    b.tick(0.1);
    expect(b.fire.sounding.value).toBe(true);
    b.fire.panelKey.set(true);
    expect(b.fire.reset()).toBe(false);
    expect(b.fire.sounding.value).toBe(true);
    b.fire.resetCallPoint();
    expect(b.fire.reset()).toBe(true);
    expect(b.fire.stage.value).toBe('all-clear');
  });

  it('silence and evacuate only with the panel key turned', () => {
    const b = createBuildingServices();
    b.fire.pressCallPoint();
    b.tick(0.1);
    expect(b.fire.silence()).toBe(false);
    expect(b.fire.sounding.value).toBe(true);
    b.fire.panelKey.set(true);
    expect(b.fire.silence()).toBe(true);
    expect(b.fire.sounding.value).toBe(false);
    b.fire.resetCallPoint();
    b.fire.reset();
    expect(b.fire.evacuate()).toBe(true);
    expect(b.fire.sounding.value).toBe(true);
  });

  it('let the door open only once a card or the exit button releases it', () => {
    const b = createBuildingServices();
    expect(b.access.workDoor()).toBe(false);
    b.access.presentCard();
    expect(b.access.workDoor()).toBe(true);
    expect(b.access.doorOpen.value).toBe(true);
    run(b, DOOR_RELEASE_SECONDS + 1);
    expect(b.access.doorOpen.value).toBe(false);
    expect(b.access.locked.value).toBe(true);
    b.access.breakDoorRelease();
    expect(b.access.locked.value).toBe(false);
    b.access.resetDoorRelease();
    expect(b.access.locked.value).toBe(true);
  });

  it('warm a cold room with the radiator, and faster with the AC on heat', () => {
    const slow = createBuildingServices();
    slow.climate.thermostat.set(22);
    run(slow, 60);
    const fast = createBuildingServices();
    fast.climate.thermostat.set(22);
    fast.climate.acPower.set(true);
    fast.climate.acMode.set(1);
    fast.climate.acSetpoint.set(26);
    run(fast, 60);
    expect(slow.climate.temperature.value).toBeGreaterThan(18);
    expect(fast.climate.temperature.value).toBeGreaterThan(
      slow.climate.temperature.value,
    );
    expect(fast.climate.acRunning.value).toBe(true);
  });

  it('run the WC extractor with its light and for a while after', () => {
    const b = createBuildingServices();
    b.lighting.wcCord.set(true);
    b.tick(0.1);
    expect(b.fan.running.value).toBe(true);
    b.lighting.wcCord.set(false);
    run(b, FAN_RUN_ON_SECONDS / 2);
    expect(b.fan.running.value).toBe(true);
    run(b, FAN_RUN_ON_SECONDS);
    expect(b.fan.running.value).toBe(false);
  });

  it('sound the accessible toilet alarm until it is reset', () => {
    const b = createBuildingServices();
    b.welfare.pullWcAlarm();
    expect(b.welfare.wcAlarmOn.value).toBe(true);
    b.welfare.resetWcAlarm();
    expect(b.welfare.wcAlarmOn.value).toBe(false);
  });

  it('feed the sockets from their breaker', () => {
    const b = createBuildingServices();
    expect(b.sockets.socketsLive.value.right).toBe(true);
    b.power.socketsBreaker.set(false);
    expect(b.sockets.socketsLive.value.right).toBe(false);
    expect(b.sockets.spurLive.value).toBe(false);
  });

  it('has no control whose effect cannot be seen, and nothing hidden', () => {
    const analysis = createBuildingServices().g.analyse();
    expect(analysis.unseenControls).toEqual([]);
    expect(analysis.constantOutputs).toEqual([]);
    expect(analysis.unwrittenStates).toEqual([]);
  });
});

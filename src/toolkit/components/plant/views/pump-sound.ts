import { effect } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import type { LoopRecipe } from '../../core/audio/part-audio';
import { noiseSource } from '../../core/audio/part-loops';
import {
  CIRCULATION_PUMP,
  bladePassHz,
  humHz,
  pumpLevel,
  pumpSpeed,
  shaftHz,
} from '../logic/pump-sound';
import type { PumpSet } from '../logic/pump-sound';

/**
 * A centrifugal pump set's sound while it runs (`../logic/pump-sound.ts`
 * for its numbers), synthesised, to hold at the pump
 * (`partAudio.hold`): a restrained motor hum and impeller note under
 * textured bearing, fan and water noise. All turning layers run up and
 * coast down with shaft speed; the magnetic hum dies as power is lost.
 *
 * `load` (0 to 1), where given, is how hard it works against its system
 * (the owner, 2026-10-26: two pumps boosting against the pipework's
 * resistance): loaded, the motor slips a little more, so its turning
 * notes drop a touch, and its water and casing roar louder. It follows
 * the signal while it runs, once run up, without starting again.
 */
export function pumpSound(
  p: PumpSet = CIRCULATION_PUMP,
  load?: ReadonlySignal<number>,
): LoopRecipe {
  return (context, out) => {
    const start = context.currentTime;
    const master = context.createGain();
    master.gain.value = pumpLevel(p);
    master.connect(out);
    // A curve of the speed through a run-up or a coast-down, sampled.
    const curve = (
      seconds: number,
      running: boolean,
      map: (speed: number) => number,
    ) => {
      const n = 64;
      return Float32Array.from({ length: n }, (_, i) =>
        map(pumpSpeed(p, (i / (n - 1)) * seconds, running)),
      );
    };
    // The iron hum builds as the motor energises, rather than switching
    // in at full volume before the shaft has moved.
    const humGain = context.createGain();
    humGain.gain.setValueAtTime(0.0001, start);
    humGain.gain.exponentialRampToValueAtTime(0.45, start + p.runUp * 0.4);
    humGain.connect(master);
    const hum = (
      [
        [humHz(p), 0.2, 'sine'],
        [2 * humHz(p), 0.035, 'sine'],
      ] as const
    ).map(([hz, level, type]) => {
      const osc = context.createOscillator();
      osc.type = type;
      osc.frequency.value = hz;
      const g = context.createGain();
      g.gain.value = level;
      osc.connect(g).connect(humGain);
      osc.start(start);
      return osc;
    });
    // What turns: its pitch and loudness follow its speed.
    const turning: {
      osc: OscillatorNode;
      hz: number;
      gain: GainNode;
      level: number;
    }[] = (
      [
        [shaftHz(p), 0.12, 'sine'],
        [bladePassHz(p), 0.07, 'sine'],
      ] as const
    ).map(([hz, level, type]) => {
      const osc = context.createOscillator();
      osc.type = type;
      const gain = context.createGain();
      gain.gain.value = 0;
      osc.frequency.value = hz * 0.04;
      osc.connect(gain).connect(master);
      osc.start(start);
      return { osc, hz, gain, level };
    });
    // The fan's and the water's noise: band-passed, its band and its
    // loudness following its speed too.
    const noise = noiseSource(context);
    const fan = context.createBiquadFilter();
    fan.type = 'bandpass';
    fan.Q.value = 0.7;
    const fanGain = context.createGain();
    fanGain.gain.value = 0;
    const flow = context.createBiquadFilter();
    flow.type = 'lowpass';
    const flowGain = context.createGain();
    flowGain.gain.value = 0;
    noise.connect(fan).connect(fanGain).connect(master);
    noise.connect(flow).connect(flowGain).connect(master);
    noise.start(start);
    // A second, independent source gives the casing a rough mechanical
    // texture. It avoids the pure electronic note made by oscillators alone.
    const bearings = noiseSource(context);
    const casing = context.createBiquadFilter();
    casing.type = 'bandpass';
    casing.Q.value = 0.45;
    const casingGain = context.createGain();
    casingGain.gain.value = 0;
    bearings.connect(casing).connect(casingGain).connect(master);
    bearings.start(start);
    const filters = [
      { node: fan, hz: 1100, gain: fanGain, level: 0.37 },
      { node: flow, hz: 330, gain: flowGain, level: 0.48 },
      { node: casing, hz: 480, gain: casingGain, level: 0.27 },
    ];
    // Set `param` along `values` from `at`: a curve where the browser will
    // take one over what it is doing (a run-up cut short by a stop), else a
    // smooth approach to the curve's end, so a change never throws.
    const along = (
      param: AudioParam,
      values: Float32Array,
      at: number,
      seconds: number,
    ) => {
      try {
        if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(at);
        else param.cancelScheduledValues(at);
        param.setValueCurveAtTime(values, at + 0.005, seconds);
      } catch {
        param.cancelScheduledValues(at);
        param.setTargetAtTime(values[values.length - 1], at, seconds / 3);
      }
    };
    // Run it along a curve of its speed from `at`, up or down.
    const drive = (at: number, seconds: number, running: boolean) => {
      for (const t of turning) {
        along(
          t.osc.frequency,
          curve(seconds, running, (s) => t.hz * Math.max(0.04, s)),
          at,
          seconds,
        );
        along(
          t.gain.gain,
          curve(seconds, running, (s) => t.level * s * s),
          at,
          seconds,
        );
      }
      for (const f of filters) {
        along(
          f.node.frequency,
          curve(seconds, running, (s) => f.hz * Math.max(0.1, s)),
          at,
          seconds,
        );
        along(
          f.gain.gain,
          curve(seconds, running, (s) => f.level * s * s),
          at,
          seconds,
        );
      }
    };
    drive(start, p.runUp, true);
    // Its load, followed from the end of its run-up on.
    const loaded = load
      ? effect(() => {
          const l = Math.min(1, Math.max(0, load.value));
          const at = Math.max(context.currentTime, start + p.runUp + 0.05);
          for (const t of turning)
            t.osc.frequency.setTargetAtTime(t.hz * (1 - 0.035 * l), at, 0.5);
          for (const f of filters)
            f.gain.gain.setTargetAtTime(f.level * (1 + 0.45 * l), at, 0.5);
        })
      : () => {};
    const sources = [...hum, ...turning.map((t) => t.osc), noise, bearings];
    // Stopped: the hum cut, the rest coasting down, then let go.
    return [
      {
        release: p.coastDown,
        stop(end?: number) {
          loaded();
          const now = context.currentTime;
          if (humGain.gain.cancelAndHoldAtTime)
            humGain.gain.cancelAndHoldAtTime(now);
          else humGain.gain.cancelScheduledValues(now);
          humGain.gain.setTargetAtTime(0, now, 0.05);
          drive(now, p.coastDown, false);
          for (const s of sources) s.stop(end ?? now + p.coastDown);
        },
      },
    ];
  };
}

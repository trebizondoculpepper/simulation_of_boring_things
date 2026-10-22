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
 * (`partAudio.hold`): its motor's iron humming at 100 Hz and its
 * harmonics, as long as it is energised; its shaft's low rumble; its
 * impeller's blade-pass note; and the broadband noise of its cooling fan
 * and its water. Started, the turning layers rise in pitch and loudness
 * as it runs up; stopped, the hum cuts out at once and the rest coasts
 * down, falling, and it is let go when it has.
 */
export function pumpSound(p: PumpSet = CIRCULATION_PUMP): LoopRecipe {
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
    // The iron's hum: energised from the start, at full loudness.
    const humGain = context.createGain();
    humGain.gain.value = 1;
    humGain.connect(master);
    const hum = (
      [
        [humHz(p), 0.32, 'sine'],
        [2 * humHz(p), 0.12, 'triangle'],
        [3 * humHz(p), 0.05, 'sine'],
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
        [shaftHz(p), 0.3, 'sine'],
        [bladePassHz(p), 0.16, 'triangle'],
        [2 * bladePassHz(p), 0.04, 'sine'],
      ] as const
    ).map(([hz, level, type]) => {
      const osc = context.createOscillator();
      osc.type = type;
      const gain = context.createGain();
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
    const flow = context.createBiquadFilter();
    flow.type = 'lowpass';
    const flowGain = context.createGain();
    noise.connect(fan).connect(fanGain).connect(master);
    noise.connect(flow).connect(flowGain).connect(master);
    noise.start(start);
    const filters = [
      { node: fan, hz: 900, gain: fanGain, level: 0.22 },
      { node: flow, hz: 260, gain: flowGain, level: 0.35 },
    ];
    // Run it along a curve of its speed from `at`, up or down.
    const drive = (at: number, seconds: number, running: boolean) => {
      for (const t of turning) {
        t.osc.frequency.cancelScheduledValues(at);
        t.osc.frequency.setValueCurveAtTime(
          curve(seconds, running, (s) => t.hz * Math.max(0.04, s)),
          at,
          seconds,
        );
        t.gain.gain.cancelScheduledValues(at);
        t.gain.gain.setValueCurveAtTime(
          curve(seconds, running, (s) => t.level * s * s),
          at,
          seconds,
        );
      }
      for (const f of filters) {
        f.node.frequency.cancelScheduledValues(at);
        f.node.frequency.setValueCurveAtTime(
          curve(seconds, running, (s) => f.hz * Math.max(0.1, s)),
          at,
          seconds,
        );
        f.gain.gain.cancelScheduledValues(at);
        f.gain.gain.setValueCurveAtTime(
          curve(seconds, running, (s) => f.level * s * s),
          at,
          seconds,
        );
      }
    };
    drive(start, p.runUp, true);
    const sources = [...hum, ...turning.map((t) => t.osc), noise];
    // Stopped: the hum cut, the rest coasting down, then let go.
    return [
      {
        release: p.coastDown,
        stop(end?: number) {
          const now = context.currentTime;
          humGain.gain.cancelScheduledValues(now);
          humGain.gain.setTargetAtTime(0, now, 0.05);
          drive(now, p.coastDown, false);
          for (const s of sources) s.stop(end ?? now + p.coastDown);
        },
      },
    ];
  };
}

import { computed, signal } from '@preact/signals-core';
import {
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  Mesh,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { beginPart } from '../../core/parts/parts';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { musicPlaylist } from '../audio/music-playlist';
import type { MusicBinding } from './music-binding';

/** Compact sealed ABS speaker with a corrosion-resistant grille and pan/tilt bracket.
 * The 144 × 238 × 144 mm format follows the Biamp MASK4CT, under our own maker.
 */
function waterproofSpeaker(kit: PanelKit) {
  const group = new Group();
  group.name = 'Synclex waterproof music speaker';
  const t = tools(kit);
  const white = t.paint('#e0e2db', 0.6);
  const seal = t.paint('#3b4441', 0.9);
  t.box(group, white, 0.144, 0.238, 0.144);
  t.box(group, seal, 0.132, 0.224, 0.004, 0, 0, 0.074);
  const grille = t.paint('#c1c7c3', 0.8);
  for (let y = -0.098; y <= 0.098; y += 0.009)
    t.box(group, grille, 0.118, 0.002, 0.002, 0, y, 0.078);
  t.box(group, white, 0.07, 0.11, 0.025, 0, 0, -0.085);
  t.box(group, white, 0.04, 0.035, 0.06, 0, 0, -0.12);
  t.box(group, seal, 0.05, 0.065, 0.008, 0, -0.05, -0.076);
  t.label(group, 'SYNCLEX', 0, -0.112, 0.08, 0.005);
  return group;
}

export interface MusicSpeakerMount {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  wireFrom?: readonly [number, number, number];
  wallNormal?: readonly [number, number, number];
}

/** One stream drives both physical speakers, so their music stays in phase. */
export function createMusicSpeakerPair(
  kit: PanelKit,
  binding: MusicBinding,
  tracks: readonly { url: URL; title: string }[],
  mounts: readonly MusicSpeakerMount[],
  metre = 1,
  renderOnly = false,
) {
  const a = beginPart(kit, 'Jacuzzi waterproof speaker pair');
  const speakers = mounts.map((mount) => {
    const speaker = waterproofSpeaker(kit);
    speaker.position.set(mount.x, mount.y, mount.z);
    speaker.rotation.set(mount.pitch, mount.yaw, 0, 'YXZ');
    a.object.add(speaker);
    if (mount.wireFrom && mount.wallNormal) {
      const t = tools(kit);
      const rubber = t.paint('#1d2220', 0.95);
      const entry = new Vector3(...mount.wireFrom);
      const normal = new Vector3(...mount.wallNormal).normalize();
      const grommet = new Mesh(new TorusGeometry(0.006, 0.002, 6, 12), rubber);
      grommet.position.copy(entry);
      grommet.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);
      a.object.add(grommet);
      const hole = new Mesh(
        new CylinderGeometry(0.004, 0.004, 0.002, 10),
        rubber,
      );
      hole.position.copy(entry);
      hole.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), normal);
      a.object.add(hole);
      const terminal = new Vector3(0, -0.05, -0.08)
        .applyEuler(speaker.rotation)
        .add(speaker.position);
      const sag = entry
        .clone()
        .lerp(terminal, 0.5)
        .addScaledVector(normal, 0.025);
      sag.y = Math.min(entry.y, terminal.y) - 0.04;
      const cable = new Mesh(
        new TubeGeometry(
          new CatmullRomCurve3([entry, sag, terminal]),
          12,
          0.0015,
          6,
          false,
        ),
        rubber,
      );
      cable.name = 'Speaker feed wire and concrete grommet';
      a.object.add(cable);
    }
    return speaker;
  });
  const audible = signal(false);
  const on = computed(
    () => audible.value && binding.powered.value && binding.amplifier.value.on,
  );
  const volume = computed(() => binding.amplifier.value.volume);
  const programme = musicPlaylist(tracks, volume, () => {}, binding.source);
  if (!renderOnly)
    a.holdWhile(
      on,
      (context, out) => {
        const bus = context.createGain();
        bus.gain.value = 0.5;
        const outputs = speakers.map((speaker) => {
          const position = speaker
            .getWorldPosition(new Vector3())
            .divideScalar(metre);
          const direction = speaker.getWorldDirection(new Vector3());
          const panner = new PannerNode(context, {
            panningModel: 'equalpower',
            distanceModel: 'inverse',
            refDistance: 2.5,
            rolloffFactor: 0.6,
            positionX: position.x,
            positionY: position.y,
            positionZ: position.z,
            orientationX: direction.x,
            orientationY: direction.y,
            orientationZ: direction.z,
            coneInnerAngle: 100,
            coneOuterAngle: 200,
            coneOuterGain: 0.25,
          });
          bus.connect(panner).connect(out);
          return panner;
        });
        const sources = programme(context, bus);
        return [
          {
            stop(when) {
              for (const source of sources) source.stop(when);
              window.setTimeout(() => {
                bus.disconnect();
                for (const node of outputs) node.disconnect();
              }, 600);
            },
          },
        ];
      },
      null,
    );
  const part = a.part();
  return {
    ...part,
    setAudible(on: boolean) {
      audible.value = on;
      part.setAudible(on);
    },
  };
}

/** Single monitor for the isolated dev room; the live plant room has none. */
export function createMusicSpeaker(
  kit: PanelKit,
  binding: MusicBinding,
  tracks: readonly { url: URL; title: string }[],
) {
  const a = beginPart(kit, 'Music prototype monitor');
  a.object.add(waterproofSpeaker(kit));
  const audible = signal(false);
  const on = computed(
    () => audible.value && binding.powered.value && binding.amplifier.value.on,
  );
  const volume = computed(() => binding.amplifier.value.volume);
  a.holdWhile(
    on,
    musicPlaylist(tracks, volume, () => {}, binding.source),
  );
  const part = a.part();
  return {
    ...part,
    setAudible(on: boolean) {
      audible.value = on;
      part.setAudible(on);
    },
  };
}

/**
 * The jacuzzi's music as heard in its plant room, through the wall from
 * the hall: the same programme, following the same source, about 30 dB
 * down (the owner, 2026-10-24) and not placed, as it comes from the
 * whole wall. It has nothing to see.
 */
export function createMusicThroughWall(
  kit: PanelKit,
  binding: MusicBinding,
  tracks: readonly { url: URL; title: string }[],
  attenuationDb = 30,
) {
  const a = beginPart(kit, 'Music heard through the wall');
  const audible = signal(false);
  const on = computed(
    () => audible.value && binding.powered.value && binding.amplifier.value.on,
  );
  const volume = computed(() => binding.amplifier.value.volume);
  const programme = musicPlaylist(tracks, volume, () => {}, binding.source);
  a.holdWhile(
    on,
    (context, out) => {
      // As loud as the hall's speakers' bus, less the wall.
      const wall = context.createGain();
      wall.gain.value = 0.5 * 10 ** (-attenuationDb / 20);
      wall.connect(out);
      return programme(context, wall);
    },
    null,
  );
  const part = a.part();
  return {
    ...part,
    setAudible(on: boolean) {
      audible.value = on;
      part.setAudible(on);
    },
  };
}

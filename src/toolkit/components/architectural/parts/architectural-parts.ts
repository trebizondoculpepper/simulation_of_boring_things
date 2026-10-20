import { computed } from '@preact/signals-core';
import type { Part } from '../../core/parts/parts';
import { beginPart } from '../../core/parts/parts';
import { click } from '../../core/audio/part-audio';
import { WATER_SPRAY } from '../../core/audio/part-loops';
import { architecturalComponent } from '../logic/architectural-fittings';
import type { ArchitecturalKind } from '../logic/architectural-fittings';
import type {
  ArchitecturalServices,
  WarehouseFire,
} from '../logic/warehouse-services';
import { createArchitecturalServices } from '../logic/warehouse-services';
import { createSwitch } from '../../core/logic/world/components';
import { createArchitecturalFixture } from '../views/architectural-fixtures';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  callPoint,
  extinguisher,
  fireBell,
  firePanel,
  smokeDetector,
  sounderBeacon,
  sprinklerHead,
  valveSet,
} from '../../fire/parts/fire-parts';
import {
  distributionBoard,
  gridSwitchPlate,
  lightSwitch,
  luminaire,
  presenceDetector,
  twinSocket,
} from './building-parts';
import type { LuminaireLight } from './building-parts';
import {
  emergencyBulkhead,
  emergencyLight,
  exitSign,
} from '../../general-safety/parts/safety-parts';
import type { EmergencyBeam } from '../../general-safety/parts/safety-parts';

/** Light fittings made so far: each a little unlike the last. */
let luminaires = 0;

/** One factory for all installed and exhibited architectural fittings. */
export function architecturalPart(
  kit: PanelKit,
  kind: ArchitecturalKind,
  services: ArchitecturalServices = createArchitecturalServices(),
  options: {
    index?: number;
    legend?: string;
    testers?: boolean;
    fallDistance?: number;
    length?: number;
    /** The fire system to bind fire fittings to, if not their own. */
    fire?: WarehouseFire;
    /** A luminaire's light on the room, if it lights it. */
    light?: LuminaireLight;
    /**
     * The lighting zone (1 to 3) a luminaire, emergency light, bulkhead or
     * presence detector is on; without one, the room's single lighting
     * circuit (and a detector watches zone 1).
     */
    zone?: 1 | 2 | 3;
    /** An emergency fitting's or exit sign's light on the room. */
    beam?: EmergencyBeam;
  } = {},
) {
  const m = services.model,
    f = options.fire?.system ?? m.fire;
  let part: Part;
  const i = options.index ?? 0;
  const zone = options.zone;
  switch (kind) {
    case 'distribution':
      part = distributionBoard(kit, {
        main: m.power.main,
        circuits: [
          ['LIGHTS', m.power.lightingBreaker],
          ...m.power.zoneBreakers.map((bound, n): [string, typeof bound] => [
            `ZONE ${n + 1}`,
            bound,
          ]),
          ['SOCKETS', m.power.socketsBreaker],
          ['HEAT / VENT', m.power.hvacBreaker],
        ],
      });
      break;
    case 'socket': {
      const id = services.id();
      const left = m.g.input(`${id}.left`, true),
        right = m.g.input(`${id}.right`, true);
      part = twinSocket(kit, {
        left,
        right,
        metalclad: true,
        testers: options.testers ?? false,
        live: computed(() => ({
          left:
            m.power.main.value && m.power.socketsBreaker.value && left.value,
          right:
            m.power.main.value && m.power.socketsBreaker.value && right.value,
        })),
      });
      break;
    }
    case 'gridswitch':
      // A bank by each exit: the first (index 0) carries the emergency
      // lighting test key, the second the other end of each two-way pair.
      part = gridSwitchPlate(kit, {
        name: 'lighting zone switch bank',
        title: 'LIGHTING',
        modules: [
          ...m.lighting.zoneSwitches.map((pair, n) => ({
            legend: `ZONE ${n + 1}`,
            bound: i === 1 ? pair.b : pair.a,
          })),
          ...(i === 1
            ? []
            : [
                {
                  legend: 'EM TEST',
                  bound: m.lighting.emergencyTest,
                  key: true,
                },
              ]),
        ],
      });
      break;
    case 'presence':
      part = presenceDetector(kit, {
        unseen: m.lighting.zoneUnseen[(options.zone ?? 1) - 1],
      });
      break;
    case 'bulkhead':
      part = emergencyBulkhead(kit, {
        volts: zone
          ? m.lighting.zoneEmergencyVolts[zone - 1]
          : m.lighting.emergencyVolts,
        seed: luminaires++,
        beam: options.beam,
      });
      break;
    case 'switch':
      part = lightSwitch(kit, {
        gangs: [i === 1 ? m.lighting.switchFar : m.lighting.switchDoor],
      });
      break;
    case 'emergency':
      part = emergencyLight(kit, {
        volts: zone
          ? m.lighting.zoneEmergencyVolts[zone - 1]
          : m.lighting.emergencyVolts,
        seed: luminaires++,
        beam: options.beam,
      });
      break;
    case 'exit':
      part = exitSign(kit, { level: m.lighting.exitSign });
      break;
    case 'luminaire':
      part = luminaire(kit, {
        level: zone ? m.lighting.zoneLight[zone - 1] : m.lighting.roomLight,
        volts: zone ? m.lighting.zoneVolts[zone - 1] : m.lighting.lightingVolts,
        seed: luminaires++,
        light: options.light,
      });
      break;
    case 'callpoint':
      part = callPoint(kit, {
        latched: options.fire?.latch(i) ?? services.callPoints[i],
        press: () => (options.fire ?? services).press(i),
        reset: () => (options.fire ?? services).reset(i),
      });
      break;
    case 'sounder':
      part = sounderBeacon(kit, {
        sounding: f.sounding,
        tone: options.fire?.tone,
      });
      break;
    case 'detector':
      part = smokeDetector(kit, { alarm: f.detector });
      break;
    case 'firepanel':
      part = firePanel(kit, {
        lamps: f.panelLamps,
        key: f.panelKey,
        silence: f.silence,
        reset: f.reset,
        evacuate: f.evacuate,
      });
      break;
    case 'sprinkler':
      part = sprinklerHead(kit, {
        // Its own head in a shared system; its model's first, on its own.
        head: computed(() => f.heads.value[options.fire ? i : 0]),
        voice: true,
        fallDistance: options.fallDistance,
      });
      break;
    case 'valves':
      part = valveSet(kit, {
        main: f.riserValve,
        tripped: f.discharging,
        reset: f.resetSprinklers,
      });
      break;
    case 'bell':
      part = fireBell(kit, { ringing: f.discharging });
      break;
    case 'water':
    case 'co2':
      part = extinguisher(kit, { kind });
      break;
    default: {
      const a = beginPart(kit, architecturalComponent(kind).title);
      const view = createArchitecturalFixture(
        kit,
        kind,
        options.legend,
        options.length,
      );
      a.object.add(view.group);
      if (kind === 'testvalve' && view.actuator) {
        const valve = createSwitch({ bound: services.testDrain });
        a.uses.set(view.actuator, valve.flip);
        a.holdWhile(
          computed(() => services.testDrain.value && f.riserValve.value),
          WATER_SPRAY,
        );
        a.voice(valve, {
          on: click({ band: 900, q: 1, decay: 0.04, level: 0.1 }),
          off: click({ band: 1100, q: 1, decay: 0.04, level: 0.1 }),
        });
        a.disposers.push(valve.dispose);
        a.updates.push(() => view.set(services.testDrain.value));
      }
      part = a.part();
    }
  }
  const component = architecturalComponent(kind);
  part.object.name = component.title;
  part.object.userData.architectural = component;
  return { ...part, component };
}

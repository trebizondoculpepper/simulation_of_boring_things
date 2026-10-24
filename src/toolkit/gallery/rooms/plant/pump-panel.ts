import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../../components/core/views/eighties-controls';
import { tools } from '../../../components/core/views/fitting-tools';
import {
  mushroomStop,
  pilotLight,
  selector,
} from '../../../components/core/parts/parts';
import {
  TRI_STATES,
  triStateIndicator,
} from '../../../components/core/parts/panel-indicators';
import { createControlCubicle } from '../../../components/industrial-control/views/control-cubicle';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import { currentPlant } from './live-plant';
import type { PoolId } from '../../../../game/plant/pools';
import type { PlantReading } from '../../logic/control-room-demo';
import { MAIN_POOL_MIMIC, mainPoolState } from '../../logic/pool-mimics';
import {
  LOUNGE_VALVE_MIMIC,
  loungeValveMimicState,
} from '../../logic/lounge-valve-mimic';
import { LOUNGE_VALVES } from '../../../../game/plant/lounge-valves';
import { worldStore } from '../../../save/world-store';
import type { PumpsShown } from '../../logic/pool-mimics';
import {
  AUTO,
  PUMPS,
  command,
  newPumpControls,
  pumpState,
  setHoa,
} from '../../logic/pump-control';
import type { PumpId } from '../../logic/pump-control';

/**
 * The filter pumps' controls, shared by every board that shows or works
 * them: the pump room's local control panel and the control room's mimic.
 * Its START and STOP buttons say where they are (`local`, `remote`); the
 * local panel's key switch decides whether the control room's count.
 */
export const pumpControls = {
  state: newPumpControls(),
  /** The local panel's emergency stop, struck. */
  stopped: false,
};

/** What the pumps do now, for the mimics. */
export function pumpsShown(reading: PlantReading): PumpsShown {
  const at = (id: PumpId) =>
    pumpControls.stopped
      ? 1
      : pumpState(
          pumpControls.state,
          id,
          reading.pumps[id],
          reading.alarms.includes(`${id}-trip` as never),
        );
  return { p1: at('p1'), p2: at('p2'), local: !pumpControls.state.remote };
}

/** A mimic button's id, "p1-start", as the command it gives. */
export function pressPump(id: string, from: 'local' | 'remote') {
  const [pump, verb] = id.split('-') as [PumpId, string];
  if (!PUMPS.includes(pump)) return;
  pumpControls.state = command(
    pumpControls.state,
    pump,
    verb === 'start',
    from,
  );
}

/** A seven-segment ammeter in its bezel, reading a motor's current. */
function ammeter(kit: PanelKit, parent: Group, x: number, y: number) {
  const t = tools(kit);
  t.box(parent, t.paint('#141516', 0.4), 0.13, 0.07, 0.01, x, y, 0.005);
  const digits = createSevenSegment(kit, 4, { digitHeight: 0.024 });
  digits.group.position.set(x, y + 0.004, 0.011);
  digits.group.traverse((o) => (o.userData.live = true));
  parent.add(digits.group);
  const label = createMicroLabel(kit, 'AMPS', {
    height: 0.009,
    ink: '#f2f1ea',
  });
  label.position.set(x, y - 0.026, 0.0105);
  parent.add(label);
  return digits;
}

/** The filter pumps' local control panel, showing `pool`'s plant. */
export const pumpPanelExhibit = (pool: PoolId = 'pool_02'): PlantExhibit => ({
  title: 'Local control panel: filter pumps',
  reference:
    'Penfold Controls cubicle (RAL 7035) after Benfield’s: the main pool mimic on its top panel; tri-state indicators, ammeters, HAND · OFF · AUTO and LOCAL · REMOTE below',
  size: { w: 2.7, d: 0.6, h: 2.45, mount: 'floor' },
  build(kit): LiveExhibit {
    const cubicle = createControlCubicle(kit, {
      width: 2.6,
      height: 2.35,
      doors: 3,
      fascia: 1.3,
    });
    cubicle.group.position.z = 0.25;
    const parts = cubicle.parts;
    const store = typeof window === 'undefined' ? null : worldStore('dev');
    const mimic = createMimicBoard(
      kit,
      pool === 'pool_01' ? LOUNGE_VALVE_MIMIC : MAIN_POOL_MIMIC,
      {
        maker: 'penfold',
        press: (id) => {
          const [assetId, verb] = id.split('/');
          if (
            pool === 'pool_01' &&
            LOUNGE_VALVES.some((valve) => valve.assetId === assetId)
          ) {
            store?.dispatch({
              type: 'plant/valve',
              id: assetId,
              open: verb === 'open',
            });
          } else pressPump(id, 'local');
        },
      },
    );
    cubicle.fasciaFace.add(mimic.group);
    for (const [object, use] of mimic.parts.uses) parts.uses.set(object, use);
    // A door for each pump: its indicator, its ammeter, its selector.
    const pumps = PUMPS.map((id, i) => {
      const face = cubicle.doors[i].face;
      const state = signal<number | null>(1);
      const indicator = triStateIndicator(kit, {
        lamps: TRI_STATES.motor,
        state,
        title: `P-10${i + 1} FILTER PUMP ${i + 1}`,
      });
      indicator.group.position.set(-0.12, 0.2, 0);
      face.add(indicator.group);
      for (const lamp of indicator.lamps) parts.add(lamp);
      const amps = ammeter(kit, face, 0.13, 0.21);
      const hoa = parts.add(
        selector(kit, {
          positions: 3,
          initial: AUTO,
          legend: 'HAND · OFF · AUTO',
          name: `P${i + 1} HAND OFF AUTO`,
        }),
      );
      hoa.object.position.set(-0.12, 0.0, 0);
      face.add(hoa.object);
      return { id, state, amps, hoa };
    });
    // The third door: LOCAL · REMOTE, the supply lamp and the stop.
    const face = cubicle.doors[2].face;
    const where = parts.add(
      selector(kit, {
        positions: 2,
        key: true,
        initial: 1,
        legend: 'LOCAL · REMOTE',
        name: 'Pumps LOCAL REMOTE key switch',
      }),
    );
    where.object.position.set(0.05, 0.2, 0);
    face.add(where.object);
    const supply = parts.add(
      pilotLight(kit, {
        colour: 'white',
        legend: 'SUPPLY ON',
        name: 'Supply on lamp',
      }),
    );
    supply.object.position.set(0.22, 0.2, 0);
    face.add(supply.object);
    const stop = parts.add(mushroomStop(kit, { name: 'Pumps emergency stop' }));
    stop.object.position.set(0.12, -0.02, 0);
    face.add(stop.object);
    const group = new Group();
    group.add(cubicle.group);
    return {
      object: group,
      parts,
      update(delta) {
        const reading = currentPlant(pool);
        let c = { ...pumpControls.state, remote: where.position.value === 1 };
        for (const p of pumps) c = setHoa(c, p.id, p.hoa.position.value);
        pumpControls.state = c;
        pumpControls.stopped = stop.pushed.value;
        const shown = pumpsShown(reading);
        for (const p of pumps) {
          p.state.value = shown[p.id];
          const amps = shown[p.id] === 0 ? reading.amps[p.id] : 0;
          p.amps.show(amps.toFixed(1).padStart(5, ' '));
        }
        mimic.show(
          pool === 'pool_01'
            ? loungeValveMimicState(
                store?.world.value.loungeValvePositions ?? {},
                shown,
              )
            : mainPoolState(reading, shown),
        );
        mimic.parts.update(delta);
      },
    };
  },
});

/** The main pool's, as the dev rooms show it. */
export const PUMP_PANEL_EXHIBIT = pumpPanelExhibit();

import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import type { Part } from '../../core/parts/parts';
import type { PartEvent } from '../../core/logic/world/components';
import {
  CO2_BANKS,
  bankFlag,
  bankPressure,
  co2Pressures,
  drawCo2,
  newCo2Supply,
  setIsolation,
  throwLever,
} from '../logic/co2-supply';
import type { Co2Supply } from '../logic/co2-supply';
import { CO2_CAGE_SPEC, createCo2Cage } from '../views/co2-cage';
import { createMeshCagePart } from '../../architectural/parts/mesh-cage';
import type { MeshCagePart } from '../../architectural/parts/mesh-cage';

export interface Co2SupplyPart extends Part {
  /** The supply as it stands. */
  readonly supply: Co2Supply;
  /** Draw `kg` of CO₂ through the line (a trial's stand-in for a dosing plant room). */
  draw(kg: number): void;
  /** The cage round it, its door working. */
  readonly cage: MeshCagePart;
}

/**
 * The CO₂ cage working (mission 109, stage 1): its cylinders hold their
 * contents (`co2-supply.ts`), its gauges read each bank's pressure, the
 * regulator's outlet and the line's, its flags show which bank is in use,
 * which stands by and which is empty, and its lever and its emergency
 * isolation valve work. Nothing draws on it yet in the building; the
 * trial room draws on it by hand. Its state is its own until the world
 * holds it (the mission's later stages).
 */
export function createCo2SupplyPart(
  kit: PanelKit,
  initial: Co2Supply = newCo2Supply(),
): Co2SupplyPart {
  const view = createCo2Cage(kit);
  // The cage round it, its door working.
  const cage = createMeshCagePart(kit, CO2_CAGE_SPEC, {
    name: 'CO₂ cylinder cage',
  });
  view.group.add(cage.object);
  let supply = initial;
  const listeners = new Set<(event: PartEvent, name: string) => void>();
  const emit = (event: PartEvent) => {
    for (const l of listeners) l(event, 'CO₂ supply');
  };
  const show = () => {
    for (const bank of CO2_BANKS) {
      view.bankGauges[bank].set(bankPressure(supply, bank));
      view.setFlag(bank, bankFlag(supply, bank));
    }
    const p = co2Pressures(supply);
    view.outletGauge.set(p.outlet);
    view.lineGauge.set(p.line);
    view.setLever(supply.service);
    view.setIsolation(supply.isolation);
  };
  show();
  const uses = new Map<Object3D, (direction?: number) => void>([
    [
      view.leverHandle,
      () => {
        supply = throwLever(supply);
        show();
        emit('detent');
      },
    ],
    [
      view.isolationHandle,
      () => {
        supply = setIsolation(supply, !supply.isolation);
        show();
        emit(supply.isolation ? 'on' : 'off');
      },
    ],
  ]);
  for (const [o, use] of cage.uses) uses.set(o, use);
  return {
    object: view.group,
    uses,
    cage,
    get supply() {
      return supply;
    },
    draw(kg) {
      supply = drawCo2(supply, kg);
      show();
    },
    update(delta) {
      cage.update(delta);
      for (const bank of CO2_BANKS) view.bankGauges[bank].update(delta);
      view.outletGauge.update(delta);
      view.lineGauge.update(delta);
    },
    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setAudible() {},
    dispose() {
      cage.dispose();
      listeners.clear();
    },
  };
}

import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import { beginPart, createPartSet } from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import type { PipeKindId } from '../../../components/core/views/pipe-kinds';
import { tools } from '../../../components/core/views/fitting-tools';
import {
  createInlineFitting,
  placeFitting,
} from '../../../components/plant/views/inline-fittings';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import { createEndSuctionPump } from '../../../components/plant/views/pumps-plant';
import { createPumpLocalPanel } from '../../../components/plant/views/power-conversion';
import { createDutyStandbyPanel } from '../../../components/plant/views/duty-standby-panel';
import { createExperimentalSource } from '../../../../game/plant/experimental-source';
import {
  DUTY_ITEMS,
  DUTY_PIPES,
  DUTY_SIZE,
  createDutyStandbyModel,
  plumbDutyStandbyRig,
} from '../../logic/duty-standby-rig';
import type {
  DutyItem,
  DutyStandbyModel,
  DutyStandbyRig,
} from '../../logic/duty-standby-rig';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Duty and standby pumps on shared headers. Isolate the duty pump and the standby takes over. Click a non-return valve to jam it open.';

let rig: DutyStandbyRig | null = null;
let model: DutyStandbyModel | null = null;

export function layoutRoom() {
  rig = plumbDutyStandbyRig();
  return rig.layout;
}

export function prepareRoom() {
  rig ??= plumbDutyStandbyRig();
  model = createDutyStandbyModel(rig);
}

const TITLES: Record<DutyItem, [string, string]> = {
  supply: ['Supply: 400 V, endless', 'experimental source'],
  panel: ['Duty / standby panel', 'Penfold, both pumps’ starters'],
  'water-source': ['Water: endless source', 'experimental source'],
  'water-sink': ['Water: endless sink', 'experimental sink'],
  'pump-1': ['Pump 1', 'Grundflow end-suction, 30 kW'],
  'pump-2': ['Pump 2', 'Grundflow end-suction, 30 kW'],
};

const build =
  (item: DutyItem) =>
  (kit: PanelKit): LiveExhibit => {
    const object = new Group();
    const m = () => model!;
    if (item === 'supply') {
      const view = createExperimentalSourceView(
        kit,
        createExperimentalSource({
          id: 'duty.supply',
          substance: 'power-400v',
        }),
      );
      object.add(view.group);
      return { object, update: () => view.update() };
    }
    if (item === 'water-source' || item === 'water-sink') {
      const view = createExperimentalSourceView(
        kit,
        item === 'water-source' ? m().water : m().sink,
      );
      object.add(view.group);
      return { object, update: () => view.update() };
    }
    if (item === 'panel') {
      const panel = createDutyStandbyPanel(kit, {
        duty: () => m().readings().controller.duty,
        select: (duty) => m().press({ type: 'select', duty }),
        start: () => m().press({ type: 'start' }),
        stop: () => m().press({ type: 'stop' }),
        reset: () => m().press({ type: 'reset' }),
        lamps: () => {
          const r = m().readings();
          return {
            run: r.running,
            fault: r.controller.fault,
            dutyFail: r.controller.dutyFail,
          };
        },
        flow: () => m().readings().delivered,
        headerBar: () => m().readings().headerBar,
      });
      object.add(panel.group);
      return { object, parts: panel.parts, update: () => panel.update() };
    }
    const i = item === 'pump-1' ? 0 : 1;
    const pump = createEndSuctionPump(kit);
    object.add(pump);
    const local = createPumpLocalPanel(kit);
    local.group.position.set(-0.3, 0, 0.6);
    object.add(local.group);
    return {
      object,
      update: (delta) => {
        const r = m().readings();
        // Its flow through it, back (−) through an idle pump past a jammed valve.
        local.update(r.running[i], r.through[i]);
        pump.gauges.suction.set(r.suctionBar[i]);
        pump.gauges.discharge.set(r.dischargeBar[i]);
        pump.gauges.suction.update(delta);
        pump.gauges.discharge.update(delta);
      },
    };
  };

export const EXHIBITS: readonly PlantExhibit[] = DUTY_ITEMS.map((item) => ({
  title: TITLES[item][0],
  reference: TITLES[item][1],
  size: { ...DUTY_SIZE[item], mount: 'floor' as const },
  build: build(item),
}));

/**
 * The plumber's work: the headers, the pipe and conduit, and each fitting
 * working. The non-return valves can be jammed open by a click, to see
 * what they are for. Each frame steps the rig.
 */
export function buildRoomServices(kit: PanelKit): LiveExhibit {
  const object = new Group();
  object.name = 'Duty/standby rig';
  const parts = createPartSet();
  const plumbed = rig ?? plumbDutyStandbyRig();
  const working = model ?? createDutyStandbyModel(plumbed);
  const t = tools(kit);
  // The headers: DN200 suction, DN150 discharge, each with its branch stubs and end cap.
  for (const h of plumbed.headers) {
    object.add(
      createPipe('pvc-pressure', h.od, [h.from, h.to], {
        colour: DUTY_PIPES.water.colour,
      }),
    );
    for (const b of h.branches)
      object.add(
        createPipe(
          'pvc-pressure',
          0.16,
          [
            b.at,
            [
              b.at[0] + h.branchOut[0] * h.stub,
              b.at[1] + h.branchOut[1] * h.stub,
              b.at[2] + h.branchOut[2] * h.stub,
            ],
          ],
          { colour: DUTY_PIPES.water.colour },
        ),
      );
    const cap = t.cyl(
      object,
      t.paint('#2f6a37', 0.5),
      h.od / 2 + 0.01,
      0.03,
      h.to[0],
      h.to[1],
      h.to[2],
      'z',
      24,
    );
    cap.name = 'Header end cap';
  }
  for (const line of plumbed.lines) {
    const pipe = DUTY_PIPES[line.medium];
    object.add(
      createPipe(pipe.kind as PipeKindId, pipe.od, line.points, {
        colour: pipe.colour,
      }),
    );
  }
  for (const f of plumbed.fittings) {
    const line = plumbed.lines.find((l) => l.id === f.edge)!;
    const isNrv = f.kind === 'non-return-valve';
    const part = parts.add(
      createInlineFitting(
        kit,
        {
          kind: f.kind,
          medium: f.medium,
          operator: isNrv ? 'self' : 'hand',
          od: DUTY_PIPES[line.medium].od,
          rating: '3P  63A',
        },
        isNrv
          ? undefined
          : {
              open: () => working.isOpen(f.id),
              set: (v) => working.setOpen(f.id, v),
            },
      ),
    );
    placeFitting(part.object, f.kind, f.at, f.along, [0, 1]);
    object.add(part.object);
    if (isNrv) {
      // A click jams it open (or frees it); a red tag says so.
      const i = f.edge.startsWith('pump-1') ? 0 : 1;
      const jam = beginPart(kit, `Pump ${i + 1} non-return valve`);
      part.object.traverse((piece) =>
        jam.uses.set(piece, () => working.setJammed(i, !working.isJammed(i))),
      );
      const tag = createMicroLabel(kit, 'JAMMED OPEN', {
        height: 0.02,
        ink: '#ffffff',
        plate: '#c42b23',
        maxWidth: 0.2,
        faceCamera: true,
      });
      tag.position.set(f.at[0], f.at[1] + 0.15, f.at[2]);
      tag.visible = false;
      tag.userData.live = true;
      object.add(tag);
      jam.updates.push(() => {
        tag.visible = working.isJammed(i);
      });
      parts.add(jam.part());
    }
  }
  return { object, parts, update: (delta) => working.step(delta) };
}

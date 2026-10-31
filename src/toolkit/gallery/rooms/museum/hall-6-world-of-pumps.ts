import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createPartSet } from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import { mergeTree } from '../../../components/core/views/merge-static';
import { markComponent } from '../../../components/core/views/component-identity';
import { tools } from '../../../components/core/views/fitting-tools';
import { partAudio } from '../../../components/core/audio/part-audio';
import { markFrontCentre } from '../../../components/core/audio/front-centre';
import { playPiezo } from '../../../components/sound/audio/piezo-recordings';
import { pumpSound } from '../../../components/plant/views/pump-sound';
import { CIRCULATION_PUMP } from '../../../components/plant/logic/pump-sound';
import {
  MOTOR_DIAPHRAGM_PUMP,
  PERISTALTIC_PUMP,
  SOLENOID_PUMP,
  STEPPER_PUMP,
} from '../../../components/plant/audio/dosing-pump-sounds';
import type { LoopRecipe } from '../../../components/core/audio/part-audio';

/** Each dosing pump's sound and how much it is raised here, dB. */
const DOSING_SOUNDS: Record<1 | 2 | 3 | 4, readonly [LoopRecipe, number]> = {
  1: [SOLENOID_PUMP, 12],
  2: [STEPPER_PUMP, 10],
  3: [MOTOR_DIAPHRAGM_PUMP, 3],
  4: [PERISTALTIC_PUMP, 6],
};

/** A held sound made `dB` louder. */
const louder =
  (recipe: LoopRecipe, dB: number): LoopRecipe =>
  (context, out) => {
    const gain = context.createGain();
    gain.gain.value = 10 ** (dB / 20);
    gain.connect(out);
    return recipe(context, gain);
  };
import { createEndSuctionPump } from '../../../components/plant/views/pumps-plant';
import { createDiaphragmPump } from '../../../components/plant/views/diaphragm-pump';
import { createMotorDosingPump } from '../../../components/plant/views/motor-dosing-pump';
import {
  DMH,
  newMotorPumpState,
} from '../../../components/plant/logic/motor-dosing-pump';
import { createPeristalticPump } from '../../../components/plant/views/peristaltic-pump';
import {
  createInlineFitting,
  placeFitting,
} from '../../../components/plant/views/inline-fittings';
import { createMagFlowmeter } from '../../../components/plant/views/mag-flowmeter';
import { createGlassRotameter } from '../../../components/plant/views/small-flowmeters';
import { createThrottleValve } from '../../../components/plant/views/throttle-valve';
import type { DN } from '../../../components/plant/views/plant-tools';
import { createGasBallValve } from '../../../components/plant/views/gas-fittings';
import { createIdealVessel } from '../../../components/plant/views/ideal-vessel';
import { markPipe } from '../../../components/plant/views/pipe-markers';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import { createPoolClock } from '../../../components/architectural/views/pool-clock';
import {
  createLitresDisplay,
  createRunStand,
  createTankInstruments,
} from '../../../components/plant/views/museum-pump-parts';
import { createIbc } from '../../../components/plant/views/chemicals-storage';
import {
  createOutflow,
  createTankSurface,
  createTundish,
} from '../../views/museum-6-tank';
import {
  LINK_NAMES,
  NODES,
  NOTCHES,
  PUMPS,
  TAGS,
  TANK,
  TANK_AREA,
  actOnHall6,
  levelOf,
  deliveryAlone,
  fittingById,
  fittingName,
  hall6Readings,
  HALL6_MODEL,
  isRunning,
  pumpId,
  shortTag,
} from '../../../../game/plant/museum-6-pumps';
import type {
  Hall6Action,
  MachineId,
  PumpNo,
} from '../../../../game/plant/museum-6-pumps';
import {
  GULLY_AT,
  HEADER,
  HEADER_SPAN,
  INTERIOR,
  PLACES,
  PORTS,
  TANK_AT,
  TROUGH,
  odOf,
  plumbHall6,
  standOf,
  TROUGHS,
  troughBoxes,
} from '../../logic/museum-6-layout';
import type { PlacedItem } from '../../logic/museum-6-layout';
import {
  HALL6_MIMIC,
  hall6MimicState,
  hall6Reading,
} from '../../logic/museum-6-mimic';
import {
  FAMILIES,
  RESET_SIGN,
  hall6Entrance,
  pumpPlaque,
} from '../../logic/museum-6-placards';
import {
  hallSession,
  localNow,
  runSession,
  timeOfDay,
} from '../../logic/museum-time';
import {
  createResetPedestal,
  createWallPanel,
  paintEntrance,
  paintResetSign,
} from '../../views/museum-exhibit';
import type { MimicState } from '../../../components/industrial-control/logic/mimic';
import type { HallExhibit } from './exhibits';

/**
 * Hall 6, "Grundflow's Amazing World of Pumps" (107j): two pumps
 * found nowhere else in the game, the small mag-drive pump to the south
 * and the split-case showpiece to the north by the way in, in a row
 * along the courtyard (west) wall in front of the ideal reservoir's
 * trough, each filling the 1,000-litre test tank in the hall's middle
 * through the overhead inlet header; each with its RUN stand, plaque and
 * flow readout facing into the hall. The mimic, the clock, the entrance
 * panel, RESET and the two-families panel on the street (east) wall,
 * between the archways. Everything is laid out in the layout's frame
 * (trough at +x, panels at −x) and the whole exhibit turned half round
 * (`STANDS`, layout C). The model, layout, mimic and words are pure
 * (`museum-6-pumps.ts`, `museum-6-*.ts`); this draws them and keeps the
 * hall's session. Real time only. In the hall's frame, metres.
 */

/** The panel wall: the street (east) wall's face. */
const WALL = INTERIOR.maxX - 0.04;
const FACE_WEST = -Math.PI / 2;
/** The clock's middle: its 0.75 m face's top under 2.5 m, below the hall's title band (2.6 to 4.6 m). */
const CLOCK = { y: 2.1 } as const;

const turnTo = (o: Object3D, x: number, y: number, z: number, yaw: number) => {
  o.position.set(x, y, z);
  o.rotation.y = yaw;
  return o;
};

/** A plaque's face: the pump's number and name, the fill sentence large, the rest small. */
function paintPlaque(no: PumpNo) {
  const p = pumpPlaque(no);
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#f6f4ec';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1f5fa6';
    c.fillRect(0, 0, w, h * 0.16);
    c.fillStyle = '#ffffff';
    c.font = `bold ${h * 0.09}px Arial`;
    c.fillText(p.title, w * 0.03, h * 0.11, w * 0.94);
    c.fillStyle = '#b22a22';
    c.font = `bold ${h * 0.085}px Arial`;
    wrap(c, p.headline, w * 0.03, h * 0.28, w * 0.94, h * 0.1);
    c.fillStyle = '#16232b';
    c.font = `${h * 0.052}px Arial`;
    const y = wrap(c, p.body, w * 0.03, h * 0.5, w * 0.94, h * 0.064);
    c.font = `italic ${h * 0.05}px Arial`;
    const y2 = wrap(c, p.fact, w * 0.03, y + h * 0.02, w * 0.94, h * 0.06);
    c.font = `bold ${h * 0.05}px Arial`;
    wrap(c, p.tryIt, w * 0.03, y2 + h * 0.02, w * 0.94, h * 0.06);
  };
}

function wrap(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  line: number,
) {
  let row = '';
  for (const word of text.split(' ')) {
    const next = row ? `${row} ${word}` : word;
    if (c.measureText(next).width > width && row) {
      c.fillText(row, x, y);
      y += line;
      row = word;
    } else row = next;
  }
  if (row) c.fillText(row, x, y);
  return y + line;
}

/** A pump's flow readout's two lines. */
const flowLines = (no: PumpNo, m3h: number): [string, string] => {
  const small = PUMPS[no - 1].family === 'displacement';
  const value = small
    ? `${(m3h * 1000).toFixed(2).padStart(6)} l/h`
    : `${m3h.toFixed(m3h < 100 ? 1 : 0).padStart(6)} m3/h`;
  return [`FI${no} FLOW`.padEnd(12), value.padEnd(12).slice(0, 12)];
};

export function buildHallExhibit(kit: PanelKit): HallExhibit {
  const plumbed = plumbHall6();
  let session = hallSession(HALL6_MODEL, localNow());
  let readings = hall6Readings(session.state);
  let mimicState: MimicState = hall6MimicState(session.state);
  let mimicDue = 0;
  const state = () => session.state;
  const act = (a: Hall6Action) => {
    session = { ...session, state: actOnHall6(session.state, a) };
    readings = hall6Readings(session.state);
    mimicDue = 0;
  };
  const reset = (now: number) => {
    session = hallSession(HALL6_MODEL, now);
    readings = hall6Readings(session.state);
    mimicDue = 0;
  };

  const object = new Group();
  object.name = 'Hall 6: Grundflow’s Amazing World of Pumps';
  const parts = createPartSet();
  const t = tools(kit);
  const updates: ((delta: number) => void)[] = [];
  const still = (thing: Object3D, worked: Set<Object3D> = new Set()) => {
    mergeTree(thing, (o) => o.userData.live === true || worked.has(o));
    return thing;
  };
  const take = (set: { uses: Map<Object3D, (d?: number) => void> }) => {
    for (const [o, use] of set.uses) parts.uses.set(o, use);
  };
  const nodeName = (id: MachineId) => NODES.find((n) => n.id === id)!.name;
  const atMachine = (o: Object3D, id: MachineId) =>
    turnTo(o, PLACES[id].x, 0, PLACES[id].z, PLACES[id].yaw);
  const solids = [...plumbed.solids];
  const footprint = (x: number, z: number, r = 0.3) =>
    solids.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r });

  // The error bleep, front centre: a press refused while the pumps are locked out.
  const sounder = new Group();
  markFrontCentre(sounder);
  object.add(sounder);
  let refused = state().refused;
  updates.push(() => {
    if (state().refused !== refused) {
      if (state().refused > refused) playPiezo('error', undefined, sounder);
      refused = state().refused;
    }
  });

  // ---- The reservoir: one ideal source, a trough at the foot of each plant wall ----
  const boxes = troughBoxes();
  TROUGHS.forEach((tr, k) => {
    const box = boxes[k];
    const local = (v: readonly number[], c: readonly number[] = [0, 0, 0]) => {
      const x = v[0] - c[0];
      const z = v[2] - c[2];
      const cy = Math.cos(-tr.yaw);
      const sy = Math.sin(-tr.yaw);
      return [x * cy + z * sy, v[1] - c[1], -x * sy + z * cy] as const;
    };
    const trough = createIdealVessel(kit, {
      w: TROUGH.d,
      d: tr.length,
      h: TROUGH.h,
      water: TROUGH.h - 0.12,
      name: 'Ideal clean-water reservoir',
      ports: Object.entries(PORTS.source)
        .filter(([, p]) =>
          [0, 2].every(
            (i) => p.at[i] >= box.min[i] - 0.06 && p.at[i] <= box.max[i] + 0.06,
          ),
        )
        .map(([key, p]) => ({
          at: local(p.at, [tr.x, 0, tr.z]),
          out: local(p.out),
          od: odOf(PUMPS[Number(key.slice(4)) - 1].dn),
        })),
    });
    trough.show(['CLEAN WATER  IDEAL', 'ATMOSPHERIC  CW1']);
    turnTo(trough.group, tr.x, 0, tr.z, tr.yaw);
    object.add(
      markComponent(still(trough.group), {
        name: `${TAGS['source']} ${nodeName('source')}`,
        model: { node: 'source' },
      }),
    );
  });

  // ---- The pumps ----
  const describePump = (o: Object3D, no: PumpNo) =>
    markComponent(o, {
      name: `${TAGS[pumpId(no)]} ${nodeName(pumpId(no))}`,
      model: { node: pumpId(no) },
      status: () =>
        isRunning(state(), no) ? 'running, its RUN lamp lit' : 'stopped',
    });
  const dosingStand = (no: PumpNo, child: Object3D) => {
    const g = new Group();
    t.box(g, t.paint('#a9afaf', 0.4, 0.7), 0.5, 0.04, 0.44, 0, 0.88, 0);
    for (const [x, z] of [
      [0.22, 0.19],
      [-0.22, 0.19],
      [0.22, -0.19],
      [-0.22, -0.19],
    ])
      t.box(g, t.paint('#a9afaf', 0.4, 0.7), 0.04, 0.88, 0.04, x, 0.44, z);
    child.position.y = 0.9;
    // Its front (its display, its own +z) turned to the layout's −x, away
    // from its suction: with the stand's turn, into the hall (the facing rule).
    child.rotation.y = FACE_WEST;
    g.add(child);
    return atMachine(g, pumpId(no));
  };
  for (const p of PUMPS) {
    const no = p.no;
    const on = () => isRunning(state(), no);
    if (no === 1 || no === 2) {
      const pump = createDiaphragmPump(
        kit,
        `P${no}`,
        no === 1 ? 'solenoid' : 'stepper',
      );
      object.add(describePump(dosingStand(no, pump.object), no));
      updates.push((delta) =>
        pump.update(delta, {
          running: on(),
          rate: p.family === 'displacement' ? p.ratedLh : 0,
        }),
      );
    } else if (no === 3) {
      // The DMH at full stroke, its own rate (MAN), started by RUN; its strokes counted here.
      const base = {
        ...newMotorPumpState(),
        mode: 'manual' as const,
        manual: 1,
        strokeLength: 1,
      };
      const pump = createMotorDosingPump(kit, 'P3', {
        state: () => ({ ...base, on: on() }),
        change: () => {},
        inputs: () => ({
          powered: true,
          release: true,
          signalMa: 4,
          level: 'ok',
          dischargeBar: 0.17,
        }),
      });
      object.add(describePump(dosingStand(no, pump.object), no));
      let phase = 0;
      updates.push((delta) => {
        phase += on() ? (delta * DMH.maxSpm) / 60 : 0;
        const began = Math.floor(phase);
        phase -= began;
        pump.show(delta, { began, delivering: began });
      });
    } else if (no === 4) {
      const pump = createPeristalticPump(kit, 'P4');
      object.add(describePump(dosingStand(no, pump.object), no));
      updates.push((delta) => pump.update(delta, on()));
    } else {
      // The two NKC end-suction pumps.
      const pump = createEndSuctionPump(kit);
      object.add(describePump(still(atMachine(pump, pumpId(no))), no));
      const g = (
        pump as unknown as {
          gauges?: {
            suction: { set(v: number): void; update(d: number): void };
            discharge: { set(v: number): void; update(d: number): void };
          };
        }
      ).gauges;
      if (g)
        updates.push((delta) => {
          const r = readings.gauges[no];
          g.suction.set(r.suctionBar);
          g.discharge.set(r.dischargeBar);
          g.suction.update(delta);
          g.discharge.update(delta);
        });
    }
    // The centrifugal pumps' sound: each its motor's, the showpiece loudest and lowest.
    if (p.family === 'centrifugal') {
      const from = new Group();
      atMachine(from, pumpId(no));
      from.position.y = 0.7;
      object.add(from);
      const sound = pumpSound({
        ...CIRCULATION_PUMP,
        kW: p.kW,
        poles: p.kW >= 7 ? 4 : 2,
        runUp: p.kW >= 7 ? 3 : 1,
        coastDown: p.kW >= 20 ? 9 : 3,
      });
      let heard = false;
      updates.push(() => {
        if (on() !== heard) {
          heard = on();
          partAudio.hold(from, heard ? sound : null, from);
        }
      });
    }
    // The dosing pumps' sound, here louder than in a plant room (the owner,
    // 2026-10-29: P1 seemed silent; a solenoid pump's tick is about 18 dB
    // under the smallest circulator's hum): each its own sound, raised to
    // about the level of the circulators beside it, over the quiet one its
    // view already holds.
    if (p.family === 'displacement') {
      const from = new Group();
      atMachine(from, pumpId(no));
      from.position.y = 1;
      object.add(from);
      const [recipe, dB] = DOSING_SOUNDS[no as 1 | 2 | 3 | 4];
      const sound = louder(recipe, dB);
      let heard = false;
      updates.push(() => {
        if (on() !== heard) {
          heard = on();
          partAudio.hold(from, heard ? sound : null, from);
        }
      });
    }
    // Its RUN stand, plaque and flow readout.
    const at = standOf(no);
    const stand = createRunStand(kit, {
      no,
      tag: shortTag(pumpId(no)),
      paint: paintPlaque(no),
      press: () => act({ type: 'run', no }),
      running: on,
    });
    turnTo(stand.group, at.x, 0, at.z, at.yaw);
    object.add(
      markComponent(stand.group, {
        name: `${shortTag(pumpId(no))} RUN stand and flow readout ${TAGS[`${pumpId(no)}.fi`]}`,
        status: () =>
          `RUN lamp ${on() ? 'lit' : 'out'}; shows ${flowLines(no, readings.flow[no])[1].trim()}`,
      }),
    );
    take(stand.parts);
    updates.push((delta) =>
      stand.update(delta, flowLines(no, readings.flow[no])),
    );
    footprint(at.x, at.z, 0.22);
  }

  // ---- The header, the tank, the gully ----
  const header = createPipe(
    'pvc-pressure',
    HEADER.od,
    [
      [HEADER_SPAN.minX, HEADER.y, HEADER.z],
      [HEADER_SPAN.maxX, HEADER.y, HEADER.z],
    ],
    { colour: '#4d5a63' },
  );
  object.add(
    markComponent(header, {
      name: `${TAGS['header']} ${nodeName('header')}`,
      model: { node: 'header' },
    }),
  );
  // TK1: the game's standard 1,000-litre IBC, its water showing through
  // its bottle; its bottom outlet valve is the drain valve RESET opens.
  const ibc = createIbc(kit, {
    liquid: '#3d86b8',
    handle: '#1f5fa8',
    outletDn: 150,
    openTop: true,
  });
  const tank = createTankInstruments(kit, {
    area: TANK_AREA,
    floor: TANK.floorM,
    fullL: TANK.fullL,
    tags: {
      li: shortTag('tank.li'),
      lt: shortTag('tank.lt'),
      lsh: shortTag('tank.lsh'),
    },
  });
  ibc.group.add(tank.group);
  object.add(
    markComponent(still(atMachine(ibc.group, 'tank'), new Set([ibc.lever])), {
      name: `${TAGS['tank']} ${nodeName('tank')}`,
      model: { node: 'tank' },
      status: () =>
        `its water at the ${Math.round(state().litres)} litre mark; ${TAGS['tank.lsh']} lamp ${readings.high ? 'lit' : 'out'}`,
    }),
  );
  markComponent(ibc.lever, {
    name: `${TAGS['tank.drain.mv']} ${fittingName(fittingById('tank.drain.mv')!)}`,
    model: { fitting: 'tank.drain.mv' },
    status: () =>
      state().draining ? 'lever along the pipe: open' : 'lever across: shut',
  });
  take(tank.parts);
  let shownLevel = -1;
  let shownOpen: boolean | null = null;
  updates.push((delta) => {
    tank.show(readings.high);
    // Redrawn only when the water moves by a visible millimetre, or the valve turns.
    const level = Math.round(levelOf(state().litres) * 1000) / 1000;
    if (level !== shownLevel) {
      shownLevel = level;
      ibc.setLevel(level / TANK.overflowM);
    }
    const open = state().draining;
    if (open !== shownOpen) ibc.setOpen((shownOpen = open));
    tank.parts.update(delta);
  });
  // Its open water, the pools' own surface, at the model's level.
  const surface = createTankSurface(1.12, 0.94);
  const tankFrame = atMachine(new Group(), 'tank');
  tankFrame.userData.live = true;
  tankFrame.add(surface.object);
  object.add(tankFrame);
  // The fill pipe carries on down through the open top to its open end
  // just over the brim, the water out of it as the model delivers it.
  const fill = plumbed.lines.find((l) => l.edge === 'fill')!;
  const [ix, iy, iz] = fill.points[fill.points.length - 1];
  const MOUTH_Y = TANK.floorM + TANK.overflowM - 0.02;
  object.add(
    markComponent(
      createPipe(
        'pvc-pressure',
        fill.od,
        [
          [ix, iy, iz],
          [ix, MOUTH_Y, iz],
        ],
        { colour: '#4d5a63' },
      ),
      { name: `Pipe: ${LINK_NAMES.fill}`, model: { link: 'fill' } },
    ),
  );
  // A galvanised strap across the cage's top rails holds it.
  const strap = new Group();
  t.box(strap, t.paint('#b8bcbc', 0.4, 0.6), 1.0, 0.008, 0.04, 0, 1.165, 0);
  t.box(
    strap,
    t.paint('#b8bcbc', 0.4, 0.6),
    fill.od + 0.03,
    0.03,
    fill.od + 0.03,
    0,
    1.18,
    0,
  );
  strap.position.set(ix, 0, iz);
  object.add(still(strap));
  const outflow = createOutflow(fill.od * 0.9, deliveryAlone(6));
  outflow.group.position.set(ix, MOUTH_Y, iz);
  object.add(outflow.group);
  updates.push((delta) => {
    const level = levelOf(state().litres);
    const wet = state().litres > 0.5;
    surface.show(TANK.floorM + level + 0.002, wet);
    const landing = wet ? TANK.floorM + level : TANK.floorM - 0.01;
    outflow.update(delta, readings.total, MOUTH_Y - landing);
  });
  const litres = createLitresDisplay(kit, shortTag('tank.lt'));
  const litresPost = new Group();
  t.box(
    litresPost,
    t.paint('#2b3438', 0.5, 0.3),
    0.08,
    2.2,
    0.08,
    0,
    1.1,
    -0.06,
  );
  litres.group.position.set(0, 2.3, 0);
  litresPost.add(litres.group);
  turnTo(litresPost, TANK_AT.x, 0, TANK_AT.z + 1.0, FACE_WEST);
  object.add(
    markComponent(litresPost, {
      name: `${TAGS['tank.lt']} tank level display`,
      status: () => `shows ${Math.round(state().litres)} litres`,
    }),
  );
  updates.push(() => litres.show(state().litres));
  footprint(TANK_AT.x, TANK_AT.z + 1.0, 0.15);
  // DR1: a tundish let into the floor under a grille, the drain and overflow falling into it.
  const tundish = createTundish();
  object.add(
    markComponent(atMachine(tundish.group, 'drain'), {
      name: `${TAGS['drain']} ${nodeName('drain')} (tundish)`,
      model: { node: 'drain' },
    }),
  );
  void GULLY_AT;

  // ---- The pipes ----
  for (const line of plumbed.lines) {
    const pipe = createPipe(
      line.pipe === 'tube' ? 'chemical-tube' : 'pvc-pressure',
      line.od,
      line.points,
      line.pipe === 'tube' ? {} : { colour: '#4d5a63' },
    );
    markComponent(pipe, {
      name: `Pipe: ${LINK_NAMES[line.edge]}`,
      model: { link: line.edge },
    });
    object.add(pipe);
    if (line.dn >= 40)
      object.add(
        markPipe(kit, line.points, {
          radius: line.od / 2,
          service: 'pool water',
          text: LINK_NAMES[line.edge].toUpperCase(),
          flow: 1,
        }),
      );
  }

  // ---- The fittings on the lines ----
  for (const item of plumbed.items) placeItem(item);
  function placeItem(item: PlacedItem) {
    const line = plumbed.lines.find((l) => l.edge === item.edge)!;
    const od = line.od;
    const f = fittingById(item.id)!;
    const tag = TAGS[item.id];
    const short = shortTag(item.id);
    const west: [number, number] = [-1, 0];
    const no = Number(f.of.slice(1)) as PumpNo;
    // The tank's drain valve is the IBC's own bottom outlet valve, drawn with it.
    if (f.of === 'tank') return;
    if (f.body === 'motorised') {
      const mv = createInlineFitting(
        kit,
        { kind: 'remote-valve', medium: 'water', operator: 'motor', od },
        { open: () => state().draining, set: () => {} },
      );
      placeFitting(mv.object, 'remote-valve', item.at, item.along, west);
      object.add(
        markComponent(mv.object, {
          name: `${tag} ${fittingName(f)}`,
          model: { fitting: f.id },
          status: () =>
            state().draining ? 'indicator at OPEN' : 'indicator at SHUT',
        }),
      );
      updates.push(mv.update);
      return;
    }
    if (f.body === 'butterfly' && f.role === 'discharge throttling') {
      const id = f.id;
      const valve = parts.add(
        createThrottleValve(kit, {
          dn: line.dn as DN,
          tag: short,
          name: fittingName(f),
          opening: () => state().opening[id],
          step: (by) => act({ type: 'notch', id, by }),
          notches: NOTCHES,
        }),
      );
      placeFitting(valve.object, 'isolating-valve', item.at, item.along, west);
      markComponent(valve.object, {
        name: `${tag} ${fittingName(f)}`,
        model: { fitting: f.id },
        status: () => {
          const o = state().opening[id];
          return o >= 0.98
            ? 'lever at OPEN'
            : o <= 0.02
              ? 'lever at SHUT'
              : `lever throttled, notch ${Math.round(o * 5)} of 5`;
        },
      });
      object.add(valve.object);
      return;
    }
    if (
      f.kind === 'isolating-valve' &&
      (f.body === 'ball' || f.body === 'butterfly')
    ) {
      // Open, as the schematic has them; a ball valve's lever shows it.
      const valve = createGasBallValve(kit, {
        pipeRadius: od / 2,
        name: `${short} ${fittingName(f)}`,
        binding: { open: () => true, set: () => {} },
      });
      placeFitting(valve.object, 'isolating-valve', item.at, item.along, west);
      object.add(
        markComponent(valve.object, {
          name: `${tag} ${fittingName(f)}`,
          model: { fitting: f.id },
          status: () => 'lever along the pipe: open',
        }),
      );
      return;
    }
    if (f.kind === 'isolating-valve' || f.kind === 'non-return-valve') {
      const v = createInlineFitting(kit, {
        kind: f.kind,
        medium: 'water',
        operator: f.kind === 'non-return-valve' ? 'self' : 'none',
        od,
      });
      placeFitting(v.object, f.kind, item.at, item.along, west);
      object.add(
        markComponent(v.object, {
          name: `${tag} ${fittingName(f)}`,
          model: { fitting: f.id },
          ...(f.body === 'commissioning'
            ? { status: () => 'set to duty, its handwheel locked' }
            : {}),
        }),
      );
      return;
    }
    // The flowmeters.
    if (f.meter === 'electromagnetic') {
      const meter = createMagFlowmeter(kit, { od, tag: short });
      meter.group.traverse((o) => (o.userData.live = true));
      placeFitting(meter.group, 'flowmeter', item.at, item.along, west);
      object.add(
        markComponent(meter.group, {
          name: `${tag} ${fittingName(f)}`,
          model: { fitting: f.id },
          status: () => `shows ${readings.flow[no].toFixed(0)} m³/h`,
        }),
      );
      updates.push(() => meter.show(readings.flow[no], 'FLOW'));
      return;
    }
    const p = PUMPS[no - 1];
    const max =
      p.family === 'displacement'
        ? (p.ratedLh * 1.25) / 1000
        : p.dutyFlow * 1.25;
    const meter = createGlassRotameter(kit, {
      od: Math.max(od, 0.02),
      tag: short,
      max,
    });
    placeFitting(meter.group, 'flowmeter', item.at, item.along, west);
    object.add(
      markComponent(meter.group, {
        name: `${tag} ${fittingName(f)}`,
        model: { fitting: f.id },
        status: () =>
          `its float at ${p.family === 'displacement' ? `${(readings.flow[no] * 1000).toFixed(1)} l/h` : `${readings.flow[no].toFixed(1)} m³/h`}`,
      }),
    );
    updates.push((delta) => meter.show(readings.flow[no], delta));
  }

  // ---- The panel wall (the street, east, wall once turned): the entrance, the mimic, the clock, RESET, the two families ----
  const entrance = createWallPanel(
    kit,
    'Entrance panel',
    1.9,
    1.5,
    paintEntrance(
      hall6Entrance(),
      'Hall 6 · Grundflow’s Amazing World of Pumps',
    ),
  );
  turnTo(entrance, WALL, 1.65, INTERIOR.minZ + 2.4, FACE_WEST);
  object.add(still(entrance));

  const board = createMimicBoard(kit, HALL6_MIMIC, {
    maker: 'penfold',
    press: () => {},
    parts: {
      readout: (id) => ({
        kind: 'visible',
        label: `${hall6Reading(id, state())?.name ?? id} readout`,
        shows: () => {
          const r = mimicState.readouts[id]?.live;
          return r ? `${r.value.toFixed(r.places ?? 0)} ${r.unit}` : undefined;
        },
      }),
    },
  });
  turnTo(board.group, WALL, 1.5, 2.6, FACE_WEST);
  object.add(board.group);
  take(board.parts);

  const clock = createPoolClock(kit, { dia: 0.75 });
  turnTo(clock.group, WALL, CLOCK.y, -0.6, FACE_WEST);
  object.add(
    markComponent(clock.group, {
      name: 'Grundflow wall clock, showing the visitor’s local time',
    }),
  );
  updates.push((delta) =>
    clock.show(
      timeOfDay(session.clock),
      1,
      delta > 0 ? Math.min(240, 1 / delta) : 60,
    ),
  );
  const clockBadge = createWallPanel(
    kit,
    'Clock placard',
    0.7,
    0.16,
    (c, w, h) => {
      c.fillStyle = '#1f5fa6';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.font = `bold ${h * 0.55}px Arial`;
      c.fillText('GRUNDFLOW · REAL TIME', w * 0.05, h * 0.7, w * 0.9);
    },
  );
  turnTo(clockBadge, WALL, CLOCK.y - 0.48, -0.6, FACE_WEST);
  object.add(still(clockBadge));

  const resetSign = createWallPanel(
    kit,
    'RESET sign',
    1.0,
    0.56,
    paintResetSign(RESET_SIGN),
  );
  turnTo(resetSign, WALL, 1.75, -2.6, FACE_WEST);
  object.add(still(resetSign));
  const resetButton = createResetPedestal(kit, {
    reset: () => act({ type: 'reset' }),
    lit: () => state().sinceReset < 2.5 || state().draining,
  });
  turnTo(resetButton.group, WALL - 0.45, 0, -2.6, FACE_WEST);
  object.add(resetButton.group);
  take(resetButton.parts);
  updates.push(resetButton.update);
  footprint(WALL - 0.45, -2.6, 0.25);

  const families = createWallPanel(
    kit,
    'Two families of pump',
    2.2,
    1.2,
    (c, w, h) => {
      c.fillStyle = '#f6f4ec';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#16232b';
      c.font = `bold ${h * 0.09}px Arial`;
      c.fillText(FAMILIES.headline, w * 0.03, h * 0.12);
      for (const [k, fam] of [
        FAMILIES.displacement,
        FAMILIES.centrifugal,
      ].entries()) {
        const x = w * (0.03 + k * 0.5);
        c.font = `bold ${h * 0.065}px Arial`;
        c.fillStyle = k ? '#b25a1e' : '#1f5fa6';
        c.fillText(fam.title, x, h * 0.27);
        // A small diagram: a diaphragm and its two valves, or an impeller in its volute.
        c.strokeStyle = c.fillStyle;
        c.lineWidth = h * 0.012;
        c.beginPath();
        if (k === 0) {
          c.rect(x + w * 0.08, h * 0.33, w * 0.2, h * 0.2);
          c.moveTo(x + w * 0.08, h * 0.43);
          c.quadraticCurveTo(x + w * 0.13, h * 0.36, x + w * 0.18, h * 0.43);
        } else {
          c.arc(x + w * 0.18, h * 0.43, h * 0.1, 0, Math.PI * 1.8);
          for (let v = 0; v < 6; v++) {
            const a = (v * Math.PI) / 3;
            c.moveTo(x + w * 0.18, h * 0.43);
            c.lineTo(
              x + w * 0.18 + Math.cos(a) * h * 0.07,
              h * 0.43 + Math.sin(a) * h * 0.07,
            );
          }
        }
        c.stroke();
        c.fillStyle = '#16232b';
        c.font = `${h * 0.05}px Arial`;
        wrap(c, fam.body, x, h * 0.64, w * 0.44, h * 0.065);
      }
    },
  );
  turnTo(families, WALL, 1.6, 6.5, FACE_WEST);
  object.add(still(families));

  const placed = [...solids];
  return {
    object,
    parts,
    status: () => {
      const s = state();
      return s.tripped
        ? 'tank full, pumps locked out'
        : `${Math.round(s.litres)} litres in the tank`;
    },
    solids: () => placed,
    reset,
    update(delta) {
      session = runSession(HALL6_MODEL, session, delta);
      readings = hall6Readings(session.state);
      mimicDue -= delta;
      if (mimicDue <= 0) {
        mimicState = hall6MimicState(session.state);
        mimicDue = 0.25;
      }
      board.parts.update(delta);
      board.show(mimicState);
      for (const u of updates) u(delta);
    },
  };
}

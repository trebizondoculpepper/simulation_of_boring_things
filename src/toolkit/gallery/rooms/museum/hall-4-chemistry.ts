import { Group, Matrix4, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createSevenSegment } from '../../../components/core/views/eighties-controls';
import { createPartSet } from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import { mergeTree } from '../../../components/core/views/merge-static';
import {
  componentOf,
  markComponent,
} from '../../../components/core/views/component-identity';
import { tools } from '../../../components/core/views/fitting-tools';
import { createEndSuctionPump } from '../../../components/plant/views/pumps-plant';
import {
  createInlineFitting,
  placeFitting,
} from '../../../components/plant/views/inline-fittings';
import { createSolenoidValve as createDoseSolenoid } from '../../../components/plant/views/dosing-valves';
import { createSolenoidValve } from '../../../components/plant/views/solenoid-valve';
import { createIdealVessel } from '../../../components/plant/views/ideal-vessel';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import { teleprinterInMetres } from '../../../components/industrial-control/views/teleprinter';
import {
  createBalanceBeam,
  createChemicalTank,
  createDosingDesk,
  createTimePanel,
  createReadoutBoard,
} from '../../../components/plant/views/museum-chemistry-parts';
import {
  CARDS,
  DOSE_SECONDS,
  FITTINGS,
  GREEN,
  HALL4_MODEL,
  LINK_NAMES,
  METERS,
  METER_LABEL,
  METER_PLACES,
  SCALE,
  SWIMMERS,
  TAGS,
  TANKS,
  actOnHall4,
  balanceTerms,
  digitOf,
  meterValue,
  readWater,
  shortTag,
  vfdLine,
} from '../../../../game/plant/museum-4-lab';
import type {
  Hall4Action,
  Hall4Readings,
} from '../../../../game/plant/museum-4-lab';
import {
  BALANCE_TANK,
  BEAM,
  BEAM_LECTERN,
  BEAM_SCALE,
  CARDS_BOARD,
  DESK,
  EAST,
  FRESH_SPOUT,
  LECTERNS,
  LECTERNS_PARKED,
  PARKED_Y,
  MANIFOLD,
  MIMIC_AT,
  NORTH,
  POOL,
  POT,
  PRINTER,
  PUMP,
  READOUT,
  RESET,
  SOUTH,
  LAB_TIME,
  RESET_LECTERN_BACK,
  TANK_Z,
  TANK_LIFT,
  BUND,
  STAND,
  TEE,
  STANDS,
  fittingPlaces,
  placedFootprints,
  pipeRuns,
  tankX,
} from '../../logic/museum-4-layout';
import {
  HALL4_MIMIC,
  hall4MimicState,
  hall4Reading,
} from '../../logic/museum-4-mimic';
import {
  beamPlacard,
  RESET_SIGN,
  hall4Placards,
} from '../../logic/museum-4-placards';
import {
  SPEEDS,
  hallSession,
  localNow,
  runSession,
  setSpeed,
} from '../../logic/museum-time';
import type { TimeSpeed } from '../../logic/museum-time';
import {
  createLectern,
  createResetPedestal,
  createWallPanel,
  heldPumpSound,
  paintResetSign,
} from '../../views/museum-exhibit';
import type { MimicState } from '../../../components/industrial-control/logic/mimic';
import type { HallExhibit } from './exhibits';

/**
 * Hall 4, "The chemistry of pools" (107d): the visitor is the controller.
 * The model, layout, mimic and words are pure (`museum-4-lab.ts`,
 * `museum-4-*.ts`); this draws what they say, binds each thing to them,
 * and keeps the hall's session. Along the street (north) wall, facing
 * south, left to right: the tanks, the desk under its mimic, the
 * teleprinter, the dosing pot, the pool, its readout on the east wall.
 */

const FACE_SOUTH = 0;
const FACE_WEST = -Math.PI / 2;

/**
 * TEMPORARY, for the owner's review of the second layout (2026-10-31):
 * the hall's pipework (the header, the dosing lines, the pump's suction
 * and discharge, the injection line, the make-up's spout and the sample
 * line) is left out of the scene until the hall is re-plumbed for the
 * new positions. Set false again when `pipeRuns` is re-laid.
 */
const PIPES_DEFERRED = true;

const turnTo = (o: Object3D, x: number, y: number, z: number, yaw: number) => {
  o.position.set(x, y, z);
  o.rotation.y = yaw;
  return o;
};

export function buildHallExhibit(kit: PanelKit): HallExhibit {
  let session = hallSession(HALL4_MODEL, localNow());
  let reading: Hall4Readings = readWater(session.state.bench.pool);
  let mimicState: MimicState = hall4MimicState(session.state);
  let mimicDue = 0;
  let sinceReset = 0;
  let printedShown = 0;
  // The pump's lever valves, worked by hand: shut either and nothing
  // circulates (the flowmeter, the pump's gauges and the mimic say so).
  const pumpValves = { 'pump.suction': true, 'pump.discharge': true };
  const circulating = () =>
    pumpValves['pump.suction'] && pumpValves['pump.discharge'];
  const state = () => session.state;
  const act = (a: Hall4Action) => {
    session = { ...session, state: actOnHall4(session.state, a) };
    reading = readWater(session.state.bench.pool);
    mimicDue = 0;
  };

  const object = new Group();
  object.name = 'Hall 4: The chemistry of pools';
  const parts = createPartSet();
  const t = tools(kit);
  const updates: ((delta: number) => void)[] = [];
  const still = (thing: Object3D, worked: Set<Object3D> = new Set()) => {
    mergeTree(thing, (o) => o.userData.live === true || worked.has(o));
    return thing;
  };
  const take = (uses: Map<Object3D, (d?: number) => void>) => {
    for (const [o, use] of uses) parts.uses.set(o, use);
  };
  const solids = placedFootprints();

  /** An instrument of the model, drawn by `thing`, bound to it by its id. */
  const instrument = <T extends Object3D>(
    thing: T,
    id: string,
    name: string,
    status?: () => string,
  ) =>
    markComponent(thing, {
      name: `${TAGS[id]} ${name}`,
      model: { node: id },
      ...(status ? { status } : {}),
    });
  /** The exhibit's own controls and readouts, which work no plant. */
  const exhibitOnly = (o: Object3D) =>
    markComponent(o, { ...componentOf(o), decorative: true });

  // ---- The tanks, on their bund ----
  // The bund is the tanks' concrete plinth and spill wall: structure, not
  // a working component, so decorative.
  const bund = new Group();
  object.add(
    markComponent(bund, { name: "Chemical tanks' bund", decorative: true }),
  );
  t.box(
    bund,
    t.paint('#7a8a8f', 0.7),
    BUND.maxX - BUND.minX,
    BUND.h,
    BUND.maxZ - BUND.minZ,
    (BUND.minX + BUND.maxX) / 2,
    TANK_LIFT + BUND.h / 2,
    (BUND.minZ + BUND.maxZ) / 2,
  );
  // The stand: a welded steel frame, its chequer-plate deck carrying the
  // bund, on box-section legs at its corners and every 1.5 m, braced.
  const stand = new Group();
  object.add(
    markComponent(stand, {
      name: "Chemical tanks' steel stand",
      decorative: true,
    }),
  );
  const steel = t.paint('#3f5866', 0.55, 0.5);
  const sw = STAND.maxX - STAND.minX;
  const sd = STAND.maxZ - STAND.minZ;
  const sx = (STAND.minX + STAND.maxX) / 2;
  const sz = (STAND.minZ + STAND.maxZ) / 2;
  t.box(
    stand,
    t.paint('#6d7478', 0.5, 0.6),
    sw,
    0.012,
    sd,
    sx,
    STAND.h - 0.006,
    sz,
  );
  for (const z of [STAND.minZ + 0.03, STAND.maxZ - 0.03])
    t.box(stand, steel, sw, 0.1, 0.06, sx, STAND.h - 0.062, z);
  const bays = Math.ceil(sw / 1.5);
  for (let k = 0; k <= bays; k++) {
    const x = STAND.minX + 0.03 + (k * (sw - 0.06)) / bays;
    for (const z of [STAND.minZ + 0.03, STAND.maxZ - 0.03]) {
      t.box(
        stand,
        steel,
        0.06,
        STAND.h - 0.11,
        0.06,
        x,
        (STAND.h - 0.11) / 2,
        z,
      );
      t.box(stand, steel, 0.14, 0.01, 0.14, x, 0.005, z);
    }
    t.box(stand, steel, 0.05, 0.05, sd - 0.06, x, 0.15, sz);
  }
  object.add(still(stand));
  for (const tank of TANKS) {
    const view = createChemicalTank(kit, {
      code: tank.code,
      product: tank.product,
      unit: tank.unit === 'm3' ? 'm³' : tank.unit,
      colour: tank.colour,
      hazards: tank.hazards,
    });
    turnTo(view.group, tankX(tank.id), TANK_LIFT + BUND.h, TANK_Z, FACE_SOUTH);
    view.group.traverse((o) => (o.userData.live = true));
    object.add(
      markComponent(view.group, {
        name: `${TAGS[`tank.${tank.id}`]} ideal tank: ${tank.product}`,
        model: { node: `tank.${tank.id}` },
        status: () =>
          `its USED counter at ${state().used[tank.id].toFixed(1)} ${tank.unit}`,
      }),
    );
    updates.push(() => {
      const d = state().delivering;
      view.show(
        state().used[tank.id],
        d && d.tank === tank.id ? 1 - d.left / DOSE_SECONDS : 0,
      );
    });
  }

  // ---- The pipes ----
  for (const run of PIPES_DEFERRED ? [] : pipeRuns()) {
    const chem = run.edge.startsWith('dose.') && run.edge !== 'dose.fresh';
    const pipe = createPipe('pvc-pressure', run.od, run.points, {
      colour:
        chem || run.edge === 'header' || run.edge === 'injection'
          ? '#d9a521'
          : '#4d5a63',
    });
    object.add(
      markComponent(pipe, {
        name: `Pipe: ${LINK_NAMES[run.edge]}`,
        model: { link: run.edge },
      }),
    );
  }
  // The dosing header DH1: a manifold under the tanks' outlets, capped at
  // its west end, the header's line leaving its east end for the pot.
  const manifold = new Group();
  const manifoldPaint = t.paint('#d9a521', 0.5);
  t.box(
    manifold,
    manifoldPaint,
    MANIFOLD.maxX - MANIFOLD.minX,
    MANIFOLD.od,
    MANIFOLD.od,
    (MANIFOLD.minX + MANIFOLD.maxX) / 2,
    MANIFOLD.y,
    MANIFOLD.z,
  );
  for (const x of [MANIFOLD.minX, MANIFOLD.maxX])
    t.box(
      manifold,
      t.paint('#8f7a3c', 0.5),
      0.012,
      MANIFOLD.od + 0.02,
      MANIFOLD.od + 0.02,
      x,
      MANIFOLD.y,
      MANIFOLD.z,
    );
  t.label(
    manifold,
    shortTag('header'),
    MANIFOLD.minX + 0.25,
    MANIFOLD.y,
    MANIFOLD.z + MANIFOLD.od / 2 + 0.002,
    0.03,
    '#16191b',
  );
  if (!PIPES_DEFERRED)
    object.add(
      still(
        markComponent(manifold, {
          name: `${TAGS['header']} dosing header`,
          model: { node: 'header' },
          status: () =>
            state().delivering && state().delivering!.tank !== 'fresh'
              ? 'carrying a dose to the pot'
              : 'idle',
        }),
      ),
    );

  // ---- The fittings on the lines ----
  const places = fittingPlaces();
  for (const f of FITTINGS) {
    const place = places[f.id];
    const name = `${TAGS[f.id]} ${f.role} ${f.kind === 'non-return-valve' ? 'non-return valve' : f.kind === 'flowmeter' ? 'flowmeter' : 'valve'}`;
    if (f.of?.startsWith('tank.')) {
      // A tank's solenoid valve: energised (open, its LED lit) while the
      // desk delivers that tank's dose, shut otherwise, as the mimic shows.
      const tank = f.of.slice(5);
      const open = () => state().delivering?.tank === tank;
      if (tank === 'fresh') {
        const valve = createSolenoidValve(kit, 0.06);
        // Drawn along y, its coil toward z: turned so its pipe runs along
        // x and its coil stands up, as `placeFitting` expects.
        valve.group.quaternion.setFromRotationMatrix(
          new Matrix4().makeBasis(
            new Vector3(0, 0, 1),
            new Vector3(1, 0, 0),
            new Vector3(0, 1, 0),
          ),
        );
        const holder = new Group();
        holder.add(valve.group);
        placeFitting(holder, 'isolating-valve', place.at, place.along, [0, 1]);
        object.add(
          markComponent(holder, {
            name,
            model: { fitting: f.id },
            status: () => (open() ? 'its coil energised, open' : 'shut'),
          }),
        );
        let shown: boolean | null = null;
        updates.push(() => {
          if (open() !== shown) valve.setOpen((shown = open()));
        });
      } else {
        const valve = createDoseSolenoid(kit, { name });
        placeFitting(
          valve.object,
          'isolating-valve',
          place.at,
          place.along,
          [0, 1],
        );
        object.add(
          markComponent(valve.object, {
            name,
            model: { fitting: f.id },
            status: () => (open() ? 'its coil energised, open' : 'shut'),
          }),
        );
        // Worked from the desk only: its coil follows the dose.
        updates.push((delta) => {
          valve.set(open());
          valve.update(delta);
        });
      }
      continue;
    }
    if (f.kind === 'isolating-valve') {
      const id = f.id as keyof typeof pumpValves;
      const valve = createInlineFitting(
        kit,
        {
          kind: 'isolating-valve',
          medium: 'water',
          operator: 'hand',
          od: 0.11,
        },
        {
          open: () => pumpValves[id],
          set: (o) => (pumpValves[id] = o),
        },
      );
      placeFitting(
        valve.object,
        'isolating-valve',
        place.at,
        place.along,
        [0, 1],
      );
      object.add(
        markComponent(valve.object, {
          name,
          model: { fitting: f.id },
          status: () => (pumpValves[id] ? 'lever at OPEN' : 'lever at SHUT'),
        }),
      );
      for (const [o, use] of valve.uses) parts.uses.set(o, use);
      updates.push((delta) => {
        valve.update(delta);
      });
      continue;
    }
    const fitting = createInlineFitting(kit, {
      kind: f.kind as 'non-return-valve' | 'flowmeter',
      medium: 'water',
      operator: 'self',
      od: 0.11,
      tag: shortTag(f.id),
      upright: place.upright ?? false,
      role: 'FLOW',
      flow: () => (circulating() ? 167 : 0),
    });
    placeFitting(
      fitting.object,
      f.kind as 'flowmeter',
      place.at,
      place.along,
      [0, 1],
    );
    object.add(
      markComponent(fitting.object, {
        name,
        model: { fitting: f.id },
        ...(f.kind === 'flowmeter'
          ? { status: () => `shows ${circulating() ? 167 : 0} m³/h` }
          : {}),
      }),
    );
    updates.push((delta) => {
      fitting.update(delta);
    });
  }

  // The make-up's spout, turned down over the pool: a short wider nozzle.
  const spout = new Group();
  t.cyl(spout, t.paint('#4d5a63', 0.5), 0.042, 0.08, 0, 0.04, 0);
  spout.position.set(FRESH_SPOUT.x, FRESH_SPOUT.y, FRESH_SPOUT.z);
  if (!PIPES_DEFERRED)
    object.add(
      still(
        markComponent(spout, {
          name: `Pipe: ${LINK_NAMES['dose.fresh']} spout`,
          model: { link: 'dose.fresh' },
        }),
      ),
    );

  // ---- The desk, its mimic, the teleprinter, LAB TIME ----
  const tankIds = TANKS.map((x) => x.id);
  const desk = createDosingDesk(kit, {
    tanks: TANKS.map((x) => ({ code: x.code, short: x.short })),
    select: (k) => act({ type: 'select', tank: tankIds[k] }),
    selected: () =>
      state().selected ? tankIds.indexOf(state().selected!) : null,
    digit: (d) => digitOf(state().dial, d),
    wheel: (d, by) => act({ type: 'wheel', digit: d as 0 | 1 | 2 | 3, by }),
    dose: () => act({ type: 'dose' }),
    cancel: () => act({ type: 'cancel' }),
    dosing: () => state().delivering !== null,
    vfd: () => vfdLine(state()),
    group: () => act({ type: 'group' }),
    swimmers: {
      get value() {
        return SWIMMERS.indexOf(state().swimmers);
      },
      set: (p: number) =>
        act({
          type: 'swimmers',
          swimmers: SWIMMERS[Math.max(0, Math.min(2, p))],
        }),
    },
    // The TIME buttons are on the wall under LAB TIME (the owner, 2026-10-31).
    speeds: [],
    speed: () => session.clock.speed,
    setSpeed: () => {},
    card: () => state().card,
    cards: CARDS.length,
    stepCard: (by) => act({ type: 'card', by }),
    startCard: () => act({ type: 'start-card' }),
    cardTitle: () => CARDS[state().card].title,
  });
  turnTo(desk.group, DESK.x, 0, DESK.z, FACE_SOUTH);
  object.add(
    instrument(
      desk.group,
      'desk',
      'dosing desk (Penfold Controls)',
      () =>
        `its display reads “${vfdLine(state())}”; CHALLENGE at ${state().card + 1}`,
    ),
  );
  // Its TIME and CHALLENGE buttons are the exhibit's (the simulation's
  // speed and its challenge cards), not plant: decorative, as RESET is.
  desk.group.traverse((o) => {
    if (/^(TIME ×|CHALLENGE )/.test(o.name)) exhibitOnly(o);
  });
  for (const [o, use] of desk.parts.uses) parts.uses.set(o, use);
  take(desk.uses);
  updates.push(desk.update);

  const board = createMimicBoard(kit, HALL4_MIMIC, {
    maker: 'penfold',
    press: () => {},
    parts: {
      readout: (id) => ({
        kind: 'visible',
        label: `${hall4Reading(id, state())?.name ?? id} readout`,
        shows: () => {
          const r = mimicState.readouts[id]?.live;
          return r ? `${r.value.toFixed(r.places ?? 0)} ${r.unit}` : undefined;
        },
      }),
    },
  });
  turnTo(board.group, MIMIC_AT.x, MIMIC_AT.y, NORTH, FACE_SOUTH);
  board.group.userData.onWall = 'Hall 4 mimic board';
  // The mimic panel is in the model (M4-MP1), its lamps, readouts and
  // buttons bound through it.
  object.add(
    instrument(board.group, 'mimic', 'mimic panel (Penfold Controls)'),
  );
  take(board.parts.uses);

  const printer = teleprinterInMetres('M4-TP1 LAB LOG', 0.95);
  turnTo(printer.group, PRINTER.x, 0.95, PRINTER.z, FACE_SOUTH);
  // It stands on its own pedestal, down to the floor.
  object.add(printer.group);
  object.add(
    instrument(
      printer.group,
      'printer',
      'teleprinter, the lab’s log sheet',
      () => `last printed: ${state().log.at(-1) ?? ''}`,
    ),
  );
  const labTime = new Group();
  // On the archways' wall, centred between them, flush, below the hall's
  // title (the owner, 2026-10-31).
  turnTo(labTime, LAB_TIME.x, LAB_TIME.y, SOUTH - 0.025, Math.PI);
  labTime.userData.onWall = 'LAB TIME display';
  // Tall enough for its legend under the digits (it was cut off).
  t.box(labTime, t.paint('#1b2328', 0.5), 0.6, 0.3, 0.05, 0, 0, 0);
  const timeDigits = createSevenSegment(kit, 5, { digitHeight: 0.1 });
  timeDigits.group.position.set(0, 0.03, 0.027);
  labTime.add(timeDigits.group);
  t.label(
    labTime,
    `LAB TIME ${shortTag('labTime')}`,
    0,
    -0.11,
    0.027,
    0.025,
    '#f4f3ee',
  );
  object.add(
    markComponent(labTime, {
      name: `${TAGS['labTime']} LAB TIME display`,
      // The exhibit's own clock (the simulation's time), not plant.
      decorative: true,
      status: () => `shows ${clockShown} at TIME ×${session.clock.speed}`,
    }),
  );
  // The TIME buttons under it, a small flush panel at reach height:
  // exhibit controls (the simulation's speed), decorative.
  const timePanel = createTimePanel(kit, {
    speeds: SPEEDS,
    speed: () => session.clock.speed,
    setSpeed: (s) => {
      session = { ...session, clock: setSpeed(session.clock, s as TimeSpeed) };
    },
    ahead: () => state().seconds - sinceReset,
  });
  turnTo(timePanel.group, LAB_TIME.x, LAB_TIME.buttonsY, SOUTH, Math.PI);
  timePanel.group.userData.onWall = 'TIME panel';
  object.add(
    markComponent(timePanel.group, {
      name: 'TIME panel',
      decorative: true,
      status: () => `TIME ×${session.clock.speed} lit`,
    }),
  );
  timePanel.group.traverse((o) => {
    if (o.name === 'TIME selector') exhibitOnly(o);
  });
  take(timePanel.parts.uses);
  updates.push(timePanel.update);
  let clockShown = '';
  updates.push((delta) => {
    const s = state();
    const sec = Math.floor((s.start + s.seconds) % 86400);
    const two = (n: number) => String(n).padStart(2, '0');
    const text = `${two(Math.floor(sec / 3600))}.${two(Math.floor(sec / 60) % 60)}`;
    if (text !== clockShown) timeDigits.show((clockShown = text));
    // New lines onto the paper, a line at a time.
    const fresh = Math.min(s.printed - printedShown, s.log.length);
    for (const line of s.log.slice(s.log.length - fresh)) printer.record(line);
    printedShown = s.printed;
    printer.update(delta, false);
  });

  // ---- The dosing pot, the pump, the pool ----
  const pot = new Group();
  t.cyl(pot, t.paint('#d6d2c4', 0.4), POT.r, POT.h, 0, POT.h / 2, 0);
  t.label(pot, shortTag('pot'), 0, POT.h * 0.7, POT.r + 0.002, 0.04, '#16191b');
  turnTo(pot, POT.x, 0, POT.z, FACE_SOUTH);
  object.add(
    still(
      markComponent(pot, {
        name: `${TAGS['pot']} dosing pot`,
        model: { node: 'pot' },
      }),
    ),
  );
  const tee = new Group();
  t.cyl(tee, t.paint('#4d5a63', 0.5), 0.07, 0.16, 0, 0.2, 0);
  turnTo(tee, TEE.x, 0, TEE.z, FACE_SOUTH);
  object.add(
    still(
      markComponent(tee, {
        name: `${TAGS['injection']} injection point`,
        model: { node: 'injection' },
      }),
    ),
  );
  const pump = createEndSuctionPump(kit);
  turnTo(pump, PUMP.x, 0, PUMP.z, PUMP.yaw);
  object.add(
    markComponent(pump, {
      name: `${TAGS['pump']} circulation pump`,
      model: { node: 'pump' },
      status: () => (circulating() ? 'running' : 'running, nothing flowing'),
    }),
  );
  updates.push((delta) => {
    // Running against a shut valve: no flow, the suction pulled down or
    // the discharge up to the pump's shut-off head.
    pump.gauges.suction.set(pumpValves['pump.suction'] ? 0.1 : -0.6);
    pump.gauges.discharge.set(
      !pumpValves['pump.suction'] ? 0.3 : circulating() ? 1.6 : 2.4,
    );
    pump.gauges.suction.update(delta);
    pump.gauges.discharge.update(delta);
  });
  // Its sound: it always runs, as its gauges and status say.
  updates.push(heldPumpSound(pump, () => true));
  const pool = createIdealVessel(kit, {
    w: POOL.w,
    d: POOL.d,
    h: POOL.h,
    water: POOL.h - 0.15,
    name: 'Ideal pool',
    ports: [],
  });
  turnTo(pool.group, POOL.x, 0, POOL.z, FACE_SOUTH);
  // Its balancing tank (the model's pool includes its 30 m³), an ideal
  // vessel of its own, bound to the pool.
  const balanceTank = createIdealVessel(kit, {
    w: BALANCE_TANK.w,
    d: BALANCE_TANK.d,
    h: BALANCE_TANK.h,
    water: BALANCE_TANK.h - 0.2,
    name: 'Ideal balance tank',
    ports: [],
  });
  turnTo(balanceTank.group, BALANCE_TANK.x, 0, BALANCE_TANK.z, FACE_SOUTH);
  balanceTank.show(['BALANCE TANK'.padEnd(16), '30m3'.padEnd(16)]);
  object.add(
    markComponent(still(balanceTank.group), {
      name: `${TAGS['pool']} ideal pool's balancing tank (30 m³)`,
      model: { node: 'pool' },
    }),
  );
  object.add(
    markComponent(still(pool.group), {
      name: `${TAGS['pool']} ideal pool (25 × 12.5 m, 470 m³, with its 30 m³ tank)`,
      model: { node: 'pool' },
      status: () =>
        `its display shows free chlorine ${reading.fc.toFixed(2)}, pH ${reading.ph.toFixed(2)}`,
    }),
  );
  updates.push(() =>
    pool.show([
      `FC ${reading.fc.toFixed(2)} PH ${reading.ph.toFixed(2)}`.padEnd(16),
      `500m3 ${state().swimmers.toUpperCase()}`.padEnd(16),
    ]),
  );

  // ---- The readout board, on the east wall ----
  const readout = createReadoutBoard(
    kit,
    METERS.map((m) => ({
      id: m,
      tag: shortTag(`meter.${m}`),
      label: METER_LABEL[m],
      min: SCALE[m][0],
      max: SCALE[m][1],
      green: GREEN[m],
      places: METER_PLACES[m],
      ...(m === 'so4' ? { mark: { at: 360, text: 'GROUT' } } : {}),
    })),
  );
  turnTo(readout.group, EAST, READOUT.y, READOUT.z, FACE_WEST);
  readout.group.userData.onWall = 'Analyser readout board';
  readout.group.traverse((o) => (o.userData.live = true));
  object.add(
    markComponent(readout.group, {
      name: `${TAGS['analyser']} ideal analyser’s readout board`,
      model: { node: 'analyser' },
      status: () =>
        `reads free chlorine ${reading.fc.toFixed(2)}, combined ${reading.cc.toFixed(2)}, pH ${reading.ph.toFixed(2)}, alkalinity ${reading.ta.toFixed(0)}, hardness ${reading.ch.toFixed(0)}, sulphate ${reading.so4.toFixed(0)}, balance ${reading.lsi.toFixed(2)}`,
    }),
  );
  // One values record, refilled each frame rather than rebuilt (2026-10-29).
  const meterValues = Object.fromEntries(METERS.map((m) => [m, 0])) as Record<
    (typeof METERS)[number],
    number
  >;
  updates.push((delta) => {
    for (const m of METERS) meterValues[m] = meterValue(reading, m);
    readout.show(meterValues, delta);
  });

  // ---- The Balance Beam ----
  const beam = createBalanceBeam(kit, null);
  // Hung flush on the left wall, facing into the hall.
  turnTo(beam.group, BEAM.x, BEAM.y, BEAM.z, Math.PI / 2);
  beam.group.scale.set(BEAM_SCALE.x, BEAM_SCALE.y, BEAM_SCALE.z);
  // A backboard between its back panel and the wall, so it hangs flush.
  t.box(
    beam.group,
    t.paint('#2b3438', 0.5, 0.3),
    1.9,
    1.25,
    0.06,
    0,
    0.625,
    -0.22,
  );
  {
    const lectern = createLectern(kit, beamPlacard());
    turnTo(lectern, BEAM_LECTERN.x, 0, BEAM_LECTERN.z, BEAM_LECTERN.yaw);
    object.add(still(lectern));
  }
  beam.group.userData.onWall = 'Balance Beam';
  object.add(
    instrument(
      beam.group,
      'beam',
      'Balance Beam',
      () => `its pointer at ${reading.lsi.toFixed(2)}`,
    ),
  );
  updates.push((delta) =>
    beam.show(balanceTerms(state().bench.pool), reading.lsi, delta),
  );

  // ---- The cards board, RESET, the lecterns ----
  const cardsBoard = createWallPanel(
    kit,
    'Challenge cards',
    3.4,
    1.2,
    (c, w, h) => {
      c.fillStyle = '#f6f4ec';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#16232b';
      c.font = `bold ${h * 0.09}px Arial`;
      c.fillText('THE CHALLENGE CARDS', w * 0.02, h * 0.1);
      c.font = `${h * 0.05}px Arial`;
      c.fillText(
        'Choose a card on the desk (◄ ►), press START, put the water right and keep it so for an hour.',
        w * 0.02,
        h * 0.18,
        w * 0.96,
      );
      CARDS.forEach((card, k) => {
        const col = k < 6 ? 0 : 1;
        const row = k % 6;
        const x = w * (0.02 + col * 0.5);
        const y = h * (0.3 + row * 0.12);
        c.font = `bold ${h * 0.05}px Arial`;
        c.fillText(`${k + 1} ${card.title}`, x, y, w * 0.46);
        c.font = `${h * 0.037}px Arial`;
        c.fillText(`GOAL: ${card.goal}`, x, y + h * 0.045, w * 0.46);
      });
    },
  );
  turnTo(cardsBoard, CARDS_BOARD.x, CARDS_BOARD.y, NORTH, FACE_SOUTH);
  cardsBoard.userData.onWall = 'Challenge cards';
  object.add(still(cardsBoard));

  // No entrance panel (the owner, 2026-10-31): the desk invites the visitor.
  const root = new Group();
  root.name = 'Hall 4';
  root.add(object);
  const resetSign = createWallPanel(
    kit,
    'RESET sign',
    1.0,
    0.56,
    paintResetSign(RESET_SIGN),
  );
  // Its back flush to the wall behind the pedestal.
  // On a lectern just behind the pedestal, tilted toward the visitor at
  // RESET (the owner, 2026-10-31).
  const resetLectern = new Group();
  resetLectern.name = 'RESET sign lectern';
  const lecternFrame = t.paint('#2b3438', 0.5, 0.3);
  t.box(resetLectern, lecternFrame, 0.36, 0.03, 0.3, 0, 0.015, 0);
  t.box(resetLectern, lecternFrame, 0.07, 0.95, 0.07, 0, 0.475, 0);
  resetSign.position.set(0, 1.25, 0.03);
  resetSign.rotation.x = -0.45;
  resetLectern.add(resetSign);
  resetLectern.position.set(0, 0, -RESET_LECTERN_BACK);
  const resetButton = createResetPedestal(kit, {
    reset: () => reset(localNow()),
    lit: () => sinceReset < 2.5,
  });
  turnTo(resetButton.group, RESET.x, 0, RESET.z, FACE_SOUTH);
  resetButton.group.add(resetLectern);
  // The exhibit's RESET: it restarts the simulation, it works no plant.
  object.add(
    markComponent(resetButton.group, {
      name: 'RESET SIMULATION pedestal',
      decorative: true,
    }),
  );
  take(resetButton.parts.uses);
  updates.push(resetButton.update);

  for (const p of hall4Placards()) {
    const at = LECTERNS[p.station!];
    const lectern = createLectern(kit, p);
    turnTo(lectern, at.x, LECTERNS_PARKED ? PARKED_Y : 0, at.z, at.yaw);
    object.add(still(lectern));
  }

  function reset(now: number) {
    session = hallSession(HALL4_MODEL, now);
    reading = readWater(session.state.bench.pool);
    mimicDue = 0;
    sinceReset = 0;
    pumpValves['pump.suction'] = true;
    pumpValves['pump.discharge'] = true;
    // The sheet torn off: a fresh sheet's lines follow.
    printer.record('---------------- TORN OFF ----------------');
    printedShown = 0;
  }

  // Turned half round, along the south wall (layout C, `STANDS`).
  object.rotation.y = STANDS.turn;
  return {
    object: root,
    parts,
    status: () =>
      state().active ? `card ${state().card + 1} running` : 'at rest',
    solids: () => solids,
    reset,
    update(delta) {
      session = runSession(HALL4_MODEL, session, delta);
      sinceReset += delta;
      reading = readWater(session.state.bench.pool);
      mimicDue -= delta;
      if (mimicDue <= 0) {
        mimicState = hall4MimicState(session.state, false, circulating());
        mimicDue = 0.25;
      }
      board.parts.update(delta);
      board.show(mimicState);
      for (const u of updates) u(delta);
    },
  };
}

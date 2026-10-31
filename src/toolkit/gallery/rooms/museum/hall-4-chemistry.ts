import { Group } from "three";
import type { Object3D } from "three";
import type { PanelKit } from "../../../components/core/views/eighties-controls";
import { createSevenSegment } from "../../../components/core/views/eighties-controls";
import { createPartSet } from "../../../components/core/parts/parts";
import { createPipe } from "../../../components/core/views/pipe-kinds";
import { mergeTree } from "../../../components/core/views/merge-static";
import { markComponent } from "../../../components/core/views/component-identity";
import { tools } from "../../../components/core/views/fitting-tools";
import { createEndSuctionPump } from "../../../components/plant/views/pumps-plant";
import { createIdealVessel } from "../../../components/plant/views/ideal-vessel";
import { createMimicBoard } from "../../../components/industrial-control/views/mimic-board";
import { teleprinterInMetres } from "../../../components/industrial-control/views/teleprinter";
import {
  createBalanceBeam,
  createChemicalTank,
  createDosingDesk,
  createReadoutBoard,
} from "../../../components/plant/views/museum-chemistry-parts";
import {
  CARDS,
  DOSE_SECONDS,
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
} from "../../../../game/plant/museum-4-lab";
import type {
  Hall4Action,
  Hall4Readings,
} from "../../../../game/plant/museum-4-lab";
import {
  BEAM,
  CARDS_BOARD,
  DESK,
  EAST,
  ENTRANCE,
  FRESH_SPOUT,
  LECTERNS,
  MIMIC_AT,
  NORTH,
  POOL,
  POT,
  PRINTER,
  PUMP,
  READOUT,
  RESET,
  TANK_Z,
  BUND,
  INTERIOR,
  TEE,
  STANDS,
  placedFootprints,
  pipeRuns,
  tankX,
} from "../../logic/museum-4-layout";
import {
  HALL4_MIMIC,
  hall4MimicState,
  hall4Reading,
} from "../../logic/museum-4-mimic";
import {
  BEAM_PLAQUE,
  RESET_SIGN,
  hall4Entrance,
  hall4Placards,
} from "../../logic/museum-4-placards";
import {
  SPEEDS,
  hallSession,
  localNow,
  runSession,
  setSpeed,
} from "../../logic/museum-time";
import type { TimeSpeed } from "../../logic/museum-time";
import {
  createLectern,
  createResetPedestal,
  createWallPanel,
  heldPumpSound,
  paintEntrance,
  paintResetSign,
} from "../../views/museum-exhibit";
import type { MimicState } from "../../../components/industrial-control/logic/mimic";
import type { HallExhibit } from "./exhibits";

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
  const state = () => session.state;
  const act = (a: Hall4Action) => {
    session = { ...session, state: actOnHall4(session.state, a) };
    reading = readWater(session.state.bench.pool);
    mimicDue = 0;
  };

  const object = new Group();
  object.name = "Hall 4: The chemistry of pools";
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

  // ---- The tanks, on their bund ----
  t.box(
    object,
    t.paint("#7a8a8f", 0.7),
    BUND.maxX - BUND.minX,
    BUND.h,
    BUND.maxZ - BUND.minZ,
    (BUND.minX + BUND.maxX) / 2,
    BUND.h / 2,
    (BUND.minZ + BUND.maxZ) / 2,
  );
  for (const tank of TANKS) {
    const view = createChemicalTank(kit, {
      code: tank.code,
      product: tank.product,
      unit: tank.unit === "m3" ? "m³" : tank.unit,
      colour: tank.colour,
      hazards: tank.hazards,
    });
    turnTo(view.group, tankX(tank.id), BUND.h, TANK_Z, FACE_SOUTH);
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
  for (const run of pipeRuns()) {
    const chem = run.edge.startsWith("dose.") && run.edge !== "dose.fresh";
    const pipe = createPipe("pvc-pressure", run.od, run.points, {
      colour:
        chem || run.edge === "header" || run.edge === "injection"
          ? "#d9a521"
          : "#4d5a63",
    });
    object.add(
      markComponent(pipe, {
        name: `Pipe: ${LINK_NAMES[run.edge]}`,
        model: { link: run.edge },
      }),
    );
  }
  // The make-up's spout, turned down over the pool: a short wider nozzle.
  const spout = new Group();
  t.cyl(spout, t.paint("#4d5a63", 0.5), 0.042, 0.08, 0, 0.04, 0);
  spout.position.set(FRESH_SPOUT.x, FRESH_SPOUT.y, -6.0);
  object.add(
    still(
      markComponent(spout, {
        name: `Pipe: ${LINK_NAMES["dose.fresh"]} spout`,
        model: { link: "dose.fresh" },
      }),
    ),
  );

  // ---- The desk, its mimic, the teleprinter, LAB TIME ----
  const tankIds = TANKS.map((x) => x.id);
  const desk = createDosingDesk(kit, {
    tanks: TANKS.map((x) => ({ code: x.code, short: x.short })),
    select: (k) => act({ type: "select", tank: tankIds[k] }),
    selected: () =>
      state().selected ? tankIds.indexOf(state().selected!) : null,
    digit: (d) => digitOf(state().dial, d),
    wheel: (d, by) => act({ type: "wheel", digit: d as 0 | 1 | 2 | 3, by }),
    dose: () => act({ type: "dose" }),
    cancel: () => act({ type: "cancel" }),
    dosing: () => state().delivering !== null,
    vfd: () => vfdLine(state()),
    group: () => act({ type: "group" }),
    swimmers: {
      get value() {
        return SWIMMERS.indexOf(state().swimmers);
      },
      set: (p: number) =>
        act({
          type: "swimmers",
          swimmers: SWIMMERS[Math.max(0, Math.min(2, p))],
        }),
    },
    speeds: SPEEDS,
    speed: () => session.clock.speed,
    setSpeed: (s) => {
      session = { ...session, clock: setSpeed(session.clock, s as TimeSpeed) };
    },
    card: () => state().card,
    cards: CARDS.length,
    stepCard: (by) => act({ type: "card", by }),
    startCard: () => act({ type: "start-card" }),
    cardTitle: () => CARDS[state().card].title,
  });
  turnTo(desk.group, DESK.x, 0, DESK.z, FACE_SOUTH);
  object.add(
    markComponent(desk.group, {
      name: `${TAGS["desk"]} dosing desk (Penfold Controls)`,
      status: () =>
        `its display reads “${vfdLine(state())}”; CHALLENGE at ${state().card + 1}`,
    }),
  );
  for (const [o, use] of desk.parts.uses) parts.uses.set(o, use);
  take(desk.uses);
  updates.push(desk.update);

  const board = createMimicBoard(kit, HALL4_MIMIC, {
    maker: "penfold",
    press: () => {},
    parts: {
      readout: (id) => ({
        kind: "visible",
        label: `${hall4Reading(id, state())?.name ?? id} readout`,
        shows: () => {
          const r = mimicState.readouts[id]?.live;
          return r ? `${r.value.toFixed(r.places ?? 0)} ${r.unit}` : undefined;
        },
      }),
    },
  });
  turnTo(board.group, MIMIC_AT.x, MIMIC_AT.y, NORTH, FACE_SOUTH);
  board.group.userData.onWall = "Hall 4 mimic board";
  object.add(board.group);
  take(board.parts.uses);

  const printer = teleprinterInMetres("M4-TP1 LAB LOG", 0.95);
  turnTo(printer.group, PRINTER.x, 0.95, PRINTER.z, FACE_SOUTH);
  // It stands on its own pedestal, down to the floor.
  object.add(printer.group);
  object.add(
    markComponent(printer.group, {
      name: `${TAGS["printer"]} teleprinter, the lab’s log sheet`,
      status: () => `last printed: ${state().log.at(-1) ?? ""}`,
    }),
  );
  const labTime = new Group();
  turnTo(labTime, PRINTER.x, 2.0, PRINTER.z - 0.1, FACE_SOUTH);
  t.box(labTime, t.paint("#1b2328", 0.5), 0.6, 0.22, 0.05, 0, 0, 0);
  t.box(labTime, t.paint("#3d4a45", 0.6), 0.05, 0.6, 0.05, 0, -0.4, 0);
  const timeDigits = createSevenSegment(kit, 5, { digitHeight: 0.1 });
  timeDigits.group.position.set(0, 0.0, 0.027);
  labTime.add(timeDigits.group);
  t.label(
    labTime,
    `LAB TIME ${shortTag("labTime")}`,
    0,
    -0.085,
    0.027,
    0.025,
    "#f4f3ee",
  );
  object.add(
    markComponent(labTime, {
      name: `${TAGS["labTime"]} LAB TIME display`,
      status: () => `shows ${clockShown} at TIME ×${session.clock.speed}`,
    }),
  );
  let clockShown = "";
  updates.push((delta) => {
    const s = state();
    const sec = Math.floor((s.start + s.seconds) % 86400);
    const two = (n: number) => String(n).padStart(2, "0");
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
  t.cyl(pot, t.paint("#d6d2c4", 0.4), POT.r, POT.h, 0, POT.h / 2, 0);
  t.label(pot, shortTag("pot"), 0, POT.h * 0.7, POT.r + 0.002, 0.04, "#16191b");
  turnTo(pot, POT.x, 0, POT.z, FACE_SOUTH);
  object.add(
    still(
      markComponent(pot, {
        name: `${TAGS["pot"]} dosing pot`,
        model: { node: "pot" },
      }),
    ),
  );
  const tee = new Group();
  t.cyl(tee, t.paint("#4d5a63", 0.5), 0.07, 0.16, 0, 0.2, 0);
  turnTo(tee, TEE.x, 0, TEE.z, FACE_SOUTH);
  object.add(
    still(
      markComponent(tee, {
        name: `${TAGS["injection"]} injection point`,
        model: { node: "injection" },
      }),
    ),
  );
  const pump = createEndSuctionPump(kit);
  turnTo(pump, PUMP.x, 0, PUMP.z, FACE_WEST);
  object.add(
    markComponent(pump, {
      name: `${TAGS["pump"]} circulation pump`,
      model: { node: "pump" },
      status: () => "running",
    }),
  );
  updates.push((delta) => {
    pump.gauges.suction.set(0.1);
    pump.gauges.discharge.set(1.6);
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
    name: "Ideal pool",
    ports: [],
  });
  turnTo(pool.group, POOL.x, 0, POOL.z, FACE_SOUTH);
  object.add(
    markComponent(still(pool.group), {
      name: `${TAGS["pool"]} ideal pool (25 × 12.5 m, 470 m³, with its 30 m³ tank)`,
      model: { node: "pool" },
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
      ...(m === "so4" ? { mark: { at: 360, text: "GROUT" } } : {}),
    })),
  );
  turnTo(readout.group, EAST, READOUT.y, READOUT.z, FACE_WEST);
  readout.group.userData.onWall = "Analyser readout board";
  readout.group.traverse((o) => (o.userData.live = true));
  object.add(
    markComponent(readout.group, {
      name: `${TAGS["analyser"]} ideal analyser’s readout board`,
      model: { node: "analyser" },
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
  const beam = createBalanceBeam(kit, BEAM_PLAQUE);
  turnTo(beam.group, BEAM.x, 0, BEAM.z, FACE_SOUTH);
  object.add(
    markComponent(beam.group, {
      name: `${TAGS["beam"]} Balance Beam`,
      status: () => `its pointer at ${reading.lsi.toFixed(2)}`,
    }),
  );
  updates.push((delta) =>
    beam.show(balanceTerms(state().bench.pool), reading.lsi, delta),
  );

  // ---- The cards board, the entrance, RESET, the lecterns ----
  const cardsBoard = createWallPanel(
    kit,
    "Challenge cards",
    3.4,
    1.2,
    (c, w, h) => {
      c.fillStyle = "#f6f4ec";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#16232b";
      c.font = `bold ${h * 0.09}px Arial`;
      c.fillText("THE CHALLENGE CARDS", w * 0.02, h * 0.1);
      c.font = `${h * 0.05}px Arial`;
      c.fillText(
        "Choose a card on the desk (◄ ►), press START, put the water right and keep it so for an hour.",
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
  cardsBoard.userData.onWall = "Challenge cards";
  object.add(still(cardsBoard));

  const entrance = createWallPanel(
    kit,
    "Entrance panel",
    1.9,
    1.5,
    paintEntrance(hall4Entrance(), "Hall 4 · The chemistry of pools"),
  );
  // On the north wall as the hall stands, beside the arrival archway,
  // facing into the hall: it belongs to the archways, outside the turn.
  turnTo(entrance, ENTRANCE.x, ENTRANCE.y, INTERIOR.minZ, FACE_SOUTH);
  entrance.userData.onWall = "Entrance panel";
  const root = new Group();
  root.name = "Hall 4";
  root.add(object, still(entrance));
  const resetSign = createWallPanel(
    kit,
    "RESET sign",
    1.0,
    0.56,
    paintResetSign(RESET_SIGN),
  );
  resetSign.position.set(0, 1.55, -0.12);
  const resetButton = createResetPedestal(kit, {
    reset: () => reset(localNow()),
    lit: () => sinceReset < 2.5,
  });
  turnTo(resetButton.group, RESET.x, 0, RESET.z, FACE_SOUTH);
  resetButton.group.add(resetSign);
  object.add(resetButton.group);
  take(resetButton.parts.uses);
  updates.push(resetButton.update);

  for (const p of hall4Placards()) {
    const at = LECTERNS[p.station!];
    const lectern = createLectern(kit, p);
    turnTo(lectern, at.x, 0, at.z, FACE_SOUTH);
    object.add(still(lectern));
  }

  function reset(now: number) {
    session = hallSession(HALL4_MODEL, now);
    reading = readWater(session.state.bench.pool);
    mimicDue = 0;
    sinceReset = 0;
    // The sheet torn off: a fresh sheet's lines follow.
    printer.record("---------------- TORN OFF ----------------");
    printedShown = 0;
  }

  // Turned half round, along the south wall (layout C, `STANDS`).
  object.rotation.y = STANDS.turn;
  return {
    object: root,
    parts,
    status: () =>
      state().active ? `card ${state().card + 1} running` : "at rest",
    solids: () => solids,
    reset,
    update(delta) {
      session = runSession(HALL4_MODEL, session, delta);
      sinceReset += delta;
      reading = readWater(session.state.bench.pool);
      mimicDue -= delta;
      if (mimicDue <= 0) {
        mimicState = hall4MimicState(session.state);
        mimicDue = 0.25;
      }
      board.parts.update(delta);
      board.show(mimicState);
      for (const u of updates) u(delta);
    },
  };
}

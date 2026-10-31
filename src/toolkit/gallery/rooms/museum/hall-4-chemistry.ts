import { Group, Matrix4, Vector2, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createPartSet } from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import { mergeTree } from '../../../components/core/views/merge-static';
import { markComponent } from '../../../components/core/views/component-identity';
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
import {
  createBalanceBeam,
  createChemicalTank,
  createReadoutBoard,
} from '../../../components/plant/views/museum-chemistry-parts';
import {
  DOSE_SECONDS,
  FITTINGS,
  GREEN,
  LINK_NAMES,
  METERS,
  METER_LABEL,
  METER_PLACES,
  SCALE,
  TAGS,
  TANKS,
  balanceTerms,
  meterValue,
  readWater,
  shortTag,
} from '../../../../game/plant/museum-4-lab';
import type {
  Hall4Readings,
  Hall4State,
} from '../../../../game/plant/museum-4-lab';
import { CHALLENGES } from '../../../../game/plant/museum-4-cards';
import {
  cardWords,
  canDose,
  doseGame,
  dosesLeft,
  newGame,
  resetGame,
  scenarioView,
  startCard,
  stepGame,
  toFreePlay,
} from '../../../../game/plant/museum-4-challenge';
import type {
  Hall4Game,
  NarrationKind,
} from '../../../../game/plant/museum-4-challenge';
import { touchPoint } from '../../../controls/input/touch-point';
import { createConsoleSounds } from '../../views/console-sounds';
import { CELEBRATION_SECONDS } from '../../logic/console-celebration';
import { CONSOLE, createDosingConsole } from '../../views/dosing-console';
import {
  BALANCE_TANK,
  BEAM,
  BEAM_LECTERN,
  BEAM_SCALE,
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
  PUMP,
  READOUT,
  SOUTH,
  PLAQUE,
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
  CARD_NARRATION,
  beamPlacard,
  hall4Placards,
} from '../../logic/museum-4-placards';
import { localNow } from '../../logic/museum-time';
import {
  createLectern,
  createWallPanel,
  heldPumpSound,
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

/** Real seconds a dosed tank's valve and lamps show open after DOSE. */
const DOSE_SHOWN = 1.5;
/** Real seconds a narration's words stay on the scenario screen. */
const CAPTION_SECONDS = 20;

/**
 * The hook for each challenge card's narration clip (TODO.md: a clip per
 * scenario, played when the challenge starts): no clips yet, so nothing
 * plays; an empty id is no clip.
 */
const narrate = (clip: string) => {
  void clip;
};

const turnTo = (o: Object3D, x: number, y: number, z: number, yaw: number) => {
  o.position.set(x, y, z);
  o.rotation.y = yaw;
  return o;
};

export function buildHallExhibit(kit: PanelKit): HallExhibit {
  // The hall's game (mission 113): free play or a challenge card, at a
  // fixed 1,000×, around the lab's own state.
  let game: Hall4Game = newGame(localNow());
  let reading: Hall4Readings = readWater(game.lab.bench.pool);
  let mimicState: MimicState = hall4MimicState(game.lab);
  let mimicDue = 0;
  let caption: { kind: NarrationKind; text: string } | null = null;
  let captionLeft = 0;
  let seenSeq = 0;
  // The pump's lever valves, worked by hand: shut either and nothing
  // circulates (the flowmeter, the pump's gauges and the mimic say so).
  const pumpValves = { 'pump.suction': true, 'pump.discharge': true };
  const circulating = () =>
    pumpValves['pump.suction'] && pumpValves['pump.discharge'];
  /**
   * The lab as the hall shows it: a dose goes in at once, so its tank's
   * valve and lamps are shown open for `DOSE_SHOWN` real seconds after
   * DOSE, as a delivery (four lab seconds are four real milliseconds).
   */
  const state = (): Hall4State => {
    const d = game.lastDosed;
    return d && d.ago < DOSE_SHOWN
      ? {
          ...game.lab,
          delivering: {
            tank: d.tank,
            amount: 0,
            left: DOSE_SECONDS * (1 - d.ago / DOSE_SHOWN),
          },
        }
      : game.lab;
  };
  const changed = () => {
    reading = readWater(game.lab.bench.pool);
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
      name: tank.name,
      formula: tank.formula,
      strength: tank.strength,
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

  // ---- The dosing console and the mimic ----
  // Mission 113: three Aero touch screens and DOSE, in place of the old
  // desk, front and centre before the tanks (the owner, 2026-10-31).
  // The console's Aero sounds, from the console (`logic/console-sounds`).
  const sounds = createConsoleSounds(() => desk.group);
  const desk = createDosingConsole(kit, {
    sound: sounds.play,
    titles: CHALLENGES.map((c) => c.title),
    scenario: () => scenarioView(game),
    caption: () => caption,
    left: () => (game.card ? dosesLeft(game) : null),
    ready: () => canDose(game),
    effect: (e) => {
      if (e.type === 'start')
        game = startCard(game, CHALLENGES[e.card], e.level);
      else if (e.type === 'reset') game = resetGame(game);
      else if (e.type === 'retry' && game.card)
        game = startCard(game, game.card, game.level);
      else game = toFreePlay(game);
      changed();
    },
    dose: (tank, size) => {
      if (!canDose(game)) return false;
      game = doseGame(game, tank, size);
      changed();
      return true;
    },
  });
  turnTo(desk.group, DESK.x, 0, DESK.z, FACE_SOUTH);
  object.add(
    instrument(
      desk.group,
      'desk',
      'dosing console (Penfold Controls; ClearDose Studio by Aqualis)',
      () =>
        game.card
          ? `${game.card.title}: ${game.used} of par ${game.card.pars[game.level]} used`
          : 'free play',
    ),
  );
  // Each touchable answers a use with where it was touched (`touchPoint`).
  for (const o of desk.touchables)
    parts.uses.set(o, () => {
      const at = touchPoint(o);
      desk.touch(
        o,
        at && !Number.isNaN(at.u) ? new Vector2(at.u, at.v) : undefined,
      );
    });
  updates.push(desk.update);
  // For checks and screenshots: `hall4Console.press('reset')`, as dev57's.
  if (typeof window !== 'undefined')
    Object.assign(window, { hall4Console: desk });

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

  // The 1,000× plaque where LAB TIME hung (mission 113): words, decorative.
  const plaque = createWallPanel(kit, '1,000× plaque', 1.1, 0.32, (c, w, h) => {
    c.fillStyle = '#b8955a';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#6d5124';
    c.lineWidth = h * 0.04;
    c.strokeRect(h * 0.04, h * 0.04, w - h * 0.08, h - h * 0.08);
    c.fillStyle = '#2a1d0a';
    c.font = `bold ${h * 0.15}px Georgia, serif`;
    c.textAlign = 'center';
    c.fillText(
      'This laboratory runs 1,000 times faster than real life:',
      w / 2,
      h * 0.36,
      w * 0.92,
    );
    c.fillText(
      'an hour passes in under four seconds, to make life bearable.',
      w / 2,
      h * 0.68,
      w * 0.92,
    );
  });
  turnTo(plaque, PLAQUE.x, PLAQUE.y, SOUTH, Math.PI);
  plaque.userData.onWall = '1,000× plaque';
  object.add(
    still(markComponent(plaque, { name: '1,000× plaque', decorative: true })),
  );

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
    0.9,
    0.06,
    0,
    0.8,
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
    2.0,
    0.7,
    (c, w, h) => {
      c.fillStyle = '#f6f4ec';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#16232b';
      c.font = `bold ${h * 0.09}px Arial`;
      c.fillText('THE CHALLENGE CARDS', w * 0.02, h * 0.1);
      c.font = `${h * 0.05}px Arial`;
      c.fillText(
        'Choose a card on the console’s left screen, JOURNEYMAN or POOL PRO, press START; put the water right within par and keep it so for an hour.',
        w * 0.02,
        h * 0.18,
        w * 0.96,
      );
      CHALLENGES.forEach((card, k) => {
        const col = k < 4 ? 0 : 1;
        const row = k % 4;
        const x = w * (0.02 + col * 0.5);
        const y = h * (0.32 + row * 0.17);
        c.font = `bold ${h * 0.05}px Arial`;
        c.fillText(
          `${k + 1} ${card.title}  (par ${card.pars.journeyman} · ${card.pars.pro})`,
          x,
          y,
          w * 0.46,
        );
        c.font = `${h * 0.037}px Arial`;
        c.fillText(card.goal, x, y + h * 0.05, w * 0.46);
      });
    },
  );
  // On the console's pedestal front, sized to fit it (the owner, 2026-10-31):
  // its middle, its back on the pedestal's face (`dosing-console.ts`).
  const CARDS_ON_CONSOLE = { y: 0.08 + (CONSOLE.h - 0.1) / 2, z: 0.1 };
  cardsBoard.position.set(0, CARDS_ON_CONSOLE.y, CARDS_ON_CONSOLE.z);
  desk.group.add(still(cardsBoard));

  // No entrance panel (the owner, 2026-10-31): the desk invites the visitor.
  const root = new Group();
  root.name = 'Hall 4';
  root.add(object);
  for (const p of hall4Placards()) {
    const at = LECTERNS[p.station!];
    const lectern = createLectern(kit, p);
    turnTo(lectern, at.x, LECTERNS_PARKED ? PARKED_Y : 0, at.z, at.yaw);
    object.add(still(lectern));
  }

  function reset(now: number) {
    game = newGame(now);
    changed();
    caption = null;
    pumpValves['pump.suction'] = true;
    pumpValves['pump.discharge'] = true;
  }

  // Turned half round, along the south wall (layout C, `STANDS`).
  object.rotation.y = STANDS.turn;
  return {
    object: root,
    parts,
    status: () => (game.card ? `${game.card.title} running` : 'free play'),
    solids: () => solids,
    reset,
    update(delta) {
      game = stepGame(game, delta);
      sounds.watch(game);
      // A narration fired: its clip, and its words on the scenario screen.
      const n = game.narration;
      if (n && n.seq !== seenSeq && game.card) {
        seenSeq = n.seq;
        caption = {
          kind: n.kind,
          text: cardWords(game.card, n.kind, game.level),
        };
        // The explanation waits under the celebration, then shows its full time.
        captionLeft =
          CAPTION_SECONDS +
          (n.kind === 'explanation' ? CELEBRATION_SECONDS.won : 0);
        narrate(
          CARD_NARRATION[game.card.id]?.[
            n.kind === 'briefing' && game.level === 'pro'
              ? 'briefingPro'
              : n.kind
          ] ?? '',
        );
      }
      captionLeft -= delta;
      if (!game.card || captionLeft <= 0) caption = null;
      reading = readWater(game.lab.bench.pool);
      mimicDue -= delta;
      if (mimicDue <= 0) {
        mimicState = hall4MimicState(state(), false, circulating());
        mimicDue = 0.25;
      }
      board.parts.update(delta);
      board.show(mimicState);
      for (const u of updates) u(delta);
    },
  };
}

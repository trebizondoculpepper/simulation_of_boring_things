import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vite-plus/test';
import { advance, appealOf, newWorld, WORLD_VERSION } from '../src/game/world';
import type { World } from '../src/game/world';
import { POOL_IDS, POOL_TARGET } from '../src/game/plant/pools';
import { plantReadingOf } from '../src/toolkit/gallery/logic/world-reading';
import { wetHallAlarms } from '../src/game/plant/wet-hall';
import { olympicFlowsOf } from '../src/game/plant/olympic-battery';

/** Read-only research, not a health verdict. See prompt 067 for the contract to implement. */
it.skipIf(process.env.AUDIT_HEALTHY_START !== '1')(
  'records the current new-game trajectory for healthy-start research',
  () => {
    const checkpoints = [
      0, 0.1, 1, 60, 600, 3600, 28800, 32400, 43200, 75600, 86400,
    ];
    const firstAlarms = new Map<string, number>();
    const observe = (w: World) => {
      for (const id of POOL_IDS)
        for (const alarm of plantReadingOf(w, id).alarms) {
          const key = `${id}:${alarm}`;
          if (!firstAlarms.has(key)) firstAlarms.set(key, w.time);
        }
    };
    let world = newWorld();
    const initial = world;
    const samples = [];
    observe(world);
    for (const seconds of checkpoints) {
      world = advance(
        world,
        seconds - world.time,
        seconds <= 3600 ? 1 : 10,
        (_before, after) => observe(after),
      );
      samples.push({
        seconds,
        pools: Object.fromEntries(
          POOL_IDS.map((id) => [
            id,
            {
              ...world.pools[id],
              target: POOL_TARGET[id],
              alarms: plantReadingOf(world, id).alarms,
              treatment: {
                uv: plantReadingOf(world, id).uvOn,
                dosing: plantReadingOf(world, id).dosing,
              },
            },
          ]),
        ),
        bathers: world.bathers,
        appeal: appealOf(world),
        plant: world.plant,
        gas: world.gas,
        lighting: world.lighting,
        startup: world.startup,
        chemicals: world.chemicals,
        wetHall: { ...world.wetHall, alarms: wetHallAlarms(world.wetHall) },
        motors: world.motors,
        jacuzziCabinet: world.jacuzziCabinet,
        olympicTank: world.olympicTank,
        olympicFlow: olympicFlowsOf(world).toPool,
        airHandling: world.airHandling,
        boilerGas: world.boilerGas,
      });
    }
    const report = {
      recordedAt: new Date().toISOString(),
      commit: execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim(),
      workingTree: execFileSync('git', ['status', '--porcelain'], {
        encoding: 'utf8',
      }).trim(),
      worldVersion: WORLD_VERSION,
      method:
        'newWorld without player input; steps <=1 s through 1 h, <=10 s thereafter; observations every step',
      scope:
        'Current model and plantReadingOf only; an empty alarm list is not a whole-facility health verdict.',
      initial,
      firstAlarms: Object.fromEntries(firstAlarms),
      samples,
    };
    const dir = new URL('../build/research/', import.meta.url);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      new URL('healthy-start.json', dir),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(
      'Healthy-start observations: build/research/healthy-start.json',
    );
    console.log(JSON.stringify(report.firstAlarms));
  },
  60_000,
);

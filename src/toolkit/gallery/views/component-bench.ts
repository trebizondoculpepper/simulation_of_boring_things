import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Group,
  Mesh,
  PerspectiveCamera,
  Scene,
  Texture,
  Vector3,
} from 'three';
import type { Material, Object3D, WebGLRenderer } from 'three';
import { createRenderer } from '../../components/core/parts/render-style';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { clockStopped, paused } from '../../controls/logic/paused';
import { roomWorld } from '../../save/world-store';
import { EQUIPPED_ROOMS, layoutRoom } from '../logic/room-equipment';
import type { Item } from '../logic/room-equipment';
import {
  BUSY_ROOMS,
  DEFAULT_BUDGET,
  budgetVerdict,
  consoleRows,
  medianOf,
  starved,
  countUsage,
  rankSamples,
  rankedTable,
  textureBytes,
  uploadSize,
  uploadTexels,
  uploadsBySize,
} from '../logic/component-bench';
import type {
  BenchSample,
  BenchSource,
  PhaseStats,
  Ranked,
  Usage,
} from '../logic/component-bench';
import { MODELS, buildRoomItem } from './room-equipment';
import { isLive } from '../rooms/plant/exhibit';
import type { LiveExhibit, PlantExhibit } from '../rooms/plant/exhibit';
import type { TestFitting } from '../rooms/test-boards';
import { createCircularChartRecorder } from '../../components/industrial-control/views/period-instruments';
import { createChartRecorder } from '../../components/industrial-control/views/cabinet-fittings';
import { createWashOTron } from '../../components/plant/views/wash-o-tron';
import { filterValves } from '../../../game/plant/wash-o-tron-world';
import { WET_HALL_PLANT } from '../../../game/plant/wet-hall';

/**
 * The component benchmark (mission 094, `doc/prompts/094-slowest-components.md`),
 * development only, at `bench.html?bench=components&slot=bench094`: every
 * component kind the rooms use, built one at a time in a scene of its own,
 * measured with the world frozen (idle: nothing it shows changes) and
 * running (active), and ranked by its cost where used
 * (`logic/component-bench.ts`). The table is printed to the console and
 * shown on the page as Markdown for `doc/reports/`.
 *
 * URL options: `secs` (each phase's seconds, default 1.2), `only` (a
 * regular expression over the components' ids and labels), `limit` (the
 * first n candidates).
 */

/** One thing to benchmark: how to build it, and how it is driven each frame. */
interface Candidate {
  id: string;
  label: string;
  source: BenchSource;
  room?: string;
  build(kit: PanelKit): Built;
}

interface Built {
  object: Object3D;
  update?(delta: number): void;
  dispose?(): void;
}

const fromExhibit = (built: Object3D | LiveExhibit): Built =>
  isLive(built)
    ? {
        object: built.object,
        update: (delta) => {
          built.parts?.update(delta);
          built.update?.(delta);
        },
        dispose: () => {
          built.dispose?.();
          built.parts?.dispose();
        },
      }
    : { object: built };

const fromFitting = (fitting: TestFitting): Built => {
  let seconds = 0;
  return {
    object: fitting.group,
    update: (delta) => {
      seconds += delta;
      fitting.update(seconds, delta, false);
    },
    dispose: () => fitting.dispose(),
  };
};

/** The development rooms whose exhibits are benchmarked (their component rooms). */
const EXHIBIT_MODULES: Record<
  string,
  () => Promise<{ EXHIBITS: readonly PlantExhibit[] }>
> = {
  dev_pumps: () => import('../rooms/plant/pumps'),
  dev_balance: () => import('../rooms/plant/balance'),
  dev_chemicals: () => import('../rooms/plant/chemicals'),
  dev_dosing: () => import('../rooms/plant/dosing'),
  dev_boiler: () => import('../rooms/plant/boiler'),
  dev_air: () => import('../rooms/plant/air'),
  dev_electrical: () => import('../rooms/plant/electrical'),
  dev_control: () => import('../rooms/plant/control'),
  dev_ozone: () => import('../rooms/plant/ozone'),
  dev10: () => import('../rooms/plant/services'),
  dev12: () => import('../rooms/plant/pool-fittings'),
  dev38: () => import('../rooms/plant/jacuzzi-cabinet-trial'),
  dev39: () => import('../rooms/plant/control-assemblies'),
  dev43: () => import('../rooms/plant/loading-gallery'),
  dev44: () => import('../rooms/plant/chemical-handling'),
  dev47: () => import('../rooms/plant/touch-panels'),
  dev48: () => import('../rooms/plant/touch-panels-plant'),
  dev49: () => import('../rooms/plant/station-schematics'),
};

/** Every room's placed item keys, and the first of each key with its room. */
function roomItems() {
  const rooms: { room: string; keys: string[] }[] = [];
  const first = new Map<string, { item: Item; room: string }>();
  for (const room of EQUIPPED_ROOMS) {
    const placed = layoutRoom(room)?.placed ?? [];
    rooms.push({ room, keys: placed.map((p) => p.item.key) });
    for (const p of placed)
      if (!first.has(p.item.key)) first.set(p.item.key, { item: p.item, room });
  }
  return { rooms, first };
}

async function candidates(usage: Map<string, Usage>): Promise<Candidate[]> {
  const list: Candidate[] = [];
  const { first } = roomItems();
  // The rooms' machines, each built as its first room builds it.
  for (const [key, { item, room }] of first)
    list.push({
      id: key,
      label: `${key} · ${item.label}`,
      source: 'room',
      room,
      build: (kit) => {
        const built = buildRoomItem(kit, item, room);
        if (!built) throw new Error('nothing built');
        return fromExhibit(built);
      },
    });
  // The Olympic plant room's Wash-O-Tron, built beside its machines.
  usage.set('part:wash-o-tron', {
    count: 1,
    busy: 1,
    rooms: ['plant_pool_02'],
  });
  list.push({
    id: 'part:wash-o-tron',
    label: 'Wash-O-Tron filter wash controller',
    source: 'part',
    room: 'plant_pool_02',
    build: (kit) => {
      const store = roomWorld();
      const wot = createWashOTron(kit, {
        state: () => store.world.value.washOTron,
        time: () => store.world.value.time,
        valves: (n) => filterValves(store.world.value.installedValves, n),
        pitShare: () =>
          store.world.value.wetHall.backwashTank / WET_HALL_PLANT.backwashTank,
        act: (action) => store.dispatch({ type: 'wash-o-tron', action }),
      });
      return {
        object: wot.group,
        update: (d) => {
          wot.parts.update(d);
          wot.update(d);
        },
        dispose: () => wot.dispose(),
      };
    },
  });
  // The control room's recorders, one instrument at a time, as the chart
  // recorders panel drives them (inside 'chart-recorders').
  const panels = usage.get('chart-recorders');
  if (panels) {
    usage.set('part:circular-chart', { ...panels });
    usage.set('part:strip-chart', {
      count: panels.count * 2,
      busy: panels.busy * 2,
      rooms: panels.rooms,
    });
  }
  const swing = (t: number) => [
    0.5 + 0.2 * Math.sin(t / 7),
    0.4 + 0.1 * Math.cos(t / 11),
    0.6,
  ];
  list.push({
    id: 'part:circular-chart',
    label: 'Circular chart recorder (inside chart-recorders)',
    source: 'part',
    build: (kit) => {
      const chart = createCircularChartRecorder(kit, { rate: 1 / 3600 });
      let t = 0;
      return {
        object: chart.group,
        update: (d) => {
          t += clockStopped.value ? 0 : d;
          chart.set(swing(t));
          chart.update(d);
        },
      };
    },
  });
  list.push({
    id: 'part:strip-chart',
    label: 'Strip chart recorder (inside chart-recorders)',
    source: 'part',
    build: (kit) => {
      const chart = createChartRecorder(kit, {});
      let t = 0;
      return {
        object: chart.group,
        update: (d) => {
          t += clockStopped.value ? 0 : d;
          chart.set(swing(t));
          chart.update(d);
        },
      };
    },
  });
  // The development rooms' exhibits the rooms do not already use.
  const usedModels = new Set(
    [...first.keys()]
      .map((key) => MODELS[key.split(':')[0]])
      .filter((e): e is PlantExhibit => !!e),
  );
  for (const [room, load] of Object.entries(EXHIBIT_MODULES)) {
    const { EXHIBITS } = await load();
    for (const exhibit of EXHIBITS) {
      if (usedModels.has(exhibit)) continue;
      list.push({
        id: `exhibit:${room}:${exhibit.title}`,
        label: `${room} · ${exhibit.title}`,
        source: 'exhibit',
        build: (kit) => fromExhibit(exhibit.build(kit)),
      });
    }
  }
  // Dev0's boards and plinths.
  const boards = await import('../rooms/test-boards');
  const { createRearFittingsBoard } =
    await import('../rooms/rear-fittings-board');
  const { createBusbarLineDemo } = await import('../rooms/busbar-line-demo');
  const { createMachineGallery } = await import('../rooms/machine-gallery');
  const { createPlantPlinths } = await import('../rooms/plant-gallery');
  const single: [string, (kit: PanelKit) => TestFitting][] = [
    ['controls', boards.createControlsBoard],
    ['studio', boards.createStudioBoard],
    ['displays', boards.createDisplaysBoard],
    ['cabinet fittings', boards.createCabinetBoard],
    ['period instruments', boards.createPeriodBoard],
    ['mimic test', boards.createMimicTestBoard],
    ['gauges', boards.createGaugeTestBoard],
    ['boiler controls', boards.createBoilerControlsBoard],
    ['small controls', boards.createSmallControlsBoard],
    ['tri-state', boards.createTriStateBoard],
    ['swing handle', boards.createSwingHandleBoard],
    ['changeover handle', boards.createChangeoverHandleBoard],
    ['wet controls', boards.createWetControlsBoard],
    ['character LCD', boards.createCharacterLcdBoard],
    ['rear fittings', createRearFittingsBoard],
    ['busbar line', createBusbarLineDemo],
  ];
  for (const [name, make] of single)
    list.push({
      id: `board:${name}`,
      label: `dev0 · ${name} board`,
      source: 'board',
      build: (kit) => fromFitting(make(kit)),
    });
  // The plinths come as a set: each built alone, the rest of its set disposed.
  const plinths: [string, (kit: PanelKit) => TestFitting[]][] = [
    ['machine plinth', createMachineGallery],
    ['plant plinth', createPlantPlinths],
  ];
  for (const [name, make] of plinths) {
    const probe = createPanelKit();
    const count = make(probe).length;
    for (let i = 0; i < count; i++)
      list.push({
        id: `board:${name} ${i + 1}`,
        label: `dev0 · ${name} ${i + 1}`,
        source: 'board',
        build: (kit) => {
          const all = make(kit);
          all.forEach((f, j) => j !== i && f.dispose());
          const fitting = fromFitting(all[i]);
          const name = all[i].group.name || all[i].group.children[0]?.name;
          if (name) fitting.object.name = name;
          return fitting;
        },
      });
  }
  return list;
}

/** Counters for WebGL uploads and canvas 2D drawing, wrapped round both. */
function instrument(renderer: WebGLRenderer) {
  const counts = {
    uploads: 0,
    texels: 0,
    ops2d: 0,
    mipmaps: 0,
    /** Level 0 uploads by texture size, `width×height`. */
    sizes: new Map<string, number>(),
  };
  const gl = renderer.getContext() as WebGL2RenderingContext;
  for (const method of ['texImage2D', 'texSubImage2D'] as const) {
    const original = gl[method].bind(gl) as (...a: unknown[]) => void;
    (gl as unknown as Record<string, unknown>)[method] = (
      ...args: unknown[]
    ) => {
      if (args[1] === 0) {
        counts.uploads += 1;
        const size = uploadSize(method, args);
        counts.sizes.set(size, (counts.sizes.get(size) ?? 0) + 1);
      }
      counts.texels += uploadTexels(method, args);
      original(...args);
    };
  }
  const mip = gl.generateMipmap.bind(gl);
  gl.generateMipmap = (target: number) => {
    counts.mipmaps += 1;
    mip(target);
  };
  const proto = CanvasRenderingContext2D.prototype as unknown as Record<
    string,
    (...a: unknown[]) => unknown
  >;
  for (const name of [
    'fillRect',
    'strokeRect',
    'clearRect',
    'fillText',
    'strokeText',
    'fill',
    'stroke',
    'drawImage',
    'putImageData',
  ]) {
    const original = proto[name];
    proto[name] = function (this: unknown, ...args: unknown[]) {
      counts.ops2d += 1;
      return original.apply(this, args);
    };
  }
  return counts;
}

/** Its distinct materials and textures, and the textures' bytes. */
function resources(object: Object3D) {
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  object.traverse((o) => {
    const m = (o as Mesh).material as Material | Material[] | undefined;
    if (!m) return;
    for (const material of Array.isArray(m) ? m : [m]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof Texture) textures.add(value);
      const uniforms = (
        material as { uniforms?: Record<string, { value: unknown }> }
      ).uniforms;
      for (const u of Object.values(uniforms ?? {}))
        if (u?.value instanceof Texture) textures.add(u.value);
    }
  });
  let bytes = 0;
  for (const t of textures) {
    const image = t.image as { width?: number; height?: number } | undefined;
    if (image?.width && image.height)
      bytes += textureBytes(image.width, image.height, t.generateMipmaps);
  }
  return { materials, textures, bytes };
}

function disposeAll(object: Object3D, kit: PanelKit) {
  const { materials, textures } = resources(object);
  object.traverse((o) => (o as Mesh).geometry?.dispose());
  for (const m of [...materials, ...kit.materials]) m.dispose();
  for (const t of [...textures, ...kit.textures]) t.dispose();
}

const nextFrame = () =>
  new Promise<number>((resolve) => requestAnimationFrame(resolve));

/** Run the benchmark, filling `root` with its progress and its report. */
export async function runComponentBench(root: HTMLElement) {
  const params = new URLSearchParams(location.search);
  const secs = Number(params.get('secs') ?? 1.2) || 1.2;
  const only = params.get('only') ? new RegExp(params.get('only')!, 'i') : null;
  const limit = Number(params.get('limit') ?? Infinity) || Infinity;

  const status = document.createElement('p');
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  Object.assign(canvas.style, { width: '800px', height: '600px' });
  const output = document.createElement('textarea');
  Object.assign(output.style, {
    width: '100%',
    height: '24em',
    font: '11px monospace',
  });
  root.append(status, canvas, output);

  const renderer = createRenderer(canvas);
  renderer.setPixelRatio(1);
  renderer.setSize(800, 600, false);
  renderer.setClearColor('#30343a');
  const counts = instrument(renderer);
  const scene = new Scene();
  scene.add(new AmbientLight('#ffffff', 0.9));
  const sun = new DirectionalLight('#ffffff', 1.6);
  sun.position.set(2, 4, 5);
  scene.add(sun);
  const camera = new PerspectiveCamera(45, 4 / 3, 0.01, 200);
  const holder = new Group();
  scene.add(holder);

  paused.value = false;
  clockStopped.value = false;
  // The world, opened before anything is timed (its catch-up done).
  console.info(`component bench: world at ${roomWorld().world.value.time} s`);

  const { rooms } = roomItems();
  const usage = countUsage(rooms);
  let list = await candidates(usage);
  if (only) list = list.filter((c) => only.test(c.id) || only.test(c.label));
  list = list.slice(0, limit);

  /** One phase: frames for `seconds`, its update timed, its render timed. */
  const phase = async (
    update: ((d: number) => void) | undefined,
    seconds: number,
  ): Promise<PhaseStats> => {
    let last = await nextFrame();
    const start = { ...counts };
    counts.sizes.clear();
    const began = performance.now();
    let frames = 0;
    let updateSum = 0;
    let updateWorst = 0;
    let renderSum = 0;
    while (performance.now() - began < seconds * 1000) {
      const now = await nextFrame();
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t0 = performance.now();
      update?.(delta);
      const t1 = performance.now();
      renderer.render(scene, camera);
      const t2 = performance.now();
      frames += 1;
      updateSum += t1 - t0;
      updateWorst = Math.max(updateWorst, t1 - t0);
      renderSum += t2 - t1;
    }
    const elapsed = (performance.now() - began) / 1000;
    return {
      frames,
      seconds: elapsed,
      updateMeanMs: updateSum / Math.max(1, frames),
      updateWorstMs: updateWorst,
      renderMeanMs: renderSum / Math.max(1, frames),
      uploadsPerS: (counts.uploads - start.uploads) / elapsed,
      texelsPerS: (counts.texels - start.texels) / elapsed,
      ops2dPerS: (counts.ops2d - start.ops2d) / elapsed,
      uploadsBy: uploadsBySize(counts.sizes) || undefined,
    };
  };

  // The empty scene's render, taken off each component's.
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);
  const baseline = await phase(undefined, 0.6);
  const baselineRenderMs = baseline.renderMeanMs;

  // What a run has measured so far, kept in the tab, so a reload (the dev
  // server's, when a file changes) carries on where it stopped; `fresh`
  // starts again.
  const saveKey = `component-bench:${[...params].filter(([k]) => k !== 'fresh').join('&')}`;
  const store = (() => {
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  })();
  if (params.has('fresh')) {
    store?.removeItem(saveKey);
    // Once only: a reload part way through carries on.
    const url = new URL(location.href);
    url.searchParams.delete('fresh');
    history.replaceState(null, '', url);
  }
  const samples: BenchSample[] = (() => {
    try {
      return JSON.parse(store?.getItem(saveKey) ?? '[]') as BenchSample[];
    } catch {
      return [];
    }
  })();
  const done = new Set(samples.map((s) => s.id));
  const empty = (): PhaseStats => ({
    frames: 0,
    seconds: 0,
    updateMeanMs: 0,
    updateWorstMs: 0,
    renderMeanMs: 0,
    uploadsPerS: 0,
    texelsPerS: 0,
    ops2dPerS: 0,
  });
  for (const [n, c] of list.entries()) {
    if (done.has(c.id)) continue;
    status.textContent = `${n + 1} / ${list.length}: ${c.label}`;
    // Measured again, up to twice, if the page was starved of frames
    // (a game in another tab, the development server rebuilding): a
    // budget fails on the component, not on the machine (mission 094).
    let sample!: BenchSample;
    for (let attempt = 0; attempt < 3; attempt++) {
      const kit = createPanelKit();
      sample = {
        id: c.id,
        label: c.label,
        source: c.source,
        room: c.room,
        buildMs: 0,
        updateUs: 0,
        idle: empty(),
        active: empty(),
        drawCalls: 0,
        triangles: 0,
        materials: 0,
        textures: 0,
        textureBytes: 0,
        live: false,
      };
      let built: Built | null = null;
      try {
        clockStopped.value = false;
        const t0 = performance.now();
        built = c.build(kit);
        sample.buildMs = performance.now() - t0;
        sample.live = !!built.update;
        holder.add(built.object);
        // Framed whole, from in front.
        const box = new Box3().setFromObject(built.object);
        const size = box.getSize(new Vector3());
        const middle = box.getCenter(new Vector3());
        const reach = Math.max(size.x, size.y, 0.05) * 1.3 + size.z;
        camera.position.set(middle.x, middle.y, box.max.z + reach);
        camera.near = Math.max(0.001, reach / 100);
        camera.far = reach * 10 + size.z * 2;
        camera.updateProjectionMatrix();
        camera.lookAt(middle);
        const update = built.update?.bind(built);
        // Warm: its first uploads and shader compiles, the world running.
        await phase(update, 0.3);
        renderer.info.autoReset = true;
        renderer.render(scene, camera);
        sample.drawCalls = renderer.info.render.calls;
        sample.triangles = renderer.info.render.triangles;
        const r = resources(built.object);
        sample.materials = r.materials.size;
        sample.textures = r.textures.size;
        sample.textureBytes = r.bytes;
        // Idle: the world's clock stopped, so nothing it shows changes.
        clockStopped.value = true;
        sample.idle = await phase(update, secs);
        // Its update back to back, the world still: precise where frames are not.
        // The median of six batches of twenty, so one pause (a collection,
        // the development server's reload of another file) does not count
        // as the component's cost and fail its budget.
        if (update) {
          const batches: number[] = [];
          for (let b = 0; b < 6; b++) {
            const t = performance.now();
            for (let i = 0; i < 20; i++) update(1 / 60);
            batches.push(((performance.now() - t) / 20) * 1000);
          }
          sample.updateUs = medianOf(batches);
        }
        // Active: the world running, as in the game.
        clockStopped.value = false;
        sample.active = await phase(update, secs);
      } catch (error) {
        sample.error = error instanceof Error ? error.message : String(error);
        clockStopped.value = false;
      }
      try {
        built?.dispose?.();
        if (built) {
          holder.remove(built.object);
          disposeAll(built.object, kit);
        }
      } catch (error) {
        console.warn(`component bench: disposing ${c.id}`, error);
      }
      if (!starved(sample, secs)) break;
      console.warn(
        `component bench: ${c.id} starved of frames, measured again`,
      );
    }
    samples.push(sample);
    try {
      store?.setItem(saveKey, JSON.stringify(samples));
    } catch {
      // Too big for the tab's storage: the run goes on unsaved.
    }
    // Let the renderer drop what was freed before the next.
    renderer.renderLists.dispose();
  }
  status.textContent = 'Done.';
  const ranked = rankSamples(samples, usage, baselineRenderMs);
  const markdown = reportMarkdown(ranked, {
    secs,
    baselineRenderMs,
    gpu: gpuName(renderer),
    count: samples.length,
  });
  output.value = markdown;
  console.table(consoleRows(ranked));
  // The budgets, failing loudly (mission 094): every component over its
  // budget and not known to be is an error in the console, a red banner
  // over the page and the page's title.
  const verdict = budgetVerdict(samples, DEFAULT_BUDGET, secs);
  const banner = document.createElement('p');
  Object.assign(banner.style, {
    padding: '0.6em 1em',
    font: 'bold 15px system-ui, sans-serif',
    color: '#fff',
    background: verdict.passed ? '#1d6b35' : '#b3141b',
  });
  banner.textContent = verdict.passed
    ? `Within budget: every component (${verdict.known.length} known over, listed in the report).`
    : `OVER BUDGET: ${verdict.failures.length} component${verdict.failures.length === 1 ? '' : 's'}: ${verdict.failures.map((f) => f.label).join('; ')}.`;
  root.prepend(banner);
  for (const f of verdict.failures)
    console.error(
      `component bench: ${f.label} is over budget: ${f.over.join('; ')}`,
    );
  const api = { samples, ranked, markdown, baselineRenderMs, verdict };
  (window as unknown as { componentBench?: typeof api }).componentBench = api;
  console.info('component bench done: window.componentBench.markdown');
  document.title = verdict.passed
    ? 'Component bench: done, within budget'
    : `Component bench: FAILED, ${verdict.failures.length} over budget`;
  return api;
}

function gpuName(renderer: WebGLRenderer) {
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return info
    ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
    : String(gl.getParameter(gl.RENDERER));
}

/** The report's measured part: its headline, the budget failures and the table. */
function reportMarkdown(
  ranked: readonly Ranked[],
  run: { secs: number; baselineRenderMs: number; gpu: string; count: number },
) {
  const verdict = budgetVerdict(
    ranked.map((r) => r.sample),
    DEFAULT_BUDGET,
    run.secs,
  );
  const errors = ranked.filter((r) => r.sample.error);
  const used = ranked.filter((r) => r.weight > 0);
  const total = used.reduce(
    (sum, r) => sum + r.unitMs * (r.usage?.count ?? 0),
    0,
  );
  return [
    `Measured ${new Date().toISOString()} on ${run.gpu}, ${navigator.userAgent}; ${run.count} components, ${run.secs} s a phase; empty scene render ${run.baselineRenderMs.toFixed(3)} ms; timer ${crossOriginIsolated ? 'fine' : 'coarse (not cross-origin isolated)'}.`,
    '',
    `Busy rooms (counted ×2): ${BUSY_ROOMS.join(', ')}. The rooms' components together: ${total.toFixed(2)} ms a frame if all were drawn at once (one copy each where used, unweighted).`,
    '',
    verdict.passed
      ? '**Budgets: passed.**'
      : `**Budgets: FAILED.** Over budget: ${verdict.failures.map((f) => `${f.label} (${f.over.join('; ')})`).join('; ')}.`,
    '',
    `Not judged, the page starved of frames even when measured again (rerun them with \`only\`): ${verdict.unsteady.length ? verdict.unsteady.map((u) => u.label).join('; ') : 'none'}.`,
    '',
    `Over budget but known: ${verdict.known.length ? verdict.known.map((k) => `${k.label} (${k.why})`).join('; ') : 'none'}.`,
    '',
    errors.length
      ? `Not measured: ${errors.map((r) => `${r.sample.label} (${r.sample.error})`).join('; ')}.`
      : 'Every component built.',
    '',
    rankedTable(ranked),
    '',
  ].join('\n');
}

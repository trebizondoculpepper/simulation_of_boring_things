import {
  addSkipGraffiti,
  createSkip,
} from '../../components/site-dressing/views/skip';
import { dressSkip } from '../../components/site-dressing/logic/skip-dressing';
import {
  BoxGeometry,
  CanvasTexture,
  SRGBColorSpace,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { markComponent } from '../../components/core/views/component-identity';
import { createSafetySign } from '../../components/general-safety/views/safety-signs';
import { createMicroLabel } from '../../components/core/views/eighties-controls';
import {
  createCardboardStack,
  createCigaretteBin,
  createCone,
  createCrateStack,
  createGritBin,
  createPalletStack,
  createSadPlanter,
  createWheelieBin,
} from '../../components/loading-dock/views/yard-kit';
import { INTAKE, YARD, YARD_DRESSING } from '../logic/dock-yard';

/**
 * The goods yard's dressing (prompt 083; the owner, 2026-10-26): bins, a
 * skip, a cage of spent forklift propane, cardboard, crates, cones, a
 * grit bin, sad planters and a cigarette bin by the door; a headroom sign
 * over each lorry opening and a keep-clear sign on the fire exit's outside.
 * Set decoration. The dock's frame, metres; the yard at `YARD.level`.
 */
export function createYardDressing(
  kit: PanelKit,
  openings: readonly { at: number; w: number; h: number }[],
  doorX: number,
) {
  const group = new Group();
  group.name = 'Goods yard dressing';
  const make = {
    planter: (k: number) => createSadPlanter(kit, k),
    'bin-general': () => createWheelieBin(kit, '#2f6b33', 'GENERAL WASTE'),
    'bin-recycling': () => createWheelieBin(kit, '#1d4f9e', 'MIXED RECYCLING'),
    cardboard: () => createCardboardStack(kit),
    crates: () => createCrateStack(kit, 5, '#2a6fa8'),
    'crates-green': () => createCrateStack(kit, 4, '#3b7a3a'),
    grit: () => createGritBin(kit),
    skip: () => {
      // The game's skip (from the Encabulator): a random hire firm's name,
      // a random tag or two of graffiti (the owner, 2026-10-26).
      const skip = createSkip(kit);
      addSkipGraffiti(kit, skip.group, dressSkip(Math.random).tags);
      return skip.group;
    },
    cone: () => createCone(kit),
    pallets: () => createPalletStack(kit, 5),
  } as const;
  YARD_DRESSING.forEach((p, k) => {
    // The propane cage is a working part, installed by the room
    // (`createLpgCagePart`); its signs and the litter round it are here.
    if (p.kind === 'lpg') return;
    const thing = make[p.kind](k);
    thing.position.set(p.x, YARD.level, p.z);
    thing.rotation.y = p.yaw;
    group.add(thing);
  });
  // The cigarette bin on the wall above the planters.
  const ash = createCigaretteBin(kit);
  ash.position.set(6.45, YARD.level + 1.1, INTAKE.wallZ);
  ash.rotation.y = Math.PI;
  group.add(ash);
  // A headroom sign over each lorry opening, on the outside face.
  for (const o of openings) {
    const sign = createMicroLabel(kit, `MAX HEADROOM ${o.h.toFixed(1)} m`, {
      height: 0.09,
      ink: '#111111',
      plate: '#e3b51f',
    });
    sign.position.set(o.at, o.h + 0.35, INTAKE.wallZ - 0.01);
    sign.rotation.y = Math.PI;
    group.add(sign);
  }
  // The fire exit's outside: keep clear.
  const keep = createSafetySign(kit, ['exit'], ['Fire exit', 'Keep clear']);
  keep.position.set(doorX, 1.6, INTAKE.wallZ - 0.06);
  keep.rotation.y = Math.PI;
  group.add(keep);
  // Above the propane cage, no smoking, no naked flames (the owner,
  // 2026-10-26); and on the tarmac the evidence that people smoke there
  // anyway: butts scattered by the cage and under the cigarette bin by the
  // door, and a crushed, empty packet.
  const lpg = YARD_DRESSING.find((p) => p.kind === 'lpg');
  if (lpg) {
    const row = new Group();
    row.position.set(lpg.x, YARD.level + 2.15, INTAKE.wallZ - 0.01);
    row.rotation.y = Math.PI;
    (
      [
        [['no-smoking'], ['No smoking']],
        [['no-flames'], ['No naked flames']],
      ] as const
    ).forEach(([p, lines], i) => {
      const sign = createSafetySign(kit, p, lines);
      sign.position.x = (i - 0.5) * 0.42;
      row.add(sign);
    });
    group.add(row);
  }
  let seed = 17;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const filter = new MeshStandardMaterial({ color: '#c98a3c', roughness: 0.9 });
  const paper = new MeshStandardMaterial({ color: '#e8e4d8', roughness: 0.9 });
  const burnt = new MeshStandardMaterial({ color: '#3a3836', roughness: 1 });
  kit.materials.push(filter, paper, burnt);
  const butt = (x: number, z: number) => {
    const b = new Group();
    const len = 0.02 + rnd() * 0.025;
    const f = new Mesh(new CylinderGeometry(0.0038, 0.0038, 0.02, 8), filter);
    f.rotation.z = Math.PI / 2;
    f.position.x = -0.01;
    b.add(f);
    const p = new Mesh(new CylinderGeometry(0.0036, 0.0036, len, 8), paper);
    p.rotation.z = Math.PI / 2;
    p.position.x = len / 2;
    b.add(p);
    const tip = new Mesh(new CylinderGeometry(0.0037, 0.0037, 0.003, 8), burnt);
    tip.rotation.z = Math.PI / 2;
    tip.position.x = len;
    b.add(tip);
    b.position.set(x, YARD.level + 0.004, z);
    b.rotation.y = rnd() * Math.PI * 2;
    group.add(b);
  };
  const scatter = (cx: number, cz: number, n: number, spread: number) => {
    for (let k = 0; k < n; k++)
      butt(cx + (rnd() - 0.5) * spread, cz + (rnd() - 0.5) * spread * 0.6);
  };
  if (lpg) scatter(lpg.x - 0.4, lpg.z - 0.9, 14, 1.6);
  scatter(6.45, INTAKE.wallZ - 0.45, 18, 1.0);
  // The packet: Farnborough (the owner, 2026-10-26), in the UK's plain
  // packaging, drab dark brown, the name in a plain face, its health
  // warning; crushed flat, its lid torn open.
  const packet = new Group();
  const art = document.createElement('canvas');
  art.width = 128;
  art.height = 200;
  const c = art.getContext('2d')!;
  c.fillStyle = '#4a412a';
  c.fillRect(0, 0, 128, 200);
  c.fillStyle = '#1d1d1d';
  c.fillRect(0, 0, 128, 80);
  c.fillStyle = '#e6e2d6';
  c.font = 'bold 15px sans-serif';
  c.textAlign = 'center';
  c.fillText('SMOKING', 64, 30);
  c.fillText('KILLS', 64, 50);
  c.font = '18px sans-serif';
  c.fillText('Farnborough', 64, 130);
  c.font = '10px sans-serif';
  c.fillText('Original', 64, 150);
  const map = new CanvasTexture(art);
  map.colorSpace = SRGBColorSpace;
  kit.textures.push(map);
  const face = new MeshStandardMaterial({ map, roughness: 0.6 });
  const drab = new MeshStandardMaterial({ color: '#4a412a', roughness: 0.6 });
  kit.materials.push(face, drab);
  const body = new Mesh(new BoxGeometry(0.055, 0.012, 0.088), [
    drab,
    drab,
    face,
    drab,
    drab,
    drab,
  ]);
  body.rotation.set(0.15, 0, 0.1);
  packet.add(body);
  packet.position.set(
    lpg ? lpg.x + 0.9 : 14,
    YARD.level + 0.008,
    lpg ? lpg.z - 1.1 : -8,
  );
  packet.rotation.y = 0.7;
  group.add(packet);
  markComponent(group, { decorative: true });
  return group;
}

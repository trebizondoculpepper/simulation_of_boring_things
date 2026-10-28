import { CircleGeometry, Group, Mesh, SphereGeometry } from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { brandLivery } from '../../core/views/brand-livery';
import { drawBrandMark, wordmarkFont } from '../../core/views/brand-logo';
import { markComponent } from '../../core/views/component-identity';
import { beginPart } from '../../core/parts/parts';
import {
  createClass8Placard,
  createHazchemPlate,
} from '../../general-safety/views/dangerous-goods';
import type { Part } from '../../core/parts/parts';
import {
  ISO_TANK,
  TANK_CHEMICAL,
  isoTankStatus,
  newIsoTank,
  outletPressure,
  stepIsoTank,
} from '../logic/iso-tank';
import type { IsoTank, TankChemical } from '../logic/iso-tank';

/** A 20 ft ISO container's outside, ISO 668. */
const L = 6.058;
const W = 2.438;
const H = 2.591;
const R = ISO_TANK.diameter / 2 + 0.05;
const BAND: Record<TankChemical, string> = {
  hypochlorite: '#e3b51f',
  acid: '#c62a22',
};

/**
 * A 20 ft ISO tank container of a bulk pool chemical (prompt 097), after
 * the T11 road tank containers the chemical hauliers run: a steel frame
 * with a corner casting at each corner round an insulated barrel of
 * 24,000 L clad in stainless, on saddles; a walkway along its top past its
 * manlid, relief valve and air connection; and its bottom discharge at
 * the rear end: a foot valve worked by its handle, an outlet ball valve, a
 * dry-break coupling with its dust cap on a chain, and a gauge reading
 * the head over the outlet. Chlorella Chemicals' own, in its colours, its
 * chemical's band round the barrel, placarded for ADR on all four sides
 * (class 8, the orange plate with the hazard and UN numbers).
 *
 * Working: the foot valve's handle, the outlet valve's lever and the cap
 * each work by a use; with both valves open and the cap off it spills on
 * the ground (a puddle that grows), and the gauge falls as it empties.
 * Metres; on its bottom corner castings at y = 0, its middle at x = z = 0,
 * its length along z, its discharge end toward −z. `ground` is how far
 * below its castings the ground is, for the spill.
 */
export function createIsoTankContainer(
  kit: PanelKit,
  {
    chemical,
    ground,
    serial,
  }: { chemical: TankChemical; ground: number; serial: string },
): { group: Group; parts: Part[]; state: () => IsoTank } {
  const t = tools(kit);
  const group = new Group();
  group.name = `ISO tank container ${serial}`;
  const parts: Part[] = [];
  const info = TANK_CHEMICAL[chemical];
  const load = {
    eac: info.eac,
    un: info.un,
    phone: '01632 960 179',
    company: 'Chlorella Chemicals',
  };
  const livery = brandLivery(kit, 'chlorella');
  const frame = t.paint(livery.brand.colours[0], 0.5, 0.2);
  const casting = t.paint('#2a2c2e', 0.6, 0.3);
  const steel = t.paint('#c9cdd1', 0.25, 0.85);
  const grey = t.paint('#6b6f73', 0.5, 0.4);
  const black = t.paint('#1b1b1b', 0.7);
  let tank = newIsoTank(chemical);

  // ---- The frame: corner castings, posts, rails ---------------------------
  for (const x of [-1, 1])
    for (const z of [-1, 1])
      for (const y of [0.059, H - 0.059])
        t.box(
          group,
          casting,
          0.162,
          0.118,
          0.178,
          x * (W / 2 - 0.081),
          y,
          z * (L / 2 - 0.089),
        );
  for (const x of [-1, 1])
    for (const z of [-1, 1])
      t.box(
        group,
        frame,
        0.15,
        H - 0.24,
        0.15,
        x * (W / 2 - 0.075),
        H / 2,
        z * (L / 2 - 0.075),
      );
  for (const x of [-1, 1])
    for (const y of [0.09, H - 0.09])
      t.box(group, frame, 0.12, 0.16, L - 0.36, x * (W / 2 - 0.06), y, 0);
  for (const z of [-1, 1])
    for (const y of [0.09, H - 0.09])
      t.box(group, frame, W - 0.32, 0.16, 0.12, 0, y, z * (L / 2 - 0.06));
  // Diagonal braces in each end frame.
  for (const z of [-1, 1]) {
    const brace = t.box(
      group,
      frame,
      0.08,
      Math.hypot(W - 0.3, H - 0.3),
      0.08,
      0,
      H / 2,
      z * (L / 2 - 0.06),
    );
    brace.rotation.z = Math.atan2(W - 0.3, H - 0.3) * (z < 0 ? 1 : -1);
  }

  // ---- The barrel, clad, on its saddles -----------------------------------
  const cy = H / 2 + 0.02;
  const barrelL = L - 0.75;
  t.cyl(group, steel, R, barrelL, 0, cy, 0, 'z', 40);
  for (const z of [-1, 1]) {
    const head = new Mesh(
      new SphereGeometry(R, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      steel,
    );
    head.scale.set(1, 0.22, 1);
    head.rotation.x = (z * Math.PI) / 2;
    head.position.set(0, cy, z * (barrelL / 2));
    group.add(head);
  }
  // The cladding's seams, and the chemical's band round its middle.
  for (const z of [-2, -1, 1, 2])
    t.cyl(group, grey, R + 0.004, 0.02, 0, cy, z * 1.05, 'z', 40);
  t.cyl(
    group,
    t.paint(BAND[chemical], 0.45),
    R + 0.006,
    0.3,
    0,
    cy,
    0.0,
    'z',
    40,
  );
  for (const z of [-1.9, 0, 1.9])
    t.box(group, frame, W - 0.3, 0.22, 0.14, 0, 0.26, z);

  // ---- On its sides: Chlorella's name, the chemical, the placards ---------
  for (const s of [-1, 1]) {
    const side = new Group();
    side.position.set(s * (R + 0.008), cy, 0);
    side.rotation.y = (s * Math.PI) / 2;
    group.add(side);
    const name = t.printed(
      2.2,
      0.55,
      (c, cw, ch) => {
        c.clearRect(0, 0, cw, ch);
        drawBrandMark(c, livery.brand, ch * 0.45, ch / 2, ch * 0.4);
        c.fillStyle = livery.brand.colours[2];
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.font = wordmarkFont(livery.brand, ch * 0.5);
        c.fillText(
          livery.brand.wordmark ?? livery.brand.name,
          ch * 0.95,
          ch / 2,
          cw - ch,
        );
      },
      512,
    );
    (name.mesh.material as Material & { transparent: boolean }).transparent =
      true;
    name.mesh.position.set(s * 1.3, 0.45, 0);
    side.add(name.mesh);
    t.label(side, info.name, s * 1.3, -0.08, 0, 0.09, '#1b1b1b');
    // A Hazchem plate on each side, near the rear, in its holder on the
    // frame (a UK tanker shows them on its sides and rear).
    const holder = new Group();
    holder.position.set(s * (W / 2 + 0.002), 0.95, -L / 2 + 0.75);
    holder.rotation.y = (s * Math.PI) / 2;
    group.add(holder);
    holder.add(createHazchemPlate(kit, load, 0.6));
  }
  // Its code and serial on the frame's top rail, and the tank code.
  for (const s of [-1, 1]) {
    const code = t.label(
      group,
      `${serial}   22T6   T11`,
      s * (W / 2 + 0.002),
      H - 0.09,
      0.8,
      0.07,
      '#f2f2f2',
    );
    code.rotation.y = (s * Math.PI) / 2;
  }

  // ---- The top: walkway, manlid, relief valve, air connection -----------
  const top = cy + R;
  t.box(group, grey, 0.6, 0.03, L - 0.6, 0, top + 0.02, 0);
  for (let z = -L / 2 + 0.6; z < L / 2 - 0.4; z += 0.25)
    t.box(group, black, 0.6, 0.032, 0.02, 0, top + 0.022, z);
  t.cyl(group, steel, 0.25, 0.12, 0, top + 0.08, 0.6, 'y', 24);
  t.cyl(group, grey, 0.27, 0.03, 0, top + 0.15, 0.6, 'y', 24);
  t.cyl(group, grey, 0.06, 0.18, 0.2, top + 0.11, -0.6, 'y', 12);
  t.cyl(
    group,
    t.paint('#c62a22', 0.5),
    0.07,
    0.05,
    0.2,
    top + 0.22,
    -0.6,
    'y',
    12,
  );
  t.cyl(group, grey, 0.04, 0.14, -0.2, top + 0.09, -0.4, 'y', 10);

  // ---- The rear end: placards, the discharge, the gauge -------------------
  const rear = -L / 2;
  // The rear's Hazchem plate on the end frame, high, clear of the
  // discharge; a class 8 placard on the front end.
  const endPlate = createHazchemPlate(kit, load, 0.8);
  endPlate.position.set(0, 1.75, rear - 0.07);
  endPlate.rotation.y = Math.PI;
  group.add(endPlate);
  const frontPlacard = createClass8Placard(kit);
  frontPlacard.position.set(-0.7, 1.55, L / 2 + 0.005);
  group.add(frontPlacard);

  // The discharge pipe down from the barrel's lowest point to the end frame.
  const outletY = cy - R + 0.12;
  t.cyl(group, steel, 0.06, 0.9, 0, outletY, rear + 0.6, 'z', 16);
  // The foot valve's operating rod along under the barrel, its handle at
  // the end frame's nearside corner.
  t.cyl(group, grey, 0.015, 0.8, -0.7, outletY + 0.1, rear + 0.5, 'z', 8);

  // The foot valve's handle: a lever, down shut, up open.
  {
    const a = beginPart(kit, 'Foot valve handle');
    const pivot = new Group();
    pivot.position.set(-0.7, outletY + 0.1, rear + 0.08);
    a.object.add(pivot);
    const lever = t.box(
      pivot,
      t.paint('#c62a22', 0.5),
      0.04,
      0.4,
      0.04,
      0,
      -0.2,
      0,
    );
    group.add(a.object);
    let angle = 0;
    a.uses.set(lever, () => (tank = { ...tank, foot: !tank.foot }));
    a.updates.push((delta) => {
      const want = tank.foot ? Math.PI * 0.9 : 0;
      angle +=
        Math.sign(want - angle) * Math.min(Math.abs(want - angle), delta * 3);
      pivot.rotation.x = -angle;
    });
    a.shows(() => (tank.foot ? 'open' : 'shut'));
    parts.push(a.part());
  }
  // The outlet ball valve: a body on the pipe, a yellow lever along it open,
  // across it shut.
  {
    const a = beginPart(kit, 'Outlet valve');
    t.box(group, grey, 0.2, 0.18, 0.18, 0, outletY, rear + 0.28);
    const pivot = new Group();
    pivot.position.set(0, outletY + 0.1, rear + 0.28);
    a.object.add(pivot);
    const lever = t.box(
      pivot,
      t.paint('#e3b51f', 0.5),
      0.3,
      0.03,
      0.04,
      0.13,
      0.02,
      0,
    );
    group.add(a.object);
    let angle = 0;
    a.uses.set(lever, () => (tank = { ...tank, outlet: !tank.outlet }));
    a.updates.push((delta) => {
      const want = tank.outlet ? Math.PI / 2 : 0;
      angle +=
        Math.sign(want - angle) * Math.min(Math.abs(want - angle), delta * 4);
      pivot.rotation.y = angle;
    });
    a.shows(() => (tank.outlet ? 'open' : 'shut'));
    parts.push(a.part());
  }
  // The dry-break coupling and its dust cap on a chain.
  const nose = rear + 0.04;
  t.cyl(group, steel, 0.065, 0.16, 0, outletY, nose + 0.08, 'z', 18);
  {
    const a = beginPart(kit, 'Coupling dust cap');
    const cap = t.cyl(
      a.object,
      t.paint(BAND[chemical], 0.5),
      0.075,
      0.07,
      0,
      0,
      0,
      'z',
      18,
    );
    group.add(a.object);
    const capped = [0, outletY, nose - 0.03];
    const hanging = [0.12, outletY - 0.25, nose + 0.02];
    a.uses.set(cap, () => {
      if (tank.coupling === 'connected') return;
      tank = {
        ...tank,
        coupling: tank.coupling === 'capped' ? 'open' : 'capped',
      };
    });
    a.updates.push(() => {
      const at = tank.coupling === 'capped' ? capped : hanging;
      a.object.position.set(at[0], at[1], at[2]);
    });
    a.shows(() =>
      tank.coupling === 'capped' ? 'on' : 'off, hanging on its chain',
    );
    parts.push(a.part());
  }
  // The gauge at the end frame, reading the head over the outlet, 0 to 1 bar.
  {
    const a = beginPart(kit, 'Outlet pressure gauge');
    const face = t.printed(0.16, 0.16, (c, cw, ch) => {
      c.fillStyle = '#f4f2ea';
      c.beginPath();
      c.arc(cw / 2, ch / 2, cw * 0.48, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#222';
      c.lineWidth = cw * 0.02;
      c.stroke();
      c.fillStyle = '#111';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `600 ${cw * 0.08}px Arial, sans-serif`;
      for (let i = 0; i <= 10; i++) {
        const ang = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
        const r0 = cw * 0.38;
        const r1 = cw * (i % 5 === 0 ? 0.3 : 0.34);
        c.beginPath();
        c.moveTo(cw / 2 + Math.cos(ang) * r0, ch / 2 + Math.sin(ang) * r0);
        c.lineTo(cw / 2 + Math.cos(ang) * r1, ch / 2 + Math.sin(ang) * r1);
        c.stroke();
        if (i % 5 === 0)
          c.fillText(
            String(i / 10),
            cw / 2 + Math.cos(ang) * cw * 0.22,
            ch / 2 + Math.sin(ang) * cw * 0.22,
          );
      }
      c.fillText('bar', cw / 2, ch * 0.7);
    });
    const dial = new Group();
    dial.position.set(0.45, outletY + 0.25, rear - 0.01);
    dial.rotation.y = Math.PI;
    a.object.add(dial);
    dial.add(face.mesh);
    t.cyl(dial, black, 0.085, 0.03, 0, 0, -0.016, 'z', 24);
    const needle = new Group();
    needle.position.z = 0.003;
    dial.add(needle);
    t.box(needle, t.paint('#b11d17', 0.5), 0.004, 0.06, 0.002, 0, 0.03, 0);
    group.add(a.object);
    a.updates.push(() => {
      const bar = Math.max(0, Math.min(1, outletPressure(tank)));
      // From 0 at the lower left round clockwise to 1 at the lower right.
      needle.rotation.z = Math.PI * 0.75 - bar * Math.PI * 1.5;
    });
    a.shows(() => `${outletPressure(tank).toFixed(2)} bar`);
    parts.push(a.part());
  }
  // The hose tube along the bottom rail, its end cap at the rear.
  t.box(group, grey, 0.16, 0.16, L - 0.5, W / 2 - 0.2, 0.28, 0);
  t.cyl(group, black, 0.06, 0.04, W / 2 - 0.2, 0.28, rear + 0.24, 'z', 12);

  // ---- The spill, if it is let out with nowhere to go ---------------------
  const puddle = new Mesh(
    new CircleGeometry(1, 40),
    t.paint(chemical === 'acid' ? '#9fb4a8' : '#cfd59a', 0.05, 0.1),
  );
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(0, -ground + 0.006, rear - 0.6);
  puddle.visible = false;
  group.add(puddle);
  const stream = t.cyl(
    group,
    t.paint('#d9df9f', 0.05),
    0.03,
    ground + outletY,
    0,
    (outletY - ground) / 2,
    rear - 0.06,
    'y',
    10,
  );
  stream.visible = false;
  {
    const a = beginPart(kit, 'Tank contents');
    a.updates.push((delta) => {
      tank = stepIsoTank(tank, delta);
      const spilling =
        tank.foot && tank.outlet && tank.coupling === 'open' && tank.litres > 0;
      stream.visible = spilling;
      puddle.visible = tank.spilled > 0;
      // A thin film: a litre covers about 0.4 m² of tarmac, up to 12 m across.
      const r = Math.min(6, Math.sqrt((tank.spilled * 0.4) / Math.PI));
      puddle.scale.setScalar(Math.max(0.05, r));
    });
    parts.push(a.part());
  }

  markComponent(group, {
    name: `ISO tank container ${serial}`,
    part: {
      kind: 'visible',
      label: `ISO tank container ${serial}`,
      shows: () => isoTankStatus(tank),
    },
  });
  return { group, parts, state: () => tank };
}

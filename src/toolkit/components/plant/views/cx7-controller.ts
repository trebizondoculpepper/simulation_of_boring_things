import { Group, Mesh, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BLOCK_THEME, UiNode } from '../../../../ui2d';
import type { PressOutcome, Theme } from '../../../../ui2d';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { drawBrandMark, wordmarkFont } from '../../core/views/brand-logo';
import { brandLivery } from '../../core/views/brand-livery';
import { createTouchSurface } from '../../industrial-control/views/touch-surface';
import { planeToPixel } from '../../industrial-control/logic/touch-surface';
import { touchPoint } from '../../../controls/input/touch-point';
import { OT216_LIVERY } from '../../industrial-control/views/ot216-terminal';
import { describe } from './describe';
import {
  CX7_H,
  CX7_W,
  cx7Screen,
  newCx7,
  pressCx7,
  tickCx7,
  zoneAt,
} from '../logic/cx7-hmi';
import type { Cx7Screen, Cx7State } from '../logic/cx7-hmi';
import type { ControllerState } from '../logic/dosing-controller';

/** Its body, metres (the DULCOMARIN 3's: 430 × 290 × 150 mm), and its 7" screen's opening. */
export const CX7_BODY = { w: 0.43, h: 0.29, d: 0.15 } as const;
const SCREEN = { x: -0.045, y: 0.035, w: 0.154, h: 0.0924 } as const;

/** The HMI's lettering: a plain sans, as a 2010s panel's. */
const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

/** Paints a CX-7 screen description, and takes its touches. */
class Cx7Node extends UiNode {
  screen: Cx7Screen = { items: [], zones: [] };
  private shown = '';
  constructor(private readonly touched: (id: string) => string | null) {
    super();
  }
  /** Show this description: repainted only if it differs from what is shown. */
  show(screen: Cx7Screen) {
    const key = JSON.stringify(screen.items);
    this.screen = screen;
    if (key === this.shown) return;
    this.shown = key;
    this.markDirty();
  }
  override get pressable() {
    return true;
  }
  override press(x: number, y: number): PressOutcome | null {
    // The surface's pixels to the description's 800 × 480.
    const id = zoneAt(
      this.screen,
      (x / this.rect.w) * CX7_W,
      (y / this.rect.h) * CX7_H,
    );
    if (!id) return { sound: null };
    const sound = this.touched(id);
    return { sound: (sound ?? null) as PressOutcome['sound'] };
  }
  protected override draw(ctx: CanvasRenderingContext2D, _theme: Theme) {
    const sx = this.rect.w / CX7_W;
    const sy = this.rect.h / CX7_H;
    ctx.save();
    ctx.translate(this.rect.x, this.rect.y);
    ctx.scale(sx, sy);
    for (const it of this.screen.items) {
      if (it.kind === 'rect') {
        ctx.beginPath();
        if (it.r) ctx.roundRect(it.x, it.y, it.w, it.h, it.r);
        else ctx.rect(it.x, it.y, it.w, it.h);
        if (it.fill) {
          ctx.fillStyle = it.fill;
          ctx.fill();
        }
        if (it.stroke) {
          ctx.strokeStyle = it.stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (it.kind === 'text') {
        ctx.fillStyle = it.colour;
        ctx.font = `${it.bold ? 'bold ' : ''}${it.size}px ${FONT}`;
        ctx.textAlign = it.align ?? 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.text, it.x, it.y);
      } else if (it.points.length >= 4) {
        ctx.beginPath();
        ctx.strokeStyle = it.colour;
        ctx.lineWidth = it.width;
        ctx.lineJoin = 'round';
        ctx.setLineDash(it.dash ? [6, 5] : []);
        ctx.moveTo(it.points[0], it.points[1]);
        for (let i = 2; i < it.points.length; i += 2)
          ctx.lineTo(it.points[i], it.points[i + 1]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }
}

/**
 * The Olympic's dosing controller (prompt 105): a Chlorella CX-7, after
 * ProMinent's DULCOMARIN 3 (430 × 290 × 150 mm, a 7" touch display) and
 * W&T's DEPOLOX Pool: a grey moulded body, a Chlorella-green front with
 * its 7" touch screen (`cx7-hmi.ts`, its pages drawn as a 2010s plant
 * panel, not the bridge), its POWER lamp, its mark and model, and cable
 * glands along its foot for the probes, the pumps' signals and the relays
 * to the control room; its rating plate on its side. A bought-in
 * specialist's instrument, so Chlorella's, not Penfold's (the owner,
 * 2026-10-28). It shows and works the controller it is given; facing +z,
 * its back at z = 0, its middle at the origin.
 */
export function createCx7Controller(
  kit: PanelKit,
  {
    tag,
    pool,
    state,
    change,
  }: {
    tag: string;
    pool: string;
    state: () => ControllerState;
    change: (c: ControllerState) => void;
  },
) {
  const t = tools(kit);
  const B = CX7_BODY;
  const object = new Group();
  object.name = `${tag} Chlorella CX-7 dosing controller`;
  const livery = brandLivery(kit, 'chlorella');
  // The body, grey; the front, green.
  const body = new Mesh(
    new RoundedBoxGeometry(B.w, B.h, B.d - 0.02, 4, 0.012),
    t.paint('#b8bcbc', 0.75),
  );
  body.position.set(0, 0, (B.d - 0.02) / 2);
  object.add(body);
  const front = new Mesh(
    new RoundedBoxGeometry(B.w, B.h, 0.03, 4, 0.01),
    t.paint(OT216_LIVERY.fascia, 0.6),
  );
  front.position.set(0, 0, B.d - 0.015);
  object.add(front);
  const z = B.d + 0.0002;
  // Its printed face: the mark and model, the lamp's legend, its tag.
  const face = t.printed(
    B.w - 0.03,
    B.h - 0.03,
    (c, cw, ch) => {
      const k = cw / (B.w - 0.03);
      c.fillStyle = OT216_LIVERY.fascia;
      c.fillRect(0, 0, cw, ch);
      // The screen's recess, darker round its opening.
      c.fillStyle = '#2d6f2a';
      const sx = (SCREEN.x - SCREEN.w / 2 - 0.012 + (B.w - 0.03) / 2) * k;
      const sy = ((B.h - 0.03) / 2 - SCREEN.y - SCREEN.h / 2 - 0.012) * k;
      c.beginPath();
      c.roundRect(
        sx,
        sy,
        (SCREEN.w + 0.024) * k,
        (SCREEN.h + 0.024) * k,
        0.006 * k,
      );
      c.fill();
      drawBrandMark(
        c,
        livery.brand,
        cw * 0.79,
        ch * 0.16,
        ch * 0.07,
        OT216_LIVERY.fascia,
      );
      c.fillStyle = '#ffffff';
      c.font = wordmarkFont(livery.brand, ch * 0.075);
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.fillText(
        livery.brand.wordmark ?? livery.brand.name,
        cw * 0.705,
        ch * 0.29,
      );
      c.font = `bold ${ch * 0.055}px Arial, sans-serif`;
      c.fillText('CX-7', cw * 0.705, ch * 0.4);
      c.font = `${ch * 0.032}px Arial, sans-serif`;
      c.fillText('POOL WATER CONTROLLER', cw * 0.705, ch * 0.46);
      c.fillText('Cl · pH · ORP · °C', cw * 0.705, ch * 0.51);
      c.fillText('POWER', cw * 0.76, ch * 0.66);
      c.font = `bold ${ch * 0.045}px Arial, sans-serif`;
      c.fillText(`${tag} · ${pool}`, cw * 0.06, ch * 0.9);
      c.font = `${ch * 0.03}px Arial, sans-serif`;
      c.fillText(
        'DOSING CONTROLLER · FREE / COMBINED CHLORINE, pH, REDOX',
        cw * 0.06,
        ch * 0.96,
      );
    },
    768,
  );
  face.mesh.position.set(0, 0, z);
  object.add(face.mesh);
  const power = t.led(object, '#3cff5a', 0.004, 0.095, -0.042, z + 0.001);
  power.set(true);
  // The screen.
  let hmi: Cx7State = newCx7();
  const node = new Cx7Node((id) => {
    const r = pressCx7(hmi, state(), id);
    hmi = r.hmi;
    change(r.controller);
    node.show(cx7Screen(hmi, r.controller));
    return r.sound;
  });
  const surface = createTouchSurface(kit, {
    name: `${tag} CX-7 touch screen`,
    bezel: 0.006,
    depth: 0.003,
    radius: 0.004,
    screens: [
      {
        rect: { x: 0, y: 0, w: SCREEN.w, h: SCREEN.h },
        tree: node,
        theme: BLOCK_THEME,
        pixelsPerMetre: CX7_W / SCREEN.w,
        boot: false,
      },
    ],
  });
  surface.group.position.set(SCREEN.x, SCREEN.y, z + 0.0005);
  object.add(surface.group);
  // The screen lies in its frame's face, coplanar with it, and a ray may
  // strike the frame first: a touch there, within the screen's opening,
  // is a touch on the screen at that point.
  const screen = surface.screens[0];
  for (const child of surface.group.children)
    if (child !== screen.mesh && child instanceof Mesh)
      surface.part.uses.set(child, () => {
        const at = touchPoint(child);
        if (!at?.point) return;
        const p = surface.group.worldToLocal(
          new Vector3(at.point.x, at.point.y, at.point.z),
        );
        const rect = { x: 0, y: 0, w: SCREEN.w, h: SCREEN.h };
        if (Math.abs(p.x) > rect.w / 2 || Math.abs(p.y) > rect.h / 2) return;
        const px = planeToPixel(rect, p.x, p.y, screen.width, screen.height);
        screen.touchPixel(px.x, px.y);
      });
  // Cable glands along its foot: probes, pumps, relays, mains.
  const gland = t.paint('#2a2d2e', 0.6);
  for (let i = 0; i < 7; i++)
    t.cyl(
      object,
      gland,
      0.009,
      0.018,
      -0.15 + i * 0.05,
      -B.h / 2 - 0.008,
      B.d / 2,
      'y',
      12,
    );
  // Its rating plate, on its right side.
  const plate = t.printed(
    0.09,
    0.05,
    (c, cw, ch) => {
      c.fillStyle = '#e4e6e2';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#16301a';
      c.font = `bold ${ch * 0.16}px Arial, sans-serif`;
      c.fillText('Chlorella CX-7', cw * 0.05, ch * 0.2);
      c.font = `${ch * 0.1}px Arial, sans-serif`;
      [
        'Pool water controller, 1 circuit',
        '100–230 V AC 50/60 Hz 30 VA',
        'IP65 · 4 relays · 2 × 4–20 mA',
        'Ser. CX7-15-0418 · 2015',
      ].forEach((l, i) => c.fillText(l, cw * 0.05, ch * (0.42 + i * 0.16)));
    },
    256,
  );
  plate.mesh.rotation.y = Math.PI / 2;
  plate.mesh.position.set(B.w / 2 + 0.0005, 0, B.d / 2);
  object.add(plate.mesh);
  describe(object, `${tag}: Chlorella CX-7 pool water controller`, () => {
    const c = state();
    return `Free Cl ${c.measured.free.toFixed(2)} mg/l, pH ${c.measured.ph.toFixed(2)}; showing ${hmi.page}`;
  });
  let nextScreen = 0;
  let seconds = 0;
  const update = (delta: number) => {
    seconds += delta;
    hmi = tickCx7(hmi, delta);
    // Its description at most five times a second; repainted only when it changes.
    if (seconds >= nextScreen) {
      nextScreen = seconds + 0.2;
      node.show(cx7Screen(hmi, state()));
    }
  };
  node.show(cx7Screen(hmi, state()));
  return {
    object,
    /** Its touch screen, a part for the room's set (stepped there: its repaints). */
    part: surface.part,
    /** Its screen's state a step on (its part is stepped by the room's set). */
    update,
    /** Where its cables leave its foot, in its frame. */
    glandsAt: (i: number) =>
      [-0.15 + i * 0.05, -B.h / 2 - 0.017, B.d / 2] as const,
    page: () => hmi.page,
    setPage: (p: Cx7State['page']) => {
      hmi = { ...hmi, page: p };
      node.show(cx7Screen(hmi, state()));
    },
  };
}

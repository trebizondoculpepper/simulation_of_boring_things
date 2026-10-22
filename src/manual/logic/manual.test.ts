import { describe, expect, it } from 'vite-plus/test';
import { exhibitFor } from '../../toolkit/gallery/views/room-equipment';
import { layoutRoom } from '../../toolkit/gallery/logic/room-equipment';
import { GAS_HOUSE } from '../../game/plant/gas-house';
import { newIdentifiedPlant, walkIdentified } from '../../game/plant/identification';
import { escapeLatex, renderManual } from '../latex/render';
import { boilerHouseChapter } from './boiler-house';
import { revisionFor } from './fiction';
import { buildManual } from './manual';
import { compositeDot, kindName, portName, symbolsUsed } from './schematic';
import { SYMBOLS } from './symbols';
import { roomPlanSvg } from './room-plan';

describe('the operator’s manual', () => {
  const manual = buildManual(exhibitFor);
  const boiler = boilerHouseChapter(exhibitFor);
  const footbath = manual.chapters.find((c) => c.id === 'footbath-parts')!;
  const schedule = boiler.chapter.blocks.find(
    (b) => b.kind === 'table' && b.caption === 'Boiler house equipment',
  );

  it('lists every machine in the boiler house, each tagged once, with its maker', () => {
    const placed = layoutRoom('boiler_house')!.placed.filter(
      (p) => !p.item.key.startsWith('sign:'),
    );
    if (schedule?.kind !== 'table') throw new Error('no schedule');
    expect(schedule.rows).toHaveLength(placed.length);
    const tags = schedule.rows.map((r) => r[0]);
    expect(new Set(tags).size).toBe(tags.length);
    for (const row of schedule.rows)
      expect(row[2], row[1]).not.toMatch(/site-built/);
    expect(schedule.rows.map((r) => r[1])).toEqual(
      placed.map((p) => p.item.label),
    );
  });

  it('draws the PDF footbath schedule and index from the same identified model', () => {
    const parts = walkIdentified(newIdentifiedPlant());
    const schedule = footbath.blocks.find(
      (b) => b.kind === 'table' && b.caption === 'PL4 bill of parts',
    );
    const index = footbath.blocks.find(
      (b) => b.kind === 'table' && b.caption === 'PL4 component index',
    );
    if (schedule?.kind !== 'table' || index?.kind !== 'table')
      throw new Error('missing footbath tables');
    expect(schedule.rows.map((row) => row[0])).toEqual(parts.map((p) => p.id));
    expect(index.rows.map((row) => row[1]).sort()).toEqual(
      parts.map((p) => p.id).sort(),
    );
  });

  it('draws every wire of the gas house, and its ins and outs, from the model', () => {
    const dot = compositeDot('Gas house', GAS_HOUSE.composite!);
    const shape = GAS_HOUSE.composite!;
    const arrows = dot.split('\n').filter((l) => l.includes('->'));
    const inputs = Object.values(shape.inputs).flat().length;
    expect(arrows).toHaveLength(
      Object.keys(shape.wires).length +
        inputs +
        Object.keys(shape.outputs).length,
    );
    for (const id of Object.keys(shape.blocks))
      expect(dot).toContain(`"${id}"`);
    expect(kindName('emergency-control-valve')).toBe('Emergency control valve');
    expect(portName('ecvOpen')).toBe('ecv open');
  });

  it('draws parts as their symbols, with square lines', () => {
    const options = {
      symbols: { ecv: 'manual-valve', ssov: 'solenoid-valve' } as const,
    };
    const dot = compositeDot('Gas house', GAS_HOUSE.composite!, options);
    expect(dot).toContain('splines=ortho');
    expect(dot).toContain(`image="${SYMBOLS['manual-valve'].file}"`);
    expect(dot).toContain(`image="${SYMBOLS['solenoid-valve'].file}"`);
    expect(symbolsUsed(options).sort()).toEqual([
      'manual-valve',
      'solenoid-valve',
    ]);
    for (const s of Object.values(SYMBOLS)) expect(s.svg).toMatch(/^<svg/);
  });

  it('draws a plan with a tag for every item and the room’s doorway', () => {
    const svg = roomPlanSvg({
      title: 'Test room',
      w: 4,
      d: 3,
      doors: [{ wall: 'south', at: 0, width: 1, label: 'To corridor' }],
      items: [
        { tag: 'T-01', minX: -1, maxX: 0, minZ: -1, maxZ: 0, wall: false },
      ],
    });
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('T-01');
    expect(svg).toContain('To corridor');
  });

  it('escapes the model’s text for LaTeX', () => {
    expect(escapeLatex('33 % acid & 5_000 #1 {x} $ ~ ^ \\')).toBe(
      '33 \\% acid \\& 5\\_000 \\#1 \\{x\\} \\$ \\textasciitilde{} \\textasciicircum{} \\textbackslash{}',
    );
  });

  it('typesets a whole document, with its foreword, chapters and figures', () => {
    const tex = renderManual(manual);
    expect(tex).toContain('\\begin{document}');
    expect(tex).toContain('Rowland Fenwick, CEng MIMechE');
    expect(tex).toContain('\\chapter{The boiler house}');
    for (const f of manual.figures)
      expect(tex).toContain(`figures/${f.file}.pdf`);
    expect(tex.trimEnd().endsWith('\\end{document}')).toBe(true);
  });

  it('is a draft unless its version has an issued revision', () => {
    expect(revisionFor('0.2.0')).toBe('A');
    expect(revisionFor('0.1.0')).toMatch(/^Draft/);
  });
});

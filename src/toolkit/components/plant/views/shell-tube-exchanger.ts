import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { SHELL_TUBE } from '../logic/shell-tube-exchanger';

/**
 * A shell-and-tube pool heat exchanger (`logic/shell-tube-exchanger.ts`),
 * after Bowman's: a grey-green cast shell, black cast end covers bolted on
 * at each end round the pool water's connections, two boiler-water
 * branches on top, a brass nameplate, and two feet. Its own frame: the
 * pool water along +x, its middle on the axis.
 */
export function createShellTubeExchanger(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Shell-and-tube pool heat exchanger';
  const shell = t.paint('#8fa3a0', 0.55, 0.25);
  const cover = t.paint('#262a2b', 0.6, 0.3);
  const brass = t.paint('#b08d57', 0.4, 0.6);
  const steel = t.paint('#9aa1a1', 0.5, 0.5);
  const S = SHELL_TUBE;
  const half = S.length / 2;
  // The shell, between its end covers.
  t.cyl(
    group,
    shell,
    S.shell / 2,
    S.length - 2 * S.cover.length,
    0,
    0,
    0,
    'x',
    24,
  );
  for (const x of [-1, 1]) {
    const at = x * (half - S.cover.length / 2);
    t.cyl(
      group,
      cover,
      S.cover.diameter / 2,
      S.cover.length,
      at,
      0,
      0,
      'x',
      20,
    );
    // Its bolts round the flange.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      t.cyl(
        group,
        steel,
        0.006,
        0.012,
        x * (half - S.cover.length - 0.004),
        0.072 * Math.cos(a),
        0.072 * Math.sin(a),
        'x',
        6,
      );
    }
  }
  // The boiler-water branches on top, and the thermostat pocket.
  for (const x of [-1, 1])
    t.cyl(
      group,
      shell,
      S.branchDiameter / 2,
      S.branchTop,
      (x * S.branchCentres) / 2,
      S.branchTop / 2,
      0,
      'y',
      16,
    );
  t.cyl(
    group,
    brass,
    0.006,
    0.05,
    -half + S.cover.length / 2,
    S.cover.diameter / 2,
    0,
    'y',
    8,
  );
  // Its feet.
  for (const x of [-1, 1]) {
    t.box(
      group,
      shell,
      0.03,
      S.feetBelow - S.shell / 2 + 0.01,
      0.04,
      (x * S.feetCentres) / 2,
      -(S.feetBelow + S.shell / 2) / 2,
      0,
    );
    t.box(
      group,
      shell,
      0.05,
      0.008,
      0.16,
      (x * S.feetCentres) / 2,
      -S.feetBelow,
      0,
    );
  }
  // Its nameplate.
  t.box(group, brass, 0.07, 0.03, 0.002, 0, 0.02, S.shell / 2 + 0.001);
  const plate = createMicroLabel(kit, 'BOWMAN\nFG100', {
    height: 0.009,
    ink: '#2a2418',
    plate: '#c9a86a',
    maxWidth: 0.06,
  });
  plate.position.set(0, 0.02, S.shell / 2 + 0.003);
  group.add(plate);
  return group;
}

import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { PIPE_KINDS, createPipe } from '../../core/views/pipe-kinds';
import type { PipeOptions } from '../../core/views/pipe-kinds';
import { choosePipe, runLength } from '../../core/logic/plumber';
import type {
  Commodity,
  PipeChoice,
  PipeRequest,
} from '../../core/logic/plumber';
import type { Vec3 } from '../../core/logic/pipe-route';
import { markPipe } from './pipe-markers';
import type { PipeService } from './pipe-markers';

/**
 * The pipe helper by function (`doc/prompts/obsolete/016-pipe-helper-two-ways.md`):
 * told what a line carries, how much and, if it runs on beyond the room,
 * how far, the plumber (`logic/plumber.ts`) chooses its pipe, and the line
 * is drawn and marked. The explicit way, `createPipe(kind, od, points)`,
 * stays for decoration and exhibits.
 *
 * Until the route is the helper's too, the caller gives the points; the
 * line's length is its drawn length unless the request gives the whole.
 */

/**
 * The marking each commodity takes (BS 1710, `pipe-markers.ts`), where the
 * marker has its colours right; the rest are left unmarked until the
 * line marking is rebuilt (`doc/prompts/015-pipe-lines.md`) rather than
 * marked wrongly (mains water and DHW are not pool water; ozone is not
 * compressed air).
 */
const MARKING: Partial<
  Record<Commodity, { service: PipeService; text: string }>
> = {
  'pool-water': { service: 'pool water', text: 'POOL WATER' },
  drainage: { service: 'drainage', text: 'DRAINAGE' },
  'natural-gas': { service: 'gas', text: 'NATURAL GAS' },
  hypochlorite: { service: 'hypochlorite', text: 'SODIUM HYPOCHLORITE' },
  acid: { service: 'acid', text: 'ACID' },
  'ac-400v-3ph': { service: 'electrical', text: '400 V 3-PH' },
  'ac-230v': { service: 'electrical', text: '230 V' },
};

export function createLine(
  kit: PanelKit,
  request: PipeRequest,
  points: readonly Vec3[],
  options: PipeOptions & { label?: string } = {},
): { group: Group; choice: PipeChoice } {
  const choice = choosePipe({
    ...request,
    length: request.length ?? runLength(points),
  });
  const group = new Group();
  group.name = options.label ?? `${request.commodity} line`;
  group.userData.choice = choice;
  group.add(createPipe(choice.kind, choice.od, points, options));
  const marking = MARKING[request.commodity];
  if (marking && choice.od >= 0.02) {
    const lagging = PIPE_KINDS[choice.kind].insulation?.thickness ?? 0;
    const rating =
      'current' in request
        ? ` ${request.current} A`
        : 'flow' in request
          ? ` ${request.flow} m³/h`
          : '';
    group.add(
      markPipe(kit, points, {
        radius: choice.od / 2 + lagging,
        service: marking.service,
        text: options.label ?? `${marking.text}${rating}`,
      }),
    );
  }
  return { group, choice };
}

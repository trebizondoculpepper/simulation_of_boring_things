import { it } from 'vite-plus/test';
import { unboundIdentities } from './toolkit/gallery/logic/world-in-model';
import { schematicExpansion } from './game/plant/schematics';
it('x', () => {
  console.log(
    'ADDED',
    schematicExpansion('plant_pool_01')!.added.map((f) => f.id),
  );
  console.log('UNB', JSON.stringify(unboundIdentities('plant_pool_01')));
});

import type { Block } from '../../game/sim/blocks';
import { walkIdentified } from '../../game/plant/identification';

/** The operator's live bill of parts, generated from the saved model tree. */
export function renderPlantManual(root: Block): HTMLElement {
  const parts = walkIdentified(root);
  const shell = document.createElement('div');
  shell.className = 'directory-shell plant-manual';
  const header = document.createElement('header');
  header.className = 'directory-head';
  const back = document.createElement('a');
  back.href = '?dev';
  back.textContent = '← Dev panel';
  const title = document.createElement('h1');
  title.textContent = 'Plant bill of parts';
  const intro = document.createElement('p');
  intro.textContent =
    'Named equipment and controls in the live plant model. Room, parent and part codes form each identifier.';
  header.append(back, title, intro);
  shell.append(header);

  const table = document.createElement('table');
  const caption = document.createElement('caption');
  caption.textContent = 'Room › parent › part';
  table.append(caption);
  const head = document.createElement('thead');
  const headings = document.createElement('tr');
  for (const label of [
    'Identifier',
    'Name',
    'Class',
    'Purpose',
    'Normal',
    'Current',
  ]) {
    const th = document.createElement('th');
    th.textContent = label;
    headings.append(th);
  }
  head.append(headings);
  table.append(head);
  const body = document.createElement('tbody');
  for (const part of parts) {
    const row = document.createElement('tr');
    row.id = `part-${part.id}`;
    const fields = [
      part.id,
      `${'　'.repeat(part.depth)}${part.name}`,
      part.class,
      part.purpose,
      part.normal ?? '—',
      typeof part.state === 'object' &&
      part.state !== null &&
      'open' in part.state
        ? part.state.open
          ? 'Open'
          : 'Closed'
        : typeof part.state === 'object' &&
            part.state !== null &&
            'on' in part.state
          ? part.state.on
            ? 'On'
            : 'Off'
          : '—',
    ];
    for (const value of fields) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    body.append(row);
  }
  table.append(body);
  shell.append(table);

  const indexTitle = document.createElement('h2');
  indexTitle.textContent = 'Alphabetical index';
  const index = document.createElement('ul');
  index.className = 'plant-manual-index';
  for (const part of [...parts].sort((a, b) => a.name.localeCompare(b.name))) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#part-${part.id}`;
    link.textContent = `${part.name} · ${part.id}`;
    item.append(link);
    index.append(item);
  }
  shell.append(indexTitle, index);
  return shell;
}

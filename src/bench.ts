/**
 * The development benchmarks' page (`bench.html`, not part of the build):
 * `?bench=components` runs the component benchmark (mission 094,
 * `toolkit/gallery/views/component-bench.ts`).
 */
const root = document.querySelector<HTMLElement>('#bench');
const which = new URLSearchParams(location.search).get('bench');
if (!import.meta.env.DEV) {
  if (root)
    root.textContent = 'The benchmarks run on the development server only.';
} else if (root && which === 'components') {
  const { runComponentBench } =
    await import('./toolkit/gallery/views/component-bench');
  await runComponentBench(root);
} else if (root) {
  const p = document.createElement('p');
  p.innerHTML =
    '<a href="?bench=components&slot=bench094">Run the component benchmark</a>';
  root.append(p);
}

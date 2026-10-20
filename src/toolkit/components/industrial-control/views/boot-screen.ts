/** Green console diagnostics on the actual display surface, never an overlay. */
export function drawBootScreen(
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
  lines: readonly string[],
) {
  c.fillStyle = '#020906';
  c.fillRect(0, 0, width, height);
  c.font = `${Math.max(7, Math.floor(width / 42))}px "Courier New", monospace`;
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.fillStyle = '#a8e7bb';
  const spacing = Math.max(9, Math.floor(height / 14));
  lines.slice(-12).forEach((line, i) => c.fillText(line, 5, 5 + i * spacing));
  c.fillText('_', 5, 5 + Math.min(12, lines.length) * spacing);
}

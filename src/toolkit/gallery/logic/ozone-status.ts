/**
 * An ozone generator's state in words, for the information overlay
 * (prompt 068): what its display and lamps show, no more. It has failure
 * modes in its model, so it may say operational and tripped (the owner,
 * 2026-10-25). Pure.
 */
export function ozoneGeneratorStatus(shown: {
  powered: boolean;
  producing: boolean;
  tripped: boolean;
  message: readonly string[];
}): string {
  if (!shown.powered) return 'unpowered';
  const line = shown.message[1]?.trim() ?? '';
  if (shown.tripped) return `tripped (${line})`;
  if (/^BLOCKED/.test(line)) return 'blocked: no flow';
  if (shown.producing) return 'operational, producing ozone';
  if (/^RUNNING/.test(line)) return 'operational';
  return 'on standby';
}

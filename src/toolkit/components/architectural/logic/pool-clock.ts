/**
 * A wall clock's hands (mission 106): their angles, radians clockwise from
 * twelve, for a time in seconds after midnight. The second hand sweeps
 * (no ticks), the minute hand moves with the seconds, the hour hand with
 * the minutes. Pure.
 */
export function clockHands(clock: number) {
  const day = ((clock % 86400) + 86400) % 86400;
  const turn = Math.PI * 2;
  return {
    hour: ((day / 3600) % 12) * (turn / 12),
    minute: ((day / 60) % 60) * (turn / 60),
    second: (day % 60) * (turn / 60),
  };
}

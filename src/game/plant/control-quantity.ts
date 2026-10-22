/** A small trial contract for control messages; values carry their unit at runtime too. */
export type Quantity<Unit extends string> = Readonly<{
  value: number;
  unit: Unit;
}>;

export type Celsius = Quantity<'°C'>;
export type GramsPerHour = Quantity<'g/h'>;

export function celsius(value: number): Celsius {
  if (!Number.isFinite(value)) throw new Error('Temperature must be finite');
  return { value, unit: '°C' };
}

export function gramsPerHour(value: number): GramsPerHour {
  if (!Number.isFinite(value)) throw new Error('Flow must be finite');
  return { value, unit: 'g/h' };
}

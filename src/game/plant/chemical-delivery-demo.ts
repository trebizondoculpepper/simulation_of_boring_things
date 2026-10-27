/** A self-contained trial of supervised bulk chemical delivery. Pure logic. */
export type DeliveryChemical = 'hypochlorite' | 'acid';

export const DELIVERY_TANKS = {
  hypochlorite: { count: 3, eachLitres: 4000, concentration: 14, rateLpm: 100 },
  acid: { count: 1, eachLitres: 4000, concentration: 10, rateLpm: 60 },
} as const;

export type DeliveryState = {
  chemical: DeliveryChemical;
  /** The tanker hose is attached to this product-specific inlet on arrival. */
  hoseConnected: boolean;
  tankerLitres: number;
  tanksLitres: number[];
  valveOpen: boolean;
  enabled: boolean;
  emergencyStopped: boolean;
  highAlarm: boolean;
  deliveredLitres: number;
};

export const capacityOf = (s: DeliveryState) =>
  DELIVERY_TANKS[s.chemical].count * DELIVERY_TANKS[s.chemical].eachLitres;
export const stockOf = (s: DeliveryState) =>
  s.tanksLitres.reduce((total, tank) => total + tank, 0);
export const roomFor = (s: DeliveryState) => capacityOf(s) - stockOf(s);
export const deliveryRunning = (s: DeliveryState) =>
  s.hoseConnected &&
  s.enabled &&
  s.valveOpen &&
  !s.emergencyStopped &&
  !s.highAlarm &&
  s.tankerLitres > 0 &&
  roomFor(s) > 0;

export function newDeliveryState(chemical: DeliveryChemical): DeliveryState {
  const spec = DELIVERY_TANKS[chemical];
  return {
    chemical,
    hoseConnected: true,
    tankerLitres: spec.eachLitres,
    tanksLitres: Array(spec.count).fill(spec.eachLitres * 0.35),
    valveOpen: false,
    enabled: false,
    emergencyStopped: false,
    highAlarm: false,
    deliveredLitres: 0,
  };
}

/** The connected tanker transfers only into its own tanks, filling them in order. */
export function stepDelivery(s: DeliveryState, seconds: number): DeliveryState {
  if (!deliveryRunning(s) || seconds <= 0) return s;
  const spec = DELIVERY_TANKS[s.chemical];
  let moved = Math.min(
    (spec.rateLpm * seconds) / 60,
    s.tankerLitres,
    Math.max(0, capacityOf(s) * 0.98 - stockOf(s)),
  );
  const transferred = moved;
  const tanksLitres = s.tanksLitres.map((tank) => {
    const add = Math.min(spec.eachLitres - tank, moved);
    moved -= add;
    return tank + add;
  });
  const stock = tanksLitres.reduce((sum, tank) => sum + tank, 0);
  // An independent high-high trip shuts the transfer before geometric full.
  const highAlarm = stock >= capacityOf(s) * 0.98 - 1e-6;
  return {
    ...s,
    tanksLitres,
    tankerLitres: s.tankerLitres - transferred,
    deliveredLitres: s.deliveredLitres + transferred,
    highAlarm,
    enabled: highAlarm ? false : s.enabled,
  };
}

export function resetDelivery(s: DeliveryState): DeliveryState {
  if (s.emergencyStopped) return { ...s, emergencyStopped: false };
  return s;
}

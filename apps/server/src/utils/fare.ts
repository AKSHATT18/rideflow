export type VehicleType = 'ECONOMY' | 'COMFORT' | 'PREMIUM';

interface FareRule {
  baseFare: number;
  perKm: number;
  perMin: number;
}

const FARE_RULES: Record<VehicleType, FareRule> = {
  ECONOMY: { baseFare: 50, perKm: 12, perMin: 2 },
  COMFORT: { baseFare: 80, perKm: 16, perMin: 2.5 },
  PREMIUM: { baseFare: 150, perKm: 25, perMin: 4 },
};

/**
 * Calculates estimated or final fare based on distance, duration, and vehicle type.
 * Server-authoritative calculation.
 */
export const calculateFare = (
  distanceKm: number,
  durationMin: number,
  vehicleType: string
): number => {
  const type = (vehicleType.toUpperCase() in FARE_RULES
    ? vehicleType.toUpperCase()
    : 'ECONOMY') as VehicleType;

  const rules = FARE_RULES[type];
  const total = rules.baseFare + (distanceKm * rules.perKm) + (durationMin * rules.perMin);
  return Math.round(total);
};

export type VehicleType = 'ECONOMY' | 'COMFORT' | 'PREMIUM';

export interface FareEstimate {
  type: VehicleType;
  name: string;
  description: string;
  amount: number;
  currency: string;
}

const FARE_RULES = {
  ECONOMY: { baseFare: 50, perKm: 12, perMin: 2 },
  COMFORT: { baseFare: 80, perKm: 16, perMin: 2.5 },
  PREMIUM: { baseFare: 150, perKm: 25, perMin: 4 },
};

/**
 * Calculates estimated fare based on distance and duration.
 * This is an isolated, development-only formula.
 */
export const calculateFare = (
  distanceKm: number,
  durationMin: number,
  type: VehicleType
): number => {
  const rules = FARE_RULES[type];
  const total = rules.baseFare + (distanceKm * rules.perKm) + (durationMin * rules.perMin);
  return Math.round(total);
};

export const getVehicleOptions = (distanceKm: number, durationMin: number): FareEstimate[] => {
  return [
    {
      type: 'ECONOMY',
      name: 'Economy',
      description: 'Everyday rides',
      amount: calculateFare(distanceKm, durationMin, 'ECONOMY'),
      currency: '₹',
    },
    {
      type: 'COMFORT',
      name: 'Comfort',
      description: 'More space',
      amount: calculateFare(distanceKm, durationMin, 'COMFORT'),
      currency: '₹',
    },
    {
      type: 'PREMIUM',
      name: 'Premium',
      description: 'Premium experience',
      amount: calculateFare(distanceKm, durationMin, 'PREMIUM'),
      currency: '₹',
    },
  ];
};

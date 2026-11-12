import { describe, it, expect } from 'vitest';
import { calculateFare, getVehicleOptions } from './fare';

describe('Fare Calculation', () => {
  it('should calculate ECONOMY fare correctly', () => {
    // 50 + (10 * 12) + (30 * 2) = 50 + 120 + 60 = 230
    const fare = calculateFare(10, 30, 'ECONOMY');
    expect(fare).toBe(230);
  });

  it('should calculate COMFORT fare correctly', () => {
    // 80 + (10 * 16) + (30 * 2.5) = 80 + 160 + 75 = 315
    const fare = calculateFare(10, 30, 'COMFORT');
    expect(fare).toBe(315);
  });

  it('should calculate PREMIUM fare correctly', () => {
    // 150 + (10 * 25) + (30 * 4) = 150 + 250 + 120 = 520
    const fare = calculateFare(10, 30, 'PREMIUM');
    expect(fare).toBe(520);
  });

  it('should return all vehicle options', () => {
    const options = getVehicleOptions(5, 15);
    expect(options).toHaveLength(3);
    expect(options[0].type).toBe('ECONOMY');
    expect(options[1].type).toBe('COMFORT');
    expect(options[2].type).toBe('PREMIUM');
    
    // Check Economy for 5km, 15m: 50 + 60 + 30 = 140
    expect(options[0].amount).toBe(140);
  });
});

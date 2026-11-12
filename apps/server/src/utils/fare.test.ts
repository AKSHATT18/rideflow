import { describe, it, expect } from 'vitest';
import { calculateFare } from './fare';
import { createRideSchema, locationUpdateSchema } from './rideValidation';

describe('Server Fare Calculation', () => {
  it('calculates ECONOMY fare correctly with base fare, distance, and duration', () => {
    // 50 base + (10 * 12) + (20 * 2) = 50 + 120 + 40 = 210
    const fare = calculateFare(10, 20, 'ECONOMY');
    expect(fare).toBe(210);
  });

  it('calculates COMFORT fare correctly', () => {
    // 80 base + (10 * 16) + (20 * 2.5) = 80 + 160 + 50 = 290
    const fare = calculateFare(10, 20, 'COMFORT');
    expect(fare).toBe(290);
  });

  it('calculates PREMIUM fare correctly', () => {
    // 150 base + (10 * 25) + (20 * 4) = 150 + 250 + 80 = 480
    const fare = calculateFare(10, 20, 'PREMIUM');
    expect(fare).toBe(480);
  });

  it('defaults invalid vehicle types to ECONOMY without crashing', () => {
    const fare = calculateFare(10, 20, 'UNKNOWN');
    expect(fare).toBe(210);
  });
});

describe('Ride Input Validation', () => {
  it('accepts valid ride creation input', () => {
    const validData = {
      pickupLat: 12.9716,
      pickupLng: 77.5946,
      pickupAddress: 'MG Road, Bangalore',
      destinationLat: 12.9352,
      destinationLng: 77.6245,
      destinationAddress: 'Koramangala, Bangalore',
      vehicleType: 'ECONOMY',
      estimatedDistanceKm: 6.5,
      estimatedDurationMin: 22,
    };
    const result = createRideSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects coordinates out of bounds', () => {
    const invalidData = {
      pickupLat: 95.0, // Invalid latitude (> 90)
      pickupLng: 77.5946,
      pickupAddress: 'MG Road',
      destinationLat: 12.9352,
      destinationLng: 195.0, // Invalid longitude (> 180)
      destinationAddress: 'Koramangala',
      vehicleType: 'ECONOMY',
      estimatedDistanceKm: 5,
      estimatedDurationMin: 15,
    };
    const result = createRideSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('validates locationUpdateSchema correctly', () => {
    const validLocation = {
      rideId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      latitude: 12.9716,
      longitude: 77.5946,
      timestamp: Date.now(),
    };
    expect(locationUpdateSchema.safeParse(validLocation).success).toBe(true);

    const invalidLocation = {
      rideId: 'not-a-uuid',
      latitude: 200,
      longitude: 77.5946,
      timestamp: -5,
    };
    expect(locationUpdateSchema.safeParse(invalidLocation).success).toBe(false);
  });
});

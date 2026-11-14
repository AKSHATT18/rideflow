import { describe, it, expect, vi, beforeEach } from 'vitest';
import { haversineDistance, fetchDrivingRoute } from './routingService';

describe('OpenFreeMap Road Routing Service', () => {
  const koramangala = { lat: 12.9352, lng: 77.6245 };
  const mgRoad = { lat: 12.9756, lng: 77.6066 };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calculates correct straight-line distance via Haversine', () => {
    const dist = haversineDistance(koramangala, mgRoad);
    expect(dist).toBeGreaterThan(4);
    expect(dist).toBeLessThan(6);
  });

  it('fetches real road route geometry from OSRM', async () => {
    // Mock successful OSRM response
    const mockOsmResponse = {
      code: 'Ok',
      routes: [
        {
          distance: 7200, // 7.2 km
          duration: 1260, // 21 minutes
          geometry: {
            coordinates: [
              [77.6245, 12.9352],
              [77.6150, 12.9500],
              [77.6066, 12.9756],
            ],
          },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockOsmResponse,
    } as any);

    const route = await fetchDrivingRoute(koramangala, mgRoad);
    expect(route.distanceKm).toBe(7.2);
    expect(route.durationMin).toBe(21);
    expect(route.distanceText).toBe('7.2 km');
    expect(route.durationText).toBe('21 mins');
    expect(route.coordinates).toEqual([
      [77.6245, 12.9352],
      [77.6150, 12.9500],
      [77.6066, 12.9756],
    ]);
  });

  it('throws clear error when routing service reports no route found', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 'NoRoute', message: 'Impossible route' }),
    } as any);

    await expect(fetchDrivingRoute(koramangala, mgRoad)).rejects.toThrow(
      'Impossible route'
    );
  });
});

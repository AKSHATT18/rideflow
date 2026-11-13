import { describe, it, expect } from 'vitest';
import { searchPlaces, POPULAR_LANDMARKS, reverseGeocode } from './geocodingService';

describe('Zero-Cost Geocoding Service', () => {
  it('returns popular landmarks when search query is empty', async () => {
    const results = await searchPlaces('');
    expect(results.length).toBeGreaterThanOrEqual(4);
    expect(results[0].placeId).toBe(POPULAR_LANDMARKS[0].placeId);
  });

  it('matches local landmark database instantly without network call', async () => {
    const results = await searchPlaces('Airport');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].mainText).toContain('Airport');
  });

  it('falls back gracefully on reverseGeocode', async () => {
    const address = await reverseGeocode(12.9716, 77.5946);
    expect(address).toBeDefined();
    expect(typeof address).toBe('string');
  });
});

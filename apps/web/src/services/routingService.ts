export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  distanceText: string;
  durationText: string;
  coordinates: [number, number][]; // [longitude, latitude] for GeoJSON / MapLibre
}

export interface Coords {
  lat: number;
  lng: number;
}

/**
 * Calculates straight-line distance in kilometers using the Haversine formula
 */
export const haversineDistance = (p1: Coords, p2: Coords): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Fetches real driving road route between two points using the Open Source Routing Machine (OSRM)
 * returning actual road geometry, road distance, and travel time.
 */
export const fetchDrivingRoute = async (start: Coords, end: Coords): Promise<RouteResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Routing service returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
      const durationMin = Math.max(1, Math.round(route.duration / 60));

      // GeoJSON coordinates are [longitude, latitude]
      const coordinates: [number, number][] = route.geometry.coordinates;

      return {
        distanceKm,
        durationMin,
        distanceText: `${distanceKm.toFixed(1)} km`,
        durationText: `${durationMin} mins`,
        coordinates,
      };
    }

    throw new Error(data.message || 'No drivable route found between the selected locations');
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Routing service timed out. Please check your network connection.');
    }
    throw error;
  }
};

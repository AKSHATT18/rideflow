export interface PlaceResult {
  placeId: string;
  mainText: string;
  secondaryText: string;
  address: string;
  lat: number;
  lng: number;
}

// Curated verified real geographic landmarks in Bengaluru for instant selection
export const POPULAR_LANDMARKS: PlaceResult[] = [
  {
    placeId: 'osm-blr-airport',
    mainText: 'Kempegowda International Airport (BLR)',
    secondaryText: 'Devanahalli, Bengaluru, Karnataka',
    address: 'Kempegowda International Airport, Devanahalli, Bengaluru, Karnataka 560300',
    lat: 13.1986,
    lng: 77.7066,
  },
  {
    placeId: 'osm-blr-mg-road',
    mainText: 'MG Road Metro Station',
    secondaryText: 'Shivaji Nagar, Bengaluru, Karnataka',
    address: 'Mahatma Gandhi Road, Shivaji Nagar, Bengaluru, Karnataka 560001',
    lat: 12.9756,
    lng: 77.6066,
  },
  {
    placeId: 'osm-blr-indiranagar',
    mainText: '100 Feet Road, Indiranagar',
    secondaryText: 'Indiranagar, Bengaluru, Karnataka',
    address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
    lat: 12.9784,
    lng: 77.6408,
  },
  {
    placeId: 'osm-blr-koramangala',
    mainText: 'Koramangala 5th Block',
    secondaryText: 'Near Sony World Signal, Bengaluru',
    address: '5th Block, Koramangala, Bengaluru, Karnataka 560095',
    lat: 12.9352,
    lng: 77.6245,
  },
  {
    placeId: 'osm-blr-whitefield',
    mainText: 'ITPL Main Gate, Whitefield',
    secondaryText: 'Whitefield, Bengaluru, Karnataka',
    address: 'International Tech Park, Whitefield Main Rd, Bengaluru, Karnataka 560066',
    lat: 12.9866,
    lng: 77.7314,
  },
  {
    placeId: 'osm-blr-electronic-city',
    mainText: 'Electronic City Phase 1',
    secondaryText: 'Hosur Road, Bengaluru, Karnataka',
    address: 'Electronic City Phase 1, Bengaluru, Karnataka 560100',
    lat: 12.8452,
    lng: 77.6602,
  },
  {
    placeId: 'osm-blr-cubbon-park',
    mainText: 'Cubbon Park (Kasturba Road Entrance)',
    secondaryText: 'Sampangi Rama Nagar, Bengaluru',
    address: 'Kasturba Rd, Sampangi Rama Nagar, Bengaluru, Karnataka 560001',
    lat: 12.9738,
    lng: 77.5906,
  },
];

/**
 * Searches real geographic locations using the free OpenStreetMap-powered Photon API
 * (by Komoot), respecting usage policies and rate limits.
 */
export const searchPlaces = async (query: string): Promise<PlaceResult[]> => {
  const trimmed = query.trim();
  if (!trimmed) {
    return POPULAR_LANDMARKS.slice(0, 5);
  }

  // Check verified local landmarks first
  const lowerQuery = trimmed.toLowerCase();
  const localMatches = POPULAR_LANDMARKS.filter(
    (item) =>
      item.mainText.toLowerCase().includes(lowerQuery) ||
      item.secondaryText.toLowerCase().includes(lowerQuery) ||
      item.address.toLowerCase().includes(lowerQuery)
  );

  if (trimmed.length < 3) {
    return localMatches;
  }

  // Real geographic search using Photon API (OpenStreetMap data)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=6`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const results: PlaceResult[] = (data.features || []).map((feat: any, idx: number) => {
        const props = feat.properties || {};
        const coords = feat.geometry?.coordinates || [0, 0]; // [lng, lat]
        const mainText = props.name || props.street || props.city || trimmed;
        const details = [props.street, props.district, props.city, props.state, props.country].filter(Boolean);
        const secondaryText = details.slice(0, 3).join(', ');

        return {
          placeId: `osm-${props.osm_type || 'node'}-${props.osm_id || idx}`,
          mainText,
          secondaryText: secondaryText || 'Geographic Location',
          address: `${mainText}${secondaryText ? ', ' + secondaryText : ''}`,
          lat: coords[1],
          lng: coords[0],
        };
      });

      // Combine matches ensuring no duplicate addresses
      const combined = [...localMatches];
      for (const r of results) {
        if (!combined.some((c) => c.address.toLowerCase() === r.address.toLowerCase())) {
          combined.push(r);
        }
      }
      return combined.slice(0, 6);
    }
  } catch (_e) {
    // If external service fails, return local matches without fabricating results
  }

  return localMatches;
};

/**
 * Reverse geocodes real latitude and longitude into actual street/area names
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'RideFlow-OpenFreeMap-Demo/1.0',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.display_name) {
        const parts = data.display_name.split(',');
        return parts.slice(0, 3).join(',').trim();
      }
    }
  } catch (_e) {}

  return `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
};

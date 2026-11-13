import { createContext, useContext, type ReactNode } from 'react';

interface MapContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  provider: 'openfreemap';
  styleUrl: string;
}

export const OPENFREEMAP_LIBERTY_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const MapContext = createContext<MapContextType>({
  isLoaded: true,
  loadError: undefined,
  provider: 'openfreemap',
  styleUrl: OPENFREEMAP_LIBERTY_STYLE,
});

export const useGoogleMaps = () => useContext(MapContext);
export const useMap = () => useContext(MapContext);

/**
 * OpenFreeMap Provider
 * Uses real OpenStreetMap-based vector tiles served by OpenFreeMap and rendered via MapLibre GL JS.
 * Official Repository: https://github.com/hyperknot/openfreemap
 * Official Style: https://tiles.openfreemap.org/styles/liberty
 * Completely zero-cost; no Google Maps API keys or cloud billing required.
 */
export const OpenFreeMapProvider = ({ children }: { children: ReactNode }) => {
  return (
    <MapContext.Provider
      value={{
        isLoaded: true,
        loadError: undefined,
        provider: 'openfreemap',
        styleUrl: OPENFREEMAP_LIBERTY_STYLE,
      }}
    >
      {children}
    </MapContext.Provider>
  );
};

export const MapProvider = OpenFreeMapProvider;
export const GoogleMapsProvider = OpenFreeMapProvider;

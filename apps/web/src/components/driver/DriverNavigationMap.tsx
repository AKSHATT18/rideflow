import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Map,
  setWorkerUrl,
  Marker,
  LngLatBounds,
  NavigationControl,
  AttributionControl,
  type GeoJSONSource,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useRideStore } from '../../store/rideStore';
import { fetchDrivingRoute, type RouteResult, type Coords } from '../../services/routingService';
import { OPENFREEMAP_LIBERTY_STYLE } from '../maps/MapProvider';
import { Navigation, Compass, AlertCircle, Loader2 } from 'lucide-react';

setWorkerUrl(workerUrl);

const ROUTE_SOURCE_ID = 'driver-nav-route-source';
const ROUTE_LAYER_ID = 'driver-nav-route-layer';

export const DriverNavigationMap = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const driverMarkerRef = useRef<Marker | null>(null);
  const targetMarkerRef = useRef<Marker | null>(null);

  const { activeRide, status, driverLocation } = useRideStore();

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [routeDetails, setRouteDetails] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const isInProgress = status === 'IN_PROGRESS';

  // Determine current active navigation target:
  // Pre-trip (assigned/arriving/arrived): Navigating to PICKUP
  // In-trip (in_progress): Navigating to DESTINATION
  const targetCoords: Coords | null = activeRide
    ? isInProgress
      ? { lat: activeRide.destinationLat, lng: activeRide.destinationLng }
      : { lat: activeRide.pickupLat, lng: activeRide.pickupLng }
    : null;

  const targetAddress = activeRide
    ? isInProgress
      ? activeRide.destinationAddress
      : activeRide.pickupAddress
    : '';

  // Get current driver coordinates:
  // Uses streaming GPS if available; otherwise uses pickup with small offset or destination
  const currentDriverCoords: Coords = driverLocation
    ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
    : activeRide
    ? isInProgress
      ? { lat: activeRide.pickupLat, lng: activeRide.pickupLng }
      : { lat: activeRide.pickupLat - 0.008, lng: activeRide.pickupLng - 0.008 }
    : { lat: 12.9716, lng: 77.5946 };

  // Recenter map camera over current route and driver marker
  const handleRecenter = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeDetails && routeDetails.coordinates.length > 0) {
      const bounds = new LngLatBounds();
      routeDetails.coordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      bounds.extend([currentDriverCoords.lng, currentDriverCoords.lat]);
      if (targetCoords) bounds.extend([targetCoords.lng, targetCoords.lat]);

      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 16,
        duration: 900,
      });
    } else if (targetCoords) {
      map.flyTo({
        center: [currentDriverCoords.lng, currentDriverCoords.lat],
        zoom: 15,
        duration: 800,
      });
    }
  }, [routeDetails, currentDriverCoords, targetCoords]);

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = new Map({
        container: mapContainerRef.current,
        style: OPENFREEMAP_LIBERTY_STYLE,
        center: [currentDriverCoords.lng, currentDriverCoords.lat],
        zoom: 14,
        attributionControl: false,
      });

      map.addControl(new NavigationControl({ showCompass: true }), 'bottom-right');
      map.addControl(
        new AttributionControl({
          compact: true,
          customAttribution:
            '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
        }),
        'bottom-left'
      );

      map.on('load', () => {
        setIsMapLoaded(true);
      });

      mapInstanceRef.current = map;
    } catch (err) {
      console.error('Failed to initialize Driver Navigation Map:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Responsive resize
  useEffect(() => {
    if (!mapContainerRef.current || !mapInstanceRef.current) return;
    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.resize();
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch / Switch OSRM Road Route when navigation phase changes or significant update
  useEffect(() => {
    if (!targetCoords) return;

    let isMounted = true;
    setIsLoadingRoute(true);
    setRouteError(null);

    fetchDrivingRoute(currentDriverCoords, targetCoords)
      .then((route) => {
        if (!isMounted) return;
        setRouteDetails(route);
        setIsLoadingRoute(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Navigation routing notice:', err.message);
        setRouteError('Direct route preview active (OSRM reconnecting)');
        setIsLoadingRoute(false);
      });

    return () => {
      isMounted = false;
    };
  }, [status, isInProgress, activeRide?.id]);

  // Render Route Polyline Layer on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded) return;

    if (!routeDetails || routeDetails.coordinates.length === 0) {
      if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
      if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
      return;
    }

    const geojsonData: {
      type: 'Feature';
      properties: Record<string, any>;
      geometry: {
        type: 'LineString';
        coordinates: [number, number][];
      };
    } = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: routeDetails.coordinates,
      },
    };

    const existingSource = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(geojsonData);
    } else {
      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: geojsonData,
      });

      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': isInProgress ? '#2563eb' : '#059669', // Blue for trip to dropoff, Green for pickup
          'line-width': 5,
          'line-opacity': 0.88,
        },
      });
    }

    handleRecenter();
  }, [isMapLoaded, routeDetails, isInProgress]);

  // Update Driver Vehicle Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!driverMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'driver-nav-marker';
      el.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          background: #111827;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          position: relative;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          <span style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: rgba(16, 185, 129, 0.4);
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            z-index: -1;
          "></span>
        </div>
      `;
      driverMarkerRef.current = new Marker({ element: el })
        .setLngLat([currentDriverCoords.lng, currentDriverCoords.lat])
        .addTo(map);
    } else {
      driverMarkerRef.current.setLngLat([currentDriverCoords.lng, currentDriverCoords.lat]);
    }
  }, [currentDriverCoords.lat, currentDriverCoords.lng]);

  // Update Target Marker (Pickup or Dropoff)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !targetCoords) return;

    if (targetMarkerRef.current) {
      targetMarkerRef.current.remove();
      targetMarkerRef.current = null;
    }

    const el = document.createElement('div');
    el.className = 'nav-target-marker';
    const bgColor = isInProgress ? '#ef4444' : '#059669'; // Red flag for dropoff, Green pin for pickup
    el.innerHTML = `
      <div style="
        width: 30px;
        height: 30px;
        background: ${bgColor};
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${
            isInProgress
              ? '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>'
              : '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'
          }
        </svg>
      </div>
    `;

    targetMarkerRef.current = new Marker({ element: el })
      .setLngLat([targetCoords.lng, targetCoords.lat])
      .addTo(map);

    return () => {
      if (targetMarkerRef.current) {
        targetMarkerRef.current.remove();
        targetMarkerRef.current = null;
      }
    };
  }, [targetCoords?.lat, targetCoords?.lng, isInProgress]);

  return (
    <div className="relative w-full h-[320px] md:h-[420px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
      {/* MapLibre Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Navigation HUD Card */}
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="bg-white/95 backdrop-blur-md rounded-xl p-3.5 shadow-md border border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white ${
                isInProgress ? 'bg-blue-600' : 'bg-emerald-600'
              }`}
            >
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {isInProgress ? 'Destination' : 'Pickup Point'}
                </span>
                {isLoadingRoute && (
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Routing...
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-gray-900 truncate mt-0.5">
                {targetAddress || 'Calculating route...'}
              </p>
            </div>
          </div>

          {/* Route distance and ETA */}
          {routeDetails && (
            <div className="shrink-0 text-right pl-2 border-l border-gray-100">
              <span className="text-sm font-extrabold text-gray-900 block leading-tight">
                {routeDetails.distanceText}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">
                ~{routeDetails.durationText}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recenter / Overview Floating Button */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          onClick={handleRecenter}
          className="bg-white hover:bg-gray-50 text-gray-800 p-2.5 rounded-xl shadow-md border border-gray-200 flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95"
          title="Recenter route view"
        >
          <Compass className="w-4 h-4 text-brand-600" />
          <span className="hidden sm:inline">Recenter</span>
        </button>
      </div>

      {/* Route Error Notification */}
      {routeError && (
        <div className="absolute bottom-4 left-4 z-10 max-w-xs">
          <div className="bg-amber-50/95 border border-amber-200 text-amber-800 text-[11px] px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{routeError}</span>
          </div>
        </div>
      )}
    </div>
  );
};

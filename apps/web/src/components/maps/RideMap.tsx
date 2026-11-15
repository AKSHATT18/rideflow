import { useEffect, useRef, useState } from 'react';
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
import { useBookingStore } from '../../store/bookingStore';
import { useRideStore } from '../../store/rideStore';
import { fetchDrivingRoute } from '../../services/routingService';
import { OPENFREEMAP_LIBERTY_STYLE } from './MapProvider';
import { Loader2, AlertCircle } from 'lucide-react';

// Configure MapLibre Web Worker for Vite according to OpenFreeMap Quick Start Guide
setWorkerUrl(workerUrl);

// Default initial center: Bengaluru [lng, lat]
const DEFAULT_CENTER: [number, number] = [77.5946, 12.9716];
const ROUTE_SOURCE_ID = 'rideflow-route-source';
const ROUTE_LAYER_ID = 'rideflow-route-layer';

export const RideMap = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const pickupMarkerRef = useRef<Marker | null>(null);
  const destinationMarkerRef = useRef<Marker | null>(null);
  const driverMarkerRef = useRef<Marker | null>(null);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const { pickup, destination, setRouteDetails, setState } = useBookingStore();
  const { driverLocation } = useRideStore();

  // Initialize MapLibre GL map with OpenFreeMap Liberty style
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = new Map({
        container: mapContainerRef.current,
        style: OPENFREEMAP_LIBERTY_STYLE,
        center: pickup ? [pickup.lng, pickup.lat] : DEFAULT_CENTER,
        zoom: 13,
        attributionControl: false, // Customized below with official OSM & OpenFreeMap attribution
      });

      // Add zoom & rotation controls
      map.addControl(new NavigationControl({ showCompass: true }), 'bottom-right');

      // Add official OpenFreeMap and OpenStreetMap attribution
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
        setMapError(null);
      });

      map.on('error', (e) => {
        // Filter out benign tile cancellation errors during rapid pan/zoom
        if (e.error && !e.error.message?.includes('abort')) {
          console.warn('MapLibre notice:', e.error.message);
        }
      });

      mapInstanceRef.current = map;
    } catch (err: any) {
      console.error('Failed to initialize OpenFreeMap MapLibre:', err);
      setMapError('Failed to initialize map canvas. Please refresh or check WebGL support.');
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Resize map when container dimensions change (responsive layout support)
  useEffect(() => {
    if (!mapContainerRef.current || !mapInstanceRef.current) return;
    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.resize();
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update Pickup and Destination Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Pickup Marker
    if (pickup) {
      if (!pickupMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'pickup-marker';
        el.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background: #111827;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <div style="width: 6px; height: 6px; background: #ffffff; border-radius: 50%;"></div>
          </div>
        `;
        pickupMarkerRef.current = new Marker({ element: el })
          .setLngLat([pickup.lng, pickup.lat])
          .addTo(map);
      } else {
        pickupMarkerRef.current.setLngLat([pickup.lng, pickup.lat]);
      }
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    // 2. Destination Marker
    if (destination) {
      if (!destinationMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'destination-marker';
        el.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background: #059669;
            border: 3px solid #ffffff;
            border-radius: 6px;
            box-shadow: 0 4px 14px rgba(5,150,105,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <div style="width: 6px; height: 6px; background: #ffffff; border-radius: 1px;"></div>
          </div>
        `;
        destinationMarkerRef.current = new Marker({ element: el })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map);
      } else {
        destinationMarkerRef.current.setLngLat([destination.lng, destination.lat]);
      }
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    // Camera pan when only pickup is selected
    if (pickup && !destination && isMapLoaded) {
      map.easeTo({ center: [pickup.lng, pickup.lat], zoom: 14, duration: 800 });
    }
  }, [pickup, destination, isMapLoaded]);

  // Calculate real road route and render GeoJSON route polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded) return;

    if (pickup && destination) {
      setState('CALCULATING_ROUTE');
      setRouteError(null);

      fetchDrivingRoute(
        { lat: pickup.lat, lng: pickup.lng },
        { lat: destination.lat, lng: destination.lng }
      )
        .then((route) => {
          if (!mapInstanceRef.current) return;

          const currentMap = mapInstanceRef.current;
          const geojson: {
            type: 'Feature';
            properties: Record<string, unknown>;
            geometry: {
              type: 'LineString';
              coordinates: [number, number][];
            };
          } = {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: route.coordinates, // [lng, lat]
            },
          };

          // Update or create GeoJSON source
          const existingSource = currentMap.getSource(ROUTE_SOURCE_ID) as GeoJSONSource;
          if (existingSource) {
            existingSource.setData(geojson);
          } else {
            currentMap.addSource(ROUTE_SOURCE_ID, {
              type: 'geojson',
              data: geojson,
            });

            currentMap.addLayer({
              id: ROUTE_LAYER_ID,
              type: 'line',
              source: ROUTE_SOURCE_ID,
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#059669', // RideFlow emerald accent
                'line-width': 5,
                'line-opacity': 0.88,
              },
            });
          }

          // Auto-fit camera to enclose the entire calculated route
          const bounds = new LngLatBounds();
          route.coordinates.forEach((coord) => bounds.extend(coord));
          currentMap.fitBounds(bounds, {
            padding: { top: 70, bottom: 70, left: 70, right: 70 },
            maxZoom: 16,
            duration: 900,
          });

          setRouteDetails({
            distanceKm: route.distanceKm,
            durationMin: route.durationMin,
            distanceText: route.distanceText,
            durationText: route.durationText,
          });

          setState('ROUTE_READY');
        })
        .catch((err: any) => {
          console.error('Route calculation error:', err);
          setRouteError(err.message || 'Unable to calculate road route between selected locations.');
          setState('SELECTING_DESTINATION');
        });
    } else {
      // Clear route polyline if either point is removed
      if (map.getLayer(ROUTE_LAYER_ID)) {
        map.removeLayer(ROUTE_LAYER_ID);
      }
      if (map.getSource(ROUTE_SOURCE_ID)) {
        map.removeSource(ROUTE_SOURCE_ID);
      }
    }
  }, [pickup, destination, isMapLoaded, setState, setRouteDetails]);

  // Live Driver Location Marker (Socket.IO Real-Time Stream)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (driverLocation) {
      const lngLat: [number, number] = [driverLocation.longitude, driverLocation.latitude];

      if (!driverMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'driver-vehicle-marker';
        el.innerHTML = `
          <div style="
            width: 36px;
            height: 36px;
            background: #111827;
            border: 2.5px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 6px 18px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            transition: transform 0.2s ease;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          </div>
        `;
        driverMarkerRef.current = new Marker({ element: el })
          .setLngLat(lngLat)
          .addTo(map);
      } else {
        driverMarkerRef.current.setLngLat(lngLat);
      }

      // Smooth camera follow for driver position
      map.easeTo({ center: lngLat, duration: 800 });
    } else if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }
  }, [driverLocation]);

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-inner border border-gray-100 bg-neutral-100">
      {/* MapLibre DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Loading Overlay */}
      {!isMapLoaded && !mapError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-2" />
          <p className="text-sm font-semibold text-gray-700">Loading OpenFreeMap tiles...</p>
        </div>
      )}

      {/* Route Error Notification */}
      {routeError && (
        <div className="absolute top-4 left-4 right-4 z-30 mx-auto max-w-md bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{routeError}</span>
        </div>
      )}

      {/* Map Canvas Error */}
      {mapError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">Map Display Unavailable</h3>
          <p className="text-xs text-gray-500 max-w-xs">{mapError}</p>
        </div>
      )}
    </div>
  );
};

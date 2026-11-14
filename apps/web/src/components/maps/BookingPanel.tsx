import { useState, useEffect } from 'react';
import { useBookingStore } from '../../store/bookingStore';
import { LocationAutocomplete } from './LocationAutocomplete';
import { Navigation, MapPin, Navigation2, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '../Button';
import { getVehicleOptions } from '../../lib/fare';
import type { FareEstimate } from '../../lib/fare';
import { api } from '../../lib/axios';
import { useRideStore } from '../../store/rideStore';
import { reverseGeocode, POPULAR_LANDMARKS } from '../../services/geocodingService';
import { cn } from '../../lib/utils';

export const BookingPanel = () => {
  const { 
    state, setState, 
    pickup, setPickup, 
    destination, setDestination, 
    routeDetails, selectedVehicle, setSelectedVehicle 
  } = useBookingStore();

  const { setActiveRide, joinRideRoom } = useRideStore();

  const [vehicles, setVehicles] = useState<FareEstimate[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Initialize flow
  useEffect(() => {
    if (state === 'IDLE') {
      setState('SELECTING_PICKUP');
    }
  }, [state, setState]);

  // When route is ready, calculate fares
  useEffect(() => {
    if (state === 'ROUTE_READY' && routeDetails) {
      setVehicles(getVehicleOptions(routeDetails.distanceKm, routeDetails.durationMin));
      setState('SELECTING_VEHICLE');
    }
  }, [state, routeDetails, setState]);

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
        setPickup({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address,
        });
        setIsLocating(false);
        if (!destination) {
          setState('SELECTING_DESTINATION');
        }
      },
      (_error) => {
        setGeoError('Unable to retrieve your location');
        setIsLocating(false);
      },
      { timeout: 10000, maximumAge: 0 }
    );
  };

  const handleQuickSelectDestination = (landmark: typeof POPULAR_LANDMARKS[0]) => {
    setDestination({
      address: landmark.address,
      lat: landmark.lat,
      lng: landmark.lng,
      placeId: landmark.placeId,
    });
    if (pickup) {
      setState('CALCULATING_ROUTE');
    } else {
      setState('SELECTING_PICKUP');
    }
  };

  const handleRequestRide = async () => {
    if (!pickup || !destination || !routeDetails || !selectedVehicle) return;

    setIsRequesting(true);
    setGeoError(null);

    try {
      const response = await api.post('/rides', {
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        pickupAddress: pickup.address,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
        destinationAddress: destination.address,
        vehicleType: selectedVehicle,
        estimatedDistanceKm: routeDetails.distanceKm,
        estimatedDurationMin: routeDetails.durationMin,
      });

      const ride = response.data.data.ride;
      setActiveRide(ride.id, ride.status, ride);
      joinRideRoom(ride.id);
    } catch (err: any) {
      setGeoError(err.response?.data?.message || 'Failed to request ride');
      setIsRequesting(false);
    }
  };

  return (
    <div className="bg-white rounded-t-3xl lg:rounded-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.1)] lg:shadow-lg border-t lg:border border-gray-100 flex flex-col overflow-hidden h-[65vh] lg:h-full w-full">
      
      <div className="p-6 border-b border-gray-100 shrink-0">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">
          {state === 'SELECTING_PICKUP' && 'Where are you right now?'}
          {state === 'SELECTING_DESTINATION' && 'Where to?'}
          {state === 'CALCULATING_ROUTE' && 'Calculating route...'}
          {state === 'SELECTING_VEHICLE' && 'Choose a ride'}
        </h2>

        <div className="space-y-3.5">
          <div className="relative">
            <LocationAutocomplete 
              placeholder="Enter pickup location"
              defaultValue={pickup?.address || ''}
              onSelect={(loc) => {
                setPickup(loc);
                if (destination) {
                  setState('CALCULATING_ROUTE');
                } else {
                  setState('SELECTING_DESTINATION');
                }
              }}
              icon={<div className="w-2.5 h-2.5 bg-gray-900 rounded-full mx-1"></div>}
            />
            {state === 'SELECTING_PICKUP' && (
              <button 
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="flex items-center gap-2 mt-2.5 ml-2 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                <Navigation2 className={cn("w-3.5 h-3.5", isLocating && "animate-pulse")} />
                {isLocating ? 'Locating...' : 'Use current location'}
              </button>
            )}
            {geoError && <p className="text-xs text-red-500 mt-2 ml-2">{geoError}</p>}
          </div>

          <LocationAutocomplete 
            placeholder="Where are you going?"
            defaultValue={destination?.address || ''}
            onSelect={(loc) => {
              setDestination(loc);
              if (pickup) {
                setState('CALCULATING_ROUTE');
              } else {
                setState('SELECTING_PICKUP');
              }
            }}
            icon={<div className="w-2.5 h-2.5 bg-brand-600 rounded-sm mx-1"></div>}
          />

          {/* Quick preset chips for instant demo selection */}
          {!destination && (
            <div className="pt-1">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Quick Select
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_LANDMARKS.slice(0, 4).map((landmark) => (
                  <button
                    key={landmark.placeId}
                    type="button"
                    onClick={() => handleQuickSelectDestination(landmark)}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 hover:text-brand-700 hover:border-emerald-200 border border-transparent rounded-full text-xs font-medium text-gray-700 transition-all truncate max-w-[170px]"
                  >
                    {landmark.mainText.split(' ')[0]} {landmark.mainText.split(' ')[1] || ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-6 relative">
        {state === 'IDLE' || state === 'SELECTING_PICKUP' || state === 'SELECTING_DESTINATION' ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60 py-10">
            <MapPin className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm max-w-[220px]">
              Select pickup and destination points above to visualize the route and estimate fares.
            </p>
          </div>
        ) : null}

        {state === 'CALCULATING_ROUTE' ? (
          <div className="h-full flex flex-col items-center justify-center py-10 space-y-4">
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 font-medium">Calculating optimal route...</p>
          </div>
        ) : null}

        {state === 'SELECTING_VEHICLE' && routeDetails ? (
          <div className="space-y-4 pb-20">
            <div className="flex items-center justify-between text-sm font-medium text-gray-600 bg-white p-3.5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-brand-600"/>
                <span>{routeDetails.distanceText}</span>
              </div>
              <div className="font-semibold text-gray-900">{routeDetails.durationText}</div>
            </div>

            <div className="space-y-3 mt-4">
              {vehicles.map((v) => (
                <button
                  key={v.type}
                  onClick={() => setSelectedVehicle(v.type)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left bg-white",
                    selectedVehicle === v.type 
                      ? "border-brand-600 ring-4 ring-brand-50 shadow-md" 
                      : "border-transparent shadow-sm hover:border-gray-200"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                      <span className="text-2xl font-bold text-gray-300">
                        {v.type === 'ECONOMY' && '🚙'}
                        {v.type === 'COMFORT' && '🚘'}
                        {v.type === 'PREMIUM' && '💎'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{v.name}</h4>
                      <p className="text-xs text-gray-500">{v.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">{v.currency}{v.amount}</p>
                    {selectedVehicle === v.type && <CheckCircle2 className="w-4 h-4 text-brand-600 inline-block mt-1" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Sticky Bottom Action */}
      {state === 'SELECTING_VEHICLE' && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <Button 
            className="w-full h-14 text-lg shadow-lg shadow-brand-500/25" 
            onClick={handleRequestRide}
            disabled={!selectedVehicle || isRequesting}
            loading={isRequesting}
          >
            Request {vehicles.find(v => v.type === selectedVehicle)?.name || 'Ride'}
          </Button>
        </div>
      )}
    </div>
  );
};

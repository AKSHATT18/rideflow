import { useState } from 'react';
import { useRideStore } from '../../store/rideStore';
import { useBookingStore } from '../../store/bookingStore';
import { api } from '../../lib/axios';
import { Button } from '../Button';
import { Car, CheckCircle2, User, Star } from 'lucide-react';

export const RideStatusPanel = () => {
  const { activeRideId, status, activeRide, clearRide, leaveRideRoom, driverLocation, isConnected } = useRideStore();
  const { pickup, destination, reset } = useBookingStore();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!activeRideId) return;
    setCancelling(true);
    setError(null);
    try {
      await api.post(`/rides/${activeRideId}/cancel`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel ride');
      setCancelling(false);
    }
  };

  const handleReset = () => {
    if (activeRideId) leaveRideRoom(activeRideId);
    clearRide();
    reset();
  };

  if (!activeRideId) return null;

  const driver = activeRide?.driver;
  const profile = driver?.driverProfile;

  return (
    <div className="bg-white lg:rounded-3xl rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.1)] lg:shadow-lg border-t lg:border border-gray-100 flex flex-col overflow-hidden h-[60vh] lg:h-auto w-full">
      {/* Header status bar */}
      <div className="p-6 border-b border-gray-100 shrink-0 bg-brand-50 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-900 tracking-tight">
            {status === 'SEARCHING' && 'Finding your driver...'}
            {status === 'DRIVER_ASSIGNED' && 'Driver assigned'}
            {status === 'DRIVER_ARRIVING' && 'Driver is on the way'}
            {status === 'DRIVER_ARRIVED' && 'Driver has arrived!'}
            {status === 'IN_PROGRESS' && 'Trip in progress'}
            {status === 'COMPLETED' && 'Trip completed'}
            {status === 'CANCELLED' && 'Ride cancelled'}
          </h2>
          <p className="text-xs text-brand-700 mt-0.5">
            {status === 'SEARCHING' && 'Contacting nearby available drivers'}
            {status === 'DRIVER_ASSIGNED' && 'Driver is preparing to head your way'}
            {status === 'DRIVER_ARRIVED' && 'Please meet your driver at the pickup point'}
            {status === 'IN_PROGRESS' && 'Heading towards your destination'}
            {status === 'COMPLETED' && 'Hope you had a pleasant trip'}
          </p>
        </div>

        {status !== 'COMPLETED' && status !== 'CANCELLED' && (
          <div className="shrink-0 ml-3">
            {isConnected ? (
              <div className="flex items-center gap-1.5 text-brand-600 text-xs font-semibold uppercase tracking-wider bg-white px-2.5 py-1 rounded-full shadow-sm border border-brand-100">
                <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>
                Live
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold uppercase tracking-wider bg-white px-2.5 py-1 rounded-full shadow-sm border border-amber-100">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                Reconnecting...
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-white p-6 space-y-5">
        {/* Driver Profile Card (when assigned) */}
        {driver && status !== 'SEARCHING' && status !== 'CANCELLED' && (
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full border border-gray-200 flex items-center justify-center text-gray-700 shadow-sm">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{driver.firstName} {driver.lastName}</h4>
                <p className="text-xs text-gray-500 font-medium">
                  {profile?.vehicleMake} {profile?.vehicleModel} • {profile?.vehiclePlate || 'Verified'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-100 text-xs font-bold text-amber-500 shadow-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 stroke-none" />
              <span>{profile?.rating?.toFixed(1) || '5.0'}</span>
            </div>
          </div>
        )}

        {/* Route Details */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1"><div className="w-2.5 h-2.5 bg-gray-900 rounded-full"></div></div>
            <div className="text-sm">
              <p className="text-xs text-gray-400 font-medium">Pickup</p>
              <p className="font-medium text-gray-900">{pickup?.address || activeRide?.pickupAddress || 'Pickup Location'}</p>
            </div>
          </div>
          <div className="ml-1 w-0.5 h-5 bg-gray-200"></div>
          <div className="flex items-start gap-3">
            <div className="mt-1"><div className="w-2.5 h-2.5 bg-brand-600 rounded-sm"></div></div>
            <div className="text-sm">
              <p className="text-xs text-gray-400 font-medium">Destination</p>
              <p className="font-medium text-gray-900">{destination?.address || activeRide?.destinationAddress || 'Destination'}</p>
            </div>
          </div>
        </div>

        {/* Live Tracking GPS indicator */}
        {driverLocation && status === 'IN_PROGRESS' && (
          <div className="p-3 bg-brand-50/50 rounded-xl border border-brand-100 text-xs text-brand-800 flex items-center gap-2">
            <Car className="w-4 h-4 text-brand-600 animate-bounce" />
            <span>Driver GPS is streaming live to your map</span>
          </div>
        )}

        {/* Completed summary */}
        {status === 'COMPLETED' && (
          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-2" />
            <h3 className="font-bold text-emerald-900 text-base">You have arrived!</h3>
            <p className="text-xs text-emerald-700 mt-1">
              Final fare: <span className="font-bold text-sm">₹{activeRide?.finalFare || activeRide?.estimatedFare || 0}</span>
            </p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-white border-t border-gray-100">
        {error && <p className="text-xs text-red-500 mb-2 font-medium">{error}</p>}

        {(status === 'SEARCHING' || status === 'DRIVER_ASSIGNED' || status === 'DRIVER_ARRIVING' || status === 'DRIVER_ARRIVED') && (
          <Button 
            className="w-full" 
            variant="outline" 
            onClick={handleCancel}
            loading={cancelling}
          >
            Cancel Ride
          </Button>
        )}

        {(status === 'COMPLETED' || status === 'CANCELLED') && (
          <Button className="w-full" onClick={handleReset}>
            Book Another Ride
          </Button>
        )}

        {status === 'IN_PROGRESS' && (
          <div className="text-center py-1">
            <span className="text-xs text-gray-500 font-medium">Trip in progress — relax and enjoy your ride</span>
          </div>
        )}
      </div>
    </div>
  );
};

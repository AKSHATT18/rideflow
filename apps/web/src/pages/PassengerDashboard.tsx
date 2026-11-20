import { useEffect, useState } from 'react';
import { Navigation, LogOut, Bookmark, History } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { MapProvider } from '../components/maps/MapProvider';
import { RideMap } from '../components/maps/RideMap';
import { BookingPanel } from '../components/maps/BookingPanel';
import { RideStatusPanel } from '../components/maps/RideStatusPanel';
import { useRideStore } from '../store/rideStore';
import { useBookingStore } from '../store/bookingStore';
import { SavedLocationsModal } from '../components/passenger/SavedLocationsModal';
import { RideHistoryModal } from '../components/passenger/RideHistoryModal';
import { PassengerProfileModal } from '../components/passenger/PassengerProfileModal';
import { RatingModal } from '../components/passenger/RatingModal';

export const PassengerDashboard = () => {
  const { user, logout } = useAuthStore();
  const { activeRideId, activeRide, status, fetchActiveRide } = useRideStore();
  const { setPickup, setDestination, setState } = useBookingStore();

  const [isSavedPlacesOpen, setIsSavedPlacesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [completedRideForRating, setCompletedRideForRating] = useState<any | null>(null);

  useEffect(() => {
    fetchActiveRide().then((ride) => {
      if (ride) {
        setPickup({
          lat: ride.pickupLat,
          lng: ride.pickupLng,
          address: ride.pickupAddress,
        });
        setDestination({
          lat: ride.destinationLat,
          lng: ride.destinationLng,
          address: ride.destinationAddress,
        });
        setState('ROUTE_READY');
      }
    });
  }, [fetchActiveRide, setPickup, setDestination, setState]);

  // When active ride completes, trigger post-trip rating modal
  useEffect(() => {
    if (status === 'COMPLETED' && activeRide) {
      setCompletedRideForRating(activeRide);
      setIsRatingOpen(true);
    }
  }, [status, activeRide]);

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 z-10 shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-sm">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">RideFlow</span>
            </div>

            {/* Navigation & User Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsSavedPlacesOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-brand-700 bg-gray-50 hover:bg-brand-50 border border-gray-200/80 rounded-xl transition-all"
                title="Saved Places"
              >
                <Bookmark className="w-3.5 h-3.5 text-brand-600" />
                <span className="hidden sm:inline">Saved Places</span>
              </button>

              <button
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-brand-700 bg-gray-50 hover:bg-brand-50 border border-gray-200/80 rounded-xl transition-all"
                title="Ride History"
              >
                <History className="w-3.5 h-3.5 text-brand-600" />
                <span className="hidden sm:inline">Trips</span>
              </button>

              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1 text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
                title="View Profile"
              >
                <div className="w-8 h-8 bg-brand-50 border border-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold shadow-sm">
                  {user?.firstName?.charAt(0) || 'P'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {user?.firstName}
                </span>
              </button>

              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full">
        {/* OpenFreeMap / MapLibre Layer */}
        <div className="absolute inset-0 lg:relative lg:flex-1 h-full z-0">
          <MapProvider>
            <RideMap />
          </MapProvider>
        </div>

        {/* Booking Interface (Overlay on mobile, sidebar on desktop) */}
        <div className="z-10 w-full lg:w-[450px] lg:h-full pointer-events-none absolute bottom-0 lg:relative lg:bottom-auto flex flex-col justify-end lg:justify-start lg:p-6 lg:border-l border-gray-100 bg-transparent lg:bg-white">
          <div className="pointer-events-auto w-full lg:h-full lg:max-h-full">
            {activeRideId ? <RideStatusPanel /> : <BookingPanel />}
          </div>
        </div>
      </main>

      {/* Modals */}
      <SavedLocationsModal
        isOpen={isSavedPlacesOpen}
        onClose={() => setIsSavedPlacesOpen(false)}
      />

      <RideHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <PassengerProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {completedRideForRating && (
        <RatingModal
          rideId={completedRideForRating.id}
          driverName={completedRideForRating.driver?.firstName || 'your driver'}
          isOpen={isRatingOpen}
          onClose={() => {
            setIsRatingOpen(false);
            setCompletedRideForRating(null);
          }}
        />
      )}
    </div>
  );
};

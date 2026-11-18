import { useEffect } from 'react';
import { Navigation, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { MapProvider } from '../components/maps/MapProvider';
import { RideMap } from '../components/maps/RideMap';
import { BookingPanel } from '../components/maps/BookingPanel';
import { RideStatusPanel } from '../components/maps/RideStatusPanel';
import { useRideStore } from '../store/rideStore';
import { useBookingStore } from '../store/bookingStore';

export const PassengerDashboard = () => {
  const { user, logout } = useAuthStore();
  const { activeRideId, fetchActiveRide } = useRideStore();
  const { setPickup, setDestination, setState } = useBookingStore();

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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-50 border border-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold shadow-sm">
                  {user?.firstName?.charAt(0) || 'P'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {user?.firstName}
                </span>
              </div>
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
        {/* OpenStreetMap / Leaflet Layer */}
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
    </div>
  );
};

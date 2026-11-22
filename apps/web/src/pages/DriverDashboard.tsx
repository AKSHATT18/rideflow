import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRideStore } from '../store/rideStore';
import { useDriverStore } from '../store/driverStore';
import { api } from '../lib/axios';
import { Button } from '../components/Button';
import {
  LogOut,
  Navigation,
  Power,
  MapPin,
  Radio,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Wallet,
  Clock,
  User,
} from 'lucide-react';
import { MockGPS } from '../lib/mockGps';
import { cn } from '../lib/utils';
import { DriverNavigationMap } from '../components/driver/DriverNavigationMap';
import { DriverProfileModal } from '../components/driver/DriverProfileModal';
import { DriverEarningsModal } from '../components/driver/DriverEarningsModal';
import { DriverTripHistoryModal } from '../components/driver/DriverTripHistoryModal';

export const DriverDashboard = () => {
  const { logout } = useAuthStore();
  const {
    activeRideId,
    status,
    activeRide,
    joinRideRoom,
    leaveRideRoom,
    setActiveRide,
    clearRide,
    fetchActiveRide,
    isConnected,
  } = useRideStore();

  const {
    fetchProfile,
    setProfileModalOpen,
    setEarningsModalOpen,
    setHistoryModalOpen,
  } = useDriverStore();

  const [isOnline, setIsOnline] = useState(false);
  const [pendingRides, setPendingRides] = useState<any[]>([]);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSimulatingGps, setIsSimulatingGps] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const mockGpsRef = useRef<MockGPS | null>(null);

  // Restore active ride and driver profile on mount
  useEffect(() => {
    fetchActiveRide().then((ride) => {
      if (ride) {
        setIsOnline(true);
      }
    });

    fetchProfile().then((prof) => {
      if (prof?.driverProfile?.status === 'ONLINE' || prof?.driverProfile?.status === 'BUSY') {
        setIsOnline(true);
      }
    });

    return () => {
      if (mockGpsRef.current) {
        mockGpsRef.current.stopSimulation();
        mockGpsRef.current = null;
      }
    };
  }, [fetchActiveRide]);

  // Clean up GPS simulation if ride ends or cancels
  useEffect(() => {
    if (status === 'COMPLETED' || status === 'CANCELLED' || !activeRideId) {
      if (mockGpsRef.current) {
        mockGpsRef.current.stopSimulation();
        mockGpsRef.current = null;
        setIsSimulatingGps(false);
      }
    }
  }, [status, activeRideId]);

  // Reset OTP state when status transitions away from DRIVER_ARRIVED
  useEffect(() => {
    if (status !== 'DRIVER_ARRIVED') {
      setOtpInput('');
      setOtpError(null);
      setAttemptsRemaining(null);
    }
  }, [status]);

  // Poll for rides if online and not in an active ride
  useEffect(() => {
    let interval: number;
    if (isOnline && !activeRideId) {
      const fetchRides = async () => {
        try {
          const res = await api.get('/rides/pending');
          setPendingRides(res.data.data.rides);
        } catch (error) {}
      };
      fetchRides();
      interval = window.setInterval(fetchRides, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnline, activeRideId]);

  const toggleOnline = async () => {
    try {
      const newStatus = isOnline ? 'OFFLINE' : 'ONLINE';
      await api.post('/driver/status', { status: newStatus });
      setIsOnline(!isOnline);
      if (isOnline) setPendingRides([]);
    } catch (error) {
      console.error('Failed to toggle status', error);
    }
  };

  const handleAccept = async (rideId: string) => {
    setIsAccepting(rideId);
    try {
      const res = await api.post(`/rides/${rideId}/accept`);
      const ride = res.data.data.ride;
      setActiveRide(ride.id, ride.status, ride);
      joinRideRoom(ride.id);
      setPendingRides([]);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to accept ride. It may have already been accepted.');
    } finally {
      setIsAccepting(null);
    }
  };

  const handleUpdateStatus = async (endpoint: 'arrive' | 'complete') => {
    if (!activeRideId) return;
    setIsUpdatingStatus(true);
    try {
      const res = await api.post(`/rides/${activeRideId}/${endpoint}`);
      const updatedRide = res.data.data.ride;
      setActiveRide(updatedRide.id, updatedRide.status, updatedRide);

      if (endpoint === 'complete') {
        if (mockGpsRef.current) {
          mockGpsRef.current.stopSimulation();
          mockGpsRef.current = null;
          setIsSimulatingGps(false);
        }
        leaveRideRoom(activeRideId);
        clearRide();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update ride status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeRideId || otpInput.trim().length !== 4) return;

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await api.post(`/rides/${activeRideId}/verify-otp`, {
        otp: otpInput.trim(),
      });
      const updatedRide = res.data.data.ride;
      setActiveRide(updatedRide.id, updatedRide.status, updatedRide);
      setOtpInput('');
      setAttemptsRemaining(null);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to verify OTP';
      const remaining = err.response?.data?.data?.attemptsRemaining;
      setOtpError(message);
      if (typeof remaining === 'number') {
        setAttemptsRemaining(remaining);
      } else if (err.response?.status === 429) {
        setAttemptsRemaining(0);
      }
      setOtpInput('');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const startGpsSimulation = () => {
    if (!activeRideId || !activeRide) return;

    if (mockGpsRef.current) {
      mockGpsRef.current.stopSimulation();
    }

    // Simulate moving from pickup to destination coordinates
    const gps = new MockGPS(
      activeRideId,
      { lat: activeRide.pickupLat, lng: activeRide.pickupLng },
      { lat: activeRide.destinationLat, lng: activeRide.destinationLng }
    );

    mockGpsRef.current = gps;
    setIsSimulatingGps(true);
    gps.startSimulation(1500); // Sensible 1.5-second interval
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 shrink-0">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">Driver</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Quick Navigation Action Pills */}
              <button
                onClick={() => setEarningsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 transition-colors border border-gray-200 shadow-xs"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Earnings</span>
              </button>

              <button
                onClick={() => setHistoryModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-700 transition-colors border border-gray-200 shadow-xs"
              >
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                <span className="hidden sm:inline">Trips</span>
              </button>

              <button
                onClick={() => setProfileModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-700 transition-colors border border-gray-200 shadow-xs"
              >
                <User className="w-3.5 h-3.5 text-gray-700" />
                <span className="hidden sm:inline">Profile</span>
              </button>

              <button
                onClick={toggleOnline}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors shadow-xs ml-1",
                  isOnline
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                    : "bg-gray-100 text-gray-700 border border-gray-200"
                )}
              >
                <Power className="w-3.5 h-3.5" />
                {isOnline ? 'Online' : 'Offline'}
              </button>
              <button onClick={logout} className="p-2 text-gray-400 hover:text-gray-900" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 lg:p-8">
        {!isOnline && !activeRideId && (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Power className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You are offline</h2>
            <p className="text-gray-500 mb-8 max-w-sm">Go online to start receiving ride requests and earning.</p>
            <Button onClick={toggleOnline} className="w-full max-w-xs">Go Online</Button>
          </div>
        )}

        {isOnline && !activeRideId && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <h2 className="text-lg font-bold text-gray-900">Looking for riders...</h2>
              </div>
              <span className="text-xs text-gray-400 font-medium">Auto-refreshing</span>
            </div>

            {pendingRides.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 shadow-sm">
                <p className="text-sm font-medium">No active ride requests nearby.</p>
                <p className="text-xs text-gray-400 mt-1">Available ride requests will automatically appear here.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {ride.vehicleType}
                        </span>
                        <span className="text-xs text-gray-400">
                          Rider: {ride.passenger?.firstName} {ride.passenger?.lastName}
                        </span>
                      </div>
                      <div className="flex items-start gap-3 text-sm font-medium">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <span className="text-gray-900">{ride.pickupAddress}</span>
                      </div>
                      <div className="flex items-start gap-3 text-sm font-medium text-gray-600">
                        <Navigation className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                        <span>{ride.destinationAddress}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {ride.estimatedDistanceKm} km • ~{ride.estimatedDurationMin} min
                      </p>
                    </div>
                    <div className="flex flex-col md:items-end gap-3 shrink-0">
                      <p className="text-2xl font-bold text-gray-900">₹{ride.estimatedFare}</p>
                      <Button
                        onClick={() => handleAccept(ride.id)}
                        loading={isAccepting === ride.id}
                        disabled={isAccepting !== null}
                      >
                        Accept Ride
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeRideId && (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Live Turn-by-Turn Navigation Map */}
            <DriverNavigationMap />

            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
              <div className="bg-brand-600 p-6 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-0.5">Active Ride</h2>
                  <p className="text-brand-100 text-xs font-medium">Status: {status}</p>
                </div>
                {isConnected && (
                  <div className="flex items-center gap-1.5 text-xs bg-brand-700 text-brand-100 px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    Connected
                  </div>
                )}
              </div>

              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                  <span className="text-sm font-bold text-gray-700">Passenger</span>
                  <span className="font-semibold text-gray-900">
                    {activeRide?.passenger?.firstName} {activeRide?.passenger?.lastName}
                  </span>
                </div>

                <div className="space-y-3 text-sm font-medium text-gray-700 bg-gray-50 p-4 rounded-2xl">
                  <div>
                    <span className="text-xs text-gray-400 block mb-0.5">Pickup</span>
                    <p className="text-gray-900">{activeRide?.pickupAddress}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-400 block mb-0.5">Destination</span>
                    <p className="text-gray-900">{activeRide?.destinationAddress}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-semibold">Estimated Fare</span>
                    <span className="text-lg font-bold text-gray-900">₹{activeRide?.estimatedFare}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {status === 'DRIVER_ASSIGNED' && (
                    <Button
                      className="w-full h-12"
                      onClick={() => handleUpdateStatus('arrive')}
                      loading={isUpdatingStatus}
                    >
                      Mark Arrived at Pickup
                    </Button>
                  )}

                  {status === 'DRIVER_ARRIVED' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-xs">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">Passenger Pickup PIN</h4>
                          <p className="text-xs text-gray-500">Ask the passenger for their 4-digit PIN to start trip</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            value={otpInput}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setOtpInput(val);
                              setOtpError(null);
                            }}
                            placeholder="••••"
                            disabled={isVerifyingOtp || attemptsRemaining === 0}
                            className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed shadow-xs"
                            aria-label="4-digit pickup PIN"
                            autoComplete="one-time-code"
                          />
                        </div>

                        {otpError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold">{otpError}</p>
                              {attemptsRemaining !== null && attemptsRemaining > 0 && (
                                <p className="text-red-600 mt-0.5">
                                  Warning: {attemptsRemaining} attempt{attemptsRemaining > 1 ? 's' : ''} remaining before verification is locked.
                                </p>
                              )}
                              {attemptsRemaining === 0 && (
                                <p className="text-red-700 font-bold mt-0.5">
                                  Verification locked. Maximum attempts exceeded.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        disabled={otpInput.length !== 4 || isVerifyingOtp || attemptsRemaining === 0}
                        loading={isVerifyingOtp}
                      >
                        Verify PIN & Start Trip
                      </Button>
                    </form>
                  )}

                  {status === 'IN_PROGRESS' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium">Pickup PIN verified • Trip in progress</span>
                      </div>

                      {!isSimulatingGps ? (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={startGpsSimulation}
                        >
                          <Radio className="w-4 h-4 mr-2 text-brand-600" />
                          [Dev] Start GPS Simulation
                        </Button>
                      ) : (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-center gap-2">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          GPS Simulation Active (Emitting over Socket.IO)
                        </div>
                      )}

                      <Button
                        className="w-full h-12 bg-gray-900 hover:bg-black text-white"
                        onClick={() => handleUpdateStatus('complete')}
                        loading={isUpdatingStatus}
                      >
                        Complete Trip
                      </Button>
                    </div>
                  )}

                  {status === 'CANCELLED' && (
                    <div className="text-center p-4 bg-red-50 rounded-xl text-red-600 font-medium text-sm">
                      This ride has been cancelled.
                      <Button
                        className="mt-4 w-full"
                        onClick={() => {
                          clearRide();
                        }}
                      >
                        Back to Dashboard
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Driver Modals */}
      <DriverProfileModal />
      <DriverEarningsModal />
      <DriverTripHistoryModal />
    </div>
  );
};

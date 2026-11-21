import { useState, useEffect } from 'react';
import { useRideStore } from '../../store/rideStore';
import { useBookingStore } from '../../store/bookingStore';
import { api } from '../../lib/axios';
import { Button } from '../Button';
import { Car, CheckCircle2, User, Star, KeyRound, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';

export const RideStatusPanel = () => {
  const { activeRideId, status, activeRide, clearRide, leaveRideRoom, driverLocation, isConnected } = useRideStore();
  const { pickup, destination, reset } = useBookingStore();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [otpData, setOtpData] = useState<{
    otp: string;
    expiresAt: string;
    isExpired: boolean;
    attemptsRemaining: number;
    isVerified: boolean;
    verifiedAt?: string | null;
  } | null>(null);
  const [isLoadingOtp, setIsLoadingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch OTP securely for the assigned passenger
  useEffect(() => {
    let isMounted = true;
    if (
      activeRideId &&
      ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(status || '')
    ) {
      setIsLoadingOtp(true);
      api
        .get(`/rides/${activeRideId}/otp`)
        .then((res) => {
          if (isMounted && res.data?.data) {
            setOtpData(res.data.data);
            setOtpError(null);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setOtpError(err.response?.data?.message || 'Could not load pickup PIN');
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingOtp(false);
        });
    } else {
      setOtpData(null);
    }
    return () => {
      isMounted = false;
    };
  }, [activeRideId, status]);

  const handleCopyOtp = () => {
    if (otpData?.otp) {
      navigator.clipboard.writeText(otpData.otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

        {/* Pickup Verification PIN Card */}
        {activeRideId && ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(status || '') && (
          <div
            className={`rounded-2xl border transition-all p-4 ${
              status === 'IN_PROGRESS' || otpData?.isVerified
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-gradient-to-br from-brand-50/70 via-blue-50/40 to-indigo-50/50 border-brand-200/80 text-brand-950 shadow-sm'
            }`}
          >
            {status === 'IN_PROGRESS' || otpData?.isVerified ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                      Pickup Verified
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 text-emerald-800">
                        Active
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-700">
                      Identity verified securely with your driver.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">PIN</span>
                  <span className="font-mono font-bold text-base text-emerald-900 tracking-wider">
                    {otpData?.otp || '••••'}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center shadow-sm">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-brand-900">
                        Pickup Verification PIN
                      </h4>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold bg-white/90 text-brand-700 px-2.5 py-0.5 rounded-full border border-brand-200/60 shadow-xs">
                    Share at pickup
                  </span>
                </div>

                {isLoadingOtp && !otpData ? (
                  <div className="py-3 text-center text-xs text-brand-700 animate-pulse font-medium">
                    Generating secure pickup PIN...
                  </div>
                ) : otpError ? (
                  <div className="py-2 text-xs text-red-600 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                ) : (
                  <div className="bg-white/95 rounded-xl border border-brand-100/80 p-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5" aria-label={`Pickup PIN: ${otpData?.otp || '••••'}`}>
                        {(otpData?.otp || '••••').split('').map((digit, idx) => (
                          <span
                            key={idx}
                            className="w-9 h-10 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 font-mono text-xl font-extrabold flex items-center justify-center shadow-xs"
                          >
                            {digit}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyOtp}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 active:scale-95 transition-all shadow-xs"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-gray-500" />
                            <span>Copy PIN</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="mt-2.5 text-[11px] leading-tight text-brand-800/90 font-medium">
                      Share this 4-digit PIN with your driver only after they arrive at your pickup point. The driver cannot start the ride without it.
                    </p>
                  </div>
                )}
              </div>
            )}
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

import { useEffect } from 'react';
import { useDriverStore } from '../../store/driverStore';
import {
  X,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  Car,
  Award,
  Wallet,
} from 'lucide-react';

export const DriverEarningsModal = () => {
  const {
    earnings,
    fetchEarnings,
    isEarningsModalOpen,
    setEarningsModalOpen,
  } = useDriverStore();

  useEffect(() => {
    if (isEarningsModalOpen) {
      fetchEarnings();
    }
  }, [isEarningsModalOpen, fetchEarnings]);

  if (!isEarningsModalOpen) return null;

  const maxDailyEarning = earnings?.dailyEarnings
    ? Math.max(...earnings.dailyEarnings.map((d) => d.earnings), 500)
    : 500;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Earnings Dashboard</h2>
              <p className="text-xs text-gray-500">
                Transparent revenue metrics • 80% Driver Payout / 20% Platform Fee
              </p>
            </div>
          </div>
          <button
            onClick={() => setEarningsModalOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Financial Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Today
              </span>
              <span className="text-2xl font-extrabold text-emerald-950 mt-1 block">
                ₹{earnings?.todayEarnings ?? 0}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">Daily net payout</span>
            </div>

            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                This Week
              </span>
              <span className="text-2xl font-extrabold text-blue-950 mt-1 block">
                ₹{earnings?.thisWeekEarnings ?? 0}
              </span>
              <span className="text-[10px] text-blue-700 font-medium">Last 7 days</span>
            </div>

            <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                This Month
              </span>
              <span className="text-2xl font-extrabold text-purple-950 mt-1 block">
                ₹{earnings?.thisMonthEarnings ?? 0}
              </span>
              <span className="text-[10px] text-purple-700 font-medium">Current calendar month</span>
            </div>

            <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                Lifetime Total
              </span>
              <span className="text-2xl font-extrabold text-white mt-1 block">
                ₹{earnings?.lifetimeEarnings ?? 0}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {earnings?.totalCompletedTrips ?? 0} Completed Trips
              </span>
            </div>
          </div>

          {/* Secondary stats pill banner */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-gray-600 font-medium">Driver Rating:</span>
              <span className="font-bold text-gray-900">{earnings?.averageRating?.toFixed(1) || '5.0'} ★</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-gray-600 font-medium">Average per Trip:</span>
              <span className="font-bold text-gray-900">₹{earnings?.averageEarningsPerTrip ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-brand-600" />
              <span className="text-gray-600 font-medium">Split:</span>
              <span className="font-bold text-gray-900">80% Driver / 20% Platform</span>
            </div>
          </div>

          {/* 7-Day Interactive Daily Earnings Chart */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-600" />
                  7-Day Earnings Trend
                </h3>
                <p className="text-xs text-gray-400">Daily take-home payouts over the last week</p>
              </div>
            </div>

            {earnings?.dailyEarnings && earnings.dailyEarnings.length > 0 ? (
              <div className="pt-4">
                <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-gray-100 pb-2">
                  {earnings.dailyEarnings.map((day, idx) => {
                    const heightPercent =
                      maxDailyEarning > 0 ? Math.round((day.earnings / maxDailyEarning) * 100) : 0;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] rounded-md px-1.5 py-0.5 text-center font-bold pointer-events-none whitespace-nowrap shadow-sm">
                          ₹{day.earnings}
                          <span className="block text-[8px] font-normal text-gray-400">
                            {day.trips} ride{day.trips === 1 ? '' : 's'}
                          </span>
                        </div>

                        {/* Bar */}
                        <div className="w-full max-w-[40px] bg-emerald-100 group-hover:bg-emerald-200 rounded-t-lg transition-all relative overflow-hidden flex flex-col justify-end">
                          <div
                            style={{ height: `${Math.max(heightPercent, 4)}%` }}
                            className={`w-full transition-all duration-500 rounded-t-lg ${
                              day.earnings > 0 ? 'bg-emerald-600 group-hover:bg-emerald-700' : 'bg-gray-200'
                            }`}
                          />
                        </div>

                        {/* Day Label */}
                        <span className="text-[11px] font-semibold text-gray-500 group-hover:text-gray-900">
                          {day.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-400 font-medium">
                No trip earnings recorded in the past 7 days.
              </div>
            )}
          </div>

          {/* Recent Completed Trips Breakdown */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              Recent Completed Rides
            </h3>

            {earnings?.recentTrips && earnings.recentTrips.length > 0 ? (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white">
                {earnings.recentTrips.map((trip) => (
                  <div key={trip.id} className="p-4 hover:bg-gray-50/70 transition-colors flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                          {trip.vehicleType}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(trip.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {trip.pickup} → {trip.destination}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {trip.distanceKm} km • ~{trip.durationMin} min
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-extrabold text-emerald-600 block">
                        +₹{trip.driverEarnings}
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        Fare: ₹{trip.totalFare} (Fee: ₹{trip.platformCommission})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 text-xs">
                <Car className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-medium text-gray-600">No completed trips yet.</p>
                <p className="text-gray-400 mt-0.5">Go online to accept ride requests and start earning.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => setEarningsModalOpen(false)}
            className="px-5 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

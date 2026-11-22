import { useState, useEffect } from 'react';
import { useDriverStore } from '../../store/driverStore';
import {
  X,
  Clock,
  MapPin,
  Navigation,
  Star,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Car,
} from 'lucide-react';

export const DriverTripHistoryModal = () => {
  const {
    trips,
    tripsPagination,
    fetchTrips,
    isLoading,
    isHistoryModalOpen,
    setHistoryModalOpen,
  } = useDriverStore();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (isHistoryModalOpen) {
      fetchTrips({ status: statusFilter, page: currentPage, limit: 10 });
    }
  }, [isHistoryModalOpen, statusFilter, currentPage, fetchTrips]);

  if (!isHistoryModalOpen) return null;

  const handleStatusChange = (status: 'ALL' | 'COMPLETED' | 'CANCELLED') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Driver Trip History</h2>
              <p className="text-xs text-gray-500">
                Detailed record of all your assigned, completed, and cancelled trips
              </p>
            </div>
          </div>
          <button
            onClick={() => setHistoryModalOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            {(['ALL', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === s
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {s === 'ALL' ? 'All Trips' : s === 'COMPLETED' ? 'Completed' : 'Cancelled'}
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-400 font-medium">
            Total {tripsPagination.total} ride{tripsPagination.total === 1 ? '' : 's'}
          </span>
        </div>

        {/* Trip List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-400 animate-pulse font-medium">
              Loading trip records...
            </div>
          ) : trips.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Car className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h4 className="font-bold text-gray-700 text-sm">No trips found</h4>
              <p className="text-xs text-gray-400 mt-1">
                {statusFilter === 'ALL'
                  ? 'You have not completed or been assigned any rides yet.'
                  : `No ${statusFilter.toLowerCase()} trips found.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip) => {
                const isCompleted = trip.status === 'COMPLETED';
                const isCancelled = trip.status === 'CANCELLED';

                return (
                  <div
                    key={trip.id}
                    className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs hover:border-gray-300 transition-all space-y-3"
                  >
                    {/* Top Row: Date, Status Badge, Earnings */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">
                          {new Date(trip.completedAt || trip.requestedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 uppercase">
                          {trip.vehicleType}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isCancelled
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                          {isCancelled && <XCircle className="w-3 h-3" />}
                          {trip.status}
                        </span>

                        <span className="text-sm font-extrabold text-gray-900">
                          {isCompleted ? (
                            <span className="text-emerald-600">+₹{trip.driverEarnings}</span>
                          ) : (
                            <span className="text-gray-400">₹0</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Route */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="text-gray-800 font-medium truncate">{trip.pickupAddress}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Navigation className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                        <span className="text-gray-800 font-medium truncate">{trip.destinationAddress}</span>
                      </div>
                    </div>

                    {/* Bottom Row: Metrics & Rating */}
                    <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-500">
                      <div>
                        Rider: <span className="font-semibold text-gray-800">{trip.passenger.name}</span> •{' '}
                        {trip.distanceKm} km • ~{trip.durationMin} min
                      </div>

                      {isCompleted && (
                        <div className="text-gray-400">
                          Total fare: ₹{trip.totalFare} (Commission: ₹{trip.platformCommission})
                        </div>
                      )}

                      {isCancelled && trip.cancellationReason && (
                        <div className="text-red-500 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Reason: {trip.cancellationReason}</span>
                        </div>
                      )}

                      {trip.rating && (
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-amber-900 font-bold">
                          <Star className="w-3 h-3 fill-amber-400 stroke-none" />
                          <span>{trip.rating.score}.0</span>
                          {trip.rating.comment && (
                            <span className="font-normal text-amber-800 text-[10px] ml-1 truncate max-w-[150px]">
                              "{trip.rating.comment}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-medium">
            Page {tripsPagination.page} of {tripsPagination.totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-gray-700 shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(tripsPagination.totalPages, p + 1))}
              disabled={currentPage >= tripsPagination.totalPages || isLoading}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-gray-700 shadow-xs"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

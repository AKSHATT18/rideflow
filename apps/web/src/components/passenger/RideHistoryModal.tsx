import React, { useEffect, useState } from 'react';
import { X, History, FileText, Star, Loader2 } from 'lucide-react';
import { usePassengerStore } from '../../store/passengerStore';
import { RideReceiptModal } from './RideReceiptModal';
import { RatingModal } from './RatingModal';

interface RideHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RideHistoryModal: React.FC<RideHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { history, isLoading, fetchHistory } = usePassengerStore();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedReceiptRideId, setSelectedReceiptRideId] = useState<string | null>(null);
  const [selectedRatingRide, setSelectedRatingRide] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory({ status: filterStatus });
    }
  }, [isOpen, filterStatus, fetchHistory]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">COMPLETED</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">CANCELLED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 animate-pulse">IN PROGRESS</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-50 text-gray-700 border border-gray-100">{status}</span>;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative border border-gray-100 max-h-[90vh] flex flex-col">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-50 text-brand-700 rounded-xl flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Your Ride History</h3>
              <p className="text-xs text-gray-400 mt-0.5">Review past trips, receipts, and driver ratings</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 mb-4 border-b border-gray-100 pb-3">
            {[
              { id: 'ALL', label: 'All Trips' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filterStatus === tab.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Ride List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center">
                <Loader2 className="w-7 h-7 text-brand-600 animate-spin mb-2" />
                <p className="text-xs text-gray-400">Loading trips...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No trips found in this category.</p>
              </div>
            ) : (
              history.map((ride) => (
                <div
                  key={ride.id}
                  className="p-4 bg-gray-50/80 hover:bg-gray-100/90 rounded-2xl border border-gray-100 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {new Date(ride.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">
                        {new Date(ride.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {getStatusBadge(ride.status)}
                  </div>

                  {/* Route */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <p className="truncate font-medium">{ride.pickupAddress}</p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <p className="truncate font-medium">{ride.destinationAddress}</p>
                    </div>
                  </div>

                  {/* Driver & Fare Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-xs">
                    <div>
                      {ride.driver ? (
                        <p className="text-gray-700 font-semibold">
                          Driver: {ride.driver.firstName} {ride.driver.lastName}
                        </p>
                      ) : (
                        <p className="text-gray-400 italic">No driver assigned</p>
                      )}
                      <p className="text-[11px] text-gray-500">
                        {ride.estimatedDistanceKm} km • {ride.vehicleType}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-base font-bold text-brand-700">
                        ₹{ride.finalFare ?? ride.estimatedFare}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => setSelectedReceiptRideId(ride.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-800"
                        >
                          <FileText className="w-3.5 h-3.5" /> Receipt
                        </button>

                        {ride.status === 'COMPLETED' && (
                          ride.rating ? (
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              <Star className="w-3 h-3 fill-amber-400" /> {ride.rating.score}★
                            </span>
                          ) : (
                            <button
                              onClick={() => setSelectedRatingRide(ride)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"
                            >
                              <Star className="w-3 h-3" /> Rate
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Nested Receipt Modal */}
      {selectedReceiptRideId && (
        <RideReceiptModal
          rideId={selectedReceiptRideId}
          isOpen={true}
          onClose={() => setSelectedReceiptRideId(null)}
        />
      )}

      {/* Nested Rating Modal */}
      {selectedRatingRide && (
        <RatingModal
          rideId={selectedRatingRide.id}
          driverName={selectedRatingRide.driver?.firstName || 'your driver'}
          isOpen={true}
          onClose={() => setSelectedRatingRide(null)}
          onSuccess={() => fetchHistory({ status: filterStatus })}
        />
      )}
    </>
  );
};

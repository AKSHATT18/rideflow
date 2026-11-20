import React, { useEffect, useState } from 'react';
import { X, FileText, MapPin, Clock, Car, Star, Loader2, CheckCircle2 } from 'lucide-react';
import { usePassengerStore } from '../../store/passengerStore';

interface RideReceiptModalProps {
  rideId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const RideReceiptModal: React.FC<RideReceiptModalProps> = ({
  rideId,
  isOpen,
  onClose,
}) => {
  const { fetchReceipt } = usePassengerStore();
  const [receipt, setReceipt] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && rideId) {
      setLoading(true);
      setError(null);
      fetchReceipt(rideId)
        .then((data) => {
          setReceipt(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Unable to load trip receipt');
          setLoading(false);
        });
    }
  }, [isOpen, rideId, fetchReceipt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative border border-gray-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-gray-500">Generating receipt...</p>
          </div>
        ) : error || !receipt ? (
          <div className="py-12 text-center">
            <p className="text-sm text-red-600 font-semibold mb-4">{error || 'Receipt unavailable'}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="border-b border-gray-100 pb-5 mb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-brand-50 text-brand-700 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Trip Receipt</h3>
                    <p className="text-xs text-gray-400 font-mono">{receipt.receiptId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(receipt.completedAt || receipt.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Route Addresses */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Pickup</p>
                  <p className="text-sm text-gray-800 font-medium">{receipt.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Destination</p>
                  <p className="text-sm text-gray-800 font-medium">{receipt.destinationAddress}</p>
                </div>
              </div>
            </div>

            {/* Trip Specs */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="bg-gray-50 p-3 rounded-2xl text-center">
                <Car className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Tier</p>
                <p className="text-xs font-bold text-gray-800">{receipt.vehicleType}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl text-center">
                <MapPin className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Distance</p>
                <p className="text-xs font-bold text-gray-800">{receipt.distanceKm} km</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl text-center">
                <Clock className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Duration</p>
                <p className="text-xs font-bold text-gray-800">{receipt.durationMin} min</p>
              </div>
            </div>

            {/* Driver Information */}
            {receipt.driver && (
              <div className="p-3.5 border border-gray-100 rounded-2xl mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-sm">
                    {receipt.driver.firstName?.[0] || 'D'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {receipt.driver.firstName} {receipt.driver.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {receipt.driver.driverProfile?.vehicleMake} {receipt.driver.driverProfile?.vehicleModel} •{' '}
                      <span className="font-mono font-semibold text-gray-700">
                        {receipt.driver.driverProfile?.vehiclePlate}
                      </span>
                    </p>
                  </div>
                </div>
                {receipt.driver.driverProfile?.rating && (
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{receipt.driver.driverProfile.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Itemized Fare Breakdown */}
            <div className="border-t border-b border-gray-100 py-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Base Fare</span>
                <span>₹{receipt.fareBreakdown?.baseFare}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Distance Charge ({receipt.distanceKm} km @ ₹{receipt.fareBreakdown?.perKmRate}/km)</span>
                <span>₹{receipt.fareBreakdown?.distanceCharge}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Time Charge ({receipt.durationMin} min @ ₹{receipt.fareBreakdown?.perMinRate}/min)</span>
                <span>₹{receipt.fareBreakdown?.timeCharge}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between items-center font-bold text-base text-gray-900">
                <span>Total Fare</span>
                <span className="text-xl text-brand-700">₹{receipt.finalFare}</span>
              </div>
            </div>

            {/* Submitted Rating (if present) */}
            {receipt.rating && (
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= receipt.rating.score ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-amber-800">Your Rating</span>
                </div>
                {receipt.rating.comment && (
                  <p className="text-xs text-gray-600 italic mt-1">"{receipt.rating.comment}"</p>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-900 hover:bg-black text-white font-semibold text-sm rounded-2xl shadow-sm transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

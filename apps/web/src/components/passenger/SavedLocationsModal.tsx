import React, { useEffect, useState } from 'react';
import { X, Home, Briefcase, Heart, Plus, Trash2, MapPin, Loader2, Check } from 'lucide-react';
import { usePassengerStore, type SavedLocation } from '../../store/passengerStore';
import { useBookingStore } from '../../store/bookingStore';
import { searchPlaces } from '../../services/geocodingService';

interface SavedLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SavedLocationsModal: React.FC<SavedLocationsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { savedLocations, fetchSavedLocations, addSavedLocation, deleteSavedLocation } =
    usePassengerStore();
  const { setPickup, setDestination } = useBookingStore();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<'HOME' | 'WORK' | 'FAVORITE'>('FAVORITE');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSavedLocations();
    }
  }, [isOpen, fetchSavedLocations]);

  if (!isOpen) return null;

  const handleSearch = async (query: string) => {
    setAddress(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchPlaces(query);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectPlace = (place: any) => {
    setAddress(place.description);
    setSelectedCoords({ lat: place.lat, lng: place.lng });
    if (!name) {
      setName(place.mainText);
    }
    setSearchResults([]);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !selectedCoords) return;

    try {
      setIsSubmitting(true);
      await addSavedLocation({
        name,
        address,
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        type,
      });
      setIsSubmitting(false);
      setIsAdding(false);
      setName('');
      setAddress('');
      setSelectedCoords(null);
      setActionNotice('Location saved successfully!');
      setTimeout(() => setActionNotice(null), 2500);
    } catch (err: any) {
      setIsSubmitting(false);
      alert(err.response?.data?.message || 'Failed to save location');
    }
  };

  const applyLocation = (loc: SavedLocation, target: 'pickup' | 'destination') => {
    if (target === 'pickup') {
      setPickup({ lat: loc.lat, lng: loc.lng, address: loc.address });
      setActionNotice(`Set ${loc.name} as Pickup`);
    } else {
      setDestination({ lat: loc.lat, lng: loc.lng, address: loc.address });
      setActionNotice(`Set ${loc.name} as Destination`);
    }
    setTimeout(() => {
      setActionNotice(null);
      onClose();
    }, 800);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'HOME':
        return <Home className="w-4 h-4 text-emerald-600" />;
      case 'WORK':
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      default:
        return <Heart className="w-4 h-4 text-rose-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative border border-gray-100 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900">Saved Places</h3>
          <p className="text-xs text-gray-400 mt-0.5">Quick access to frequent destinations</p>
        </div>

        {actionNotice && (
          <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* List of Places */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 my-2">
          {savedLocations.length === 0 && !isAdding ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p>No saved locations yet.</p>
              <p className="text-xs mt-1">Add your Home, Work, or favorite spots for 1-click booking.</p>
            </div>
          ) : (
            savedLocations.map((loc) => (
              <div
                key={loc.id}
                className="p-3.5 bg-gray-50 hover:bg-gray-100/80 rounded-2xl border border-gray-100 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(loc.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{loc.name}</p>
                    <p className="text-xs text-gray-500 truncate">{loc.address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => applyLocation(loc, 'pickup')}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-brand-50 text-brand-700 border border-gray-200 hover:border-brand-200 rounded-lg transition-colors"
                  >
                    Pickup
                  </button>
                  <button
                    onClick={() => applyLocation(loc, 'destination')}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-brand-50 text-brand-700 border border-gray-200 hover:border-brand-200 rounded-lg transition-colors"
                  >
                    Drop
                  </button>
                  <button
                    onClick={() => deleteSavedLocation(loc.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Add Location Form Inline */}
          {isAdding && (
            <form onSubmit={handleAddSubmit} className="p-4 bg-brand-50/50 border border-brand-100 rounded-2xl space-y-3 mt-3">
              <h4 className="text-xs font-bold text-brand-900 uppercase">New Saved Place</h4>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Place Type</label>
                <div className="flex gap-2">
                  {(['HOME', 'WORK', 'FAVORITE'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
                        type === t
                          ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {t.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Label Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Apartment, Gym, Office"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div className="relative">
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Search Address</label>
                <input
                  type="text"
                  placeholder="Search landmark or address..."
                  value={address}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
                {isSearching && (
                  <div className="absolute right-3 top-8">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
                    {searchResults.map((place) => (
                      <div
                        key={place.placeId}
                        onClick={() => selectPlace(place)}
                        className="p-2 hover:bg-brand-50 cursor-pointer text-xs border-b border-gray-100 last:border-b-0"
                      >
                        <p className="font-semibold text-gray-800">{place.mainText}</p>
                        <p className="text-[10px] text-gray-500 truncate">{place.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCoords}
                  className="flex-1 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Place'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-3 mt-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add New Location
          </button>
        )}
      </div>
    </div>
  );
};

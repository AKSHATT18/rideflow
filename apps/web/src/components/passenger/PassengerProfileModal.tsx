import React, { useEffect, useState } from 'react';
import { X, Phone, Mail, Award, Car, CreditCard, Star, Loader2, Check } from 'lucide-react';
import { usePassengerStore } from '../../store/passengerStore';

interface PassengerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PassengerProfileModal: React.FC<PassengerProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { profile, fetchProfile, updateProfile } = usePassengerStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen, fetchProfile]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setError(null);
      setMessage(null);
      await updateProfile({ firstName, lastName, phone });
      setIsSaving(false);
      setIsEditing(false);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setIsSaving(false);
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative border border-gray-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Avatar & Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-brand-50 border-2 border-brand-200 text-brand-700 text-2xl font-bold rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
            {profile?.firstName?.[0] || 'P'}
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            {profile?.firstName} {profile?.lastName}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Passenger Account</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          <div className="bg-gray-50 p-3 rounded-2xl text-center">
            <Car className="w-4 h-4 text-brand-600 mx-auto mb-1" />
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Rides</p>
            <p className="text-sm font-bold text-gray-900">{profile?.stats?.totalRides ?? 0}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-2xl text-center">
            <Award className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Completed</p>
            <p className="text-sm font-bold text-gray-900">{profile?.stats?.completedRides ?? 0}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-2xl text-center">
            <CreditCard className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Spent</p>
            <p className="text-sm font-bold text-gray-900">₹{profile?.stats?.totalSpent ?? 0}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-2xl text-center">
            <Star className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Avg Given</p>
            <p className="text-sm font-bold text-gray-900">{profile?.stats?.averageRatingGiven ?? 5.0}★</p>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold">
            {error}
          </div>
        )}

        {/* Profile Details Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                First Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={!isEditing}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full text-sm p-3 bg-gray-50 border border-gray-200 rounded-2xl disabled:bg-gray-100 disabled:text-gray-500 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Last Name
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full text-sm p-3 bg-gray-50 border border-gray-200 rounded-2xl disabled:bg-gray-100 disabled:text-gray-500 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Email Address
            </label>
            <div className="flex items-center gap-2 px-3 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm text-gray-500">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{profile?.email}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Phone Number
            </label>
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-2xl">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                disabled={!isEditing}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-sm py-2 bg-transparent disabled:text-gray-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3">
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm rounded-2xl transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

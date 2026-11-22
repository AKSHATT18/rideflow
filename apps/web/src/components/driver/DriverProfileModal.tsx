import { useState, useEffect } from 'react';
import { useDriverStore } from '../../store/driverStore';
import { Button } from '../Button';
import {
  X,
  User,
  Car,
  ShieldCheck,
  Star,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const DriverProfileModal = () => {
  const {
    profile,
    fetchProfile,
    updateProfile,
    isLoading,
    isProfileModalOpen,
    setProfileModalOpen,
  } = useDriverStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleYear, setVehicleYear] = useState<number | string>('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleCategory, setVehicleCategory] = useState<'ECONOMY' | 'COMFORT' | 'PREMIUM'>('ECONOMY');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isProfileModalOpen) {
      fetchProfile();
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isProfileModalOpen, fetchProfile]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setPhone(profile.phone || '');
      const dp = profile.driverProfile;
      setLicenseNumber(dp?.licenseNumber || '');
      setVehicleMake(dp?.vehicleMake || '');
      setVehicleModel(dp?.vehicleModel || '');
      setVehiclePlate(dp?.vehiclePlate || '');
      setVehicleYear(dp?.vehicleYear || '');
      setVehicleColor(dp?.vehicleColor || '');
      setVehicleCategory((dp?.vehicleCategory as any) || 'ECONOMY');
    }
  }, [profile]);

  if (!isProfileModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const ok = await updateProfile({
      firstName,
      lastName,
      phone,
      licenseNumber,
      vehicleMake,
      vehicleModel,
      vehiclePlate,
      vehicleYear: vehicleYear ? Number(vehicleYear) : undefined,
      vehicleColor,
      vehicleCategory,
    });

    if (ok) {
      setSuccessMessage('Profile and vehicle details updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage('Failed to update details. Please check the fields and try again.');
    }
  };

  const isVerified = profile?.driverProfile?.isVerified ?? true;
  const rating = profile?.driverProfile?.rating?.toFixed(1) || '5.0';
  const totalTrips = profile?.driverProfile?.totalTrips || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Driver & Vehicle Profile</h2>
              <p className="text-xs text-gray-500">Manage your credentials, vehicle specifications, and status</p>
            </div>
          </div>
          <button
            onClick={() => setProfileModalOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Badges Header */}
          <div className="grid grid-cols-3 gap-3">
            {/* Verification Badge */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Status</span>
                <span className="text-xs font-extrabold text-emerald-950">
                  {isVerified ? 'Verified Driver' : 'Pending Verification'}
                </span>
              </div>
            </div>

            {/* Rating Badge */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 fill-white stroke-none" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Rating</span>
                <span className="text-xs font-extrabold text-amber-950">
                  {rating} ★ ({profile?.driverProfile?.ratingCount || 0})
                </span>
              </div>
            </div>

            {/* Trips Badge */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Completed</span>
                <span className="text-xs font-extrabold text-blue-950">{totalTrips} Trips</span>
              </div>
            </div>
          </div>

          {/* Feedback Banners */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Personal Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
                <User className="w-4 h-4 text-brand-600" />
                <span>Personal Information</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full text-sm py-2 px-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full text-sm py-2 px-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ''}
                    className="w-full text-sm py-2 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm py-2 px-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Vehicle & License Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
                <Car className="w-4 h-4 text-brand-600" />
                <span>Vehicle & Driving Credentials</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Driving License Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. DL-042011001234"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="w-full text-sm py-2 px-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <FileText className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle Category</label>
                  <select
                    value={vehicleCategory}
                    onChange={(e) => setVehicleCategory(e.target.value as any)}
                    className="w-full text-sm py-2 px-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="ECONOMY">Standard / Economy</option>
                    <option value="COMFORT">Comfort Sedan</option>
                    <option value="PREMIUM">Premium / XL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle Make</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota, Honda, Hyundai"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    className="w-full text-sm py-2 px-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Innova, City, Verna"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full text-sm py-2 px-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Registration Plate</label>
                  <input
                    type="text"
                    placeholder="e.g. KA-01-AB-1234"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    className="w-full text-sm py-2 px-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Year</label>
                    <input
                      type="number"
                      placeholder="e.g. 2022"
                      value={vehicleYear}
                      onChange={(e) => setVehicleYear(e.target.value)}
                      className="w-full text-sm py-2 px-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Color</label>
                    <input
                      type="text"
                      placeholder="e.g. Silver, White"
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      className="w-full text-sm py-2 px-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="px-5 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              <Button type="submit" loading={isLoading} className="h-10 text-xs px-6">
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

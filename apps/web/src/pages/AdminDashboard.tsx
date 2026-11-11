import { LogOut, Users, Car, Map, BarChart3, Menu } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';

export const AdminDashboard = () => {
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100">
        <span className="text-xl font-bold text-gray-900 tracking-tight">RideFlow Admin</span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-600 rounded-lg hover:bg-gray-100">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "md:w-64 bg-white border-r border-gray-100 flex-col md:flex transition-all",
        mobileMenuOpen ? "flex h-[calc(100vh-64px)]" : "hidden h-screen"
      )}>
        <div className="hidden md:flex h-16 items-center px-6 border-b border-gray-100">
          <span className="text-xl font-bold text-gray-900 tracking-tight">RideFlow Admin</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <a href="#" className="flex items-center gap-3 px-3 py-2 bg-brand-50 text-brand-700 rounded-xl font-medium">
            <BarChart3 className="w-5 h-5" /> Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl font-medium opacity-50 cursor-not-allowed">
            <Users className="w-5 h-5" /> Passengers
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl font-medium opacity-50 cursor-not-allowed">
            <Car className="w-5 h-5" /> Drivers
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl font-medium opacity-50 cursor-not-allowed">
            <Map className="w-5 h-5" /> Active Rides
          </a>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto w-full">
        <header className="hidden md:flex h-16 bg-white border-b border-gray-100 items-center justify-between px-8 shrink-0">
          <h2 className="font-semibold text-gray-900">Overview</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Admin: {user?.firstName}</span>
          </div>
        </header>

        <div className="p-4 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {[
              { label: 'Total Users', value: '---' },
              { label: 'Active Drivers', value: '---' },
              { label: 'Rides Today', value: '---' },
              { label: 'Revenue', value: '---' }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                <h3 className="text-sm font-medium text-gray-500 mb-1">{stat.label}</h3>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[300px] sm:min-h-[400px] flex flex-col items-center justify-center p-6 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">System Overview Pending</h3>
            <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
              The admin dashboard data visualization, user management tables, and live ride map will be populated in later development phases.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

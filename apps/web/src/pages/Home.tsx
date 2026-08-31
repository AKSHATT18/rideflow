
import { Button } from '../components/Button';
import { MapPin, Navigation } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">RideFlow</span>
            </div>
            <nav className="flex gap-4">
              <Button variant="outline" to="/login">Log in</Button>
              <Button to="/register">Sign up</Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
        {/* Left Content */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12 lg:py-0">
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1]">
            Real-time rides.<br />
            <span className="text-brand-600">Right where you need them.</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed">
            Experience the next generation of ride-hailing. Live GPS tracking, transparent pricing, and professional drivers at your fingertips.
          </p>
          
          <div className="mt-10 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 max-w-md">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                <MapPin className="w-5 h-5 text-brand-600" />
                <input type="text" placeholder="Enter pickup location" className="bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-400 w-full font-medium outline-none" disabled />
              </div>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                <Navigation className="w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Where to?" className="bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-400 w-full font-medium outline-none" disabled />
              </div>
              <Button className="w-full mt-2" onClick={() => alert('Ride booking coming in Phase 2!')}>
                See prices
              </Button>
            </div>
          </div>
        </div>

        {/* Right Content - Abstract Map Visual */}
        <div className="flex-1 hidden lg:flex items-center justify-center p-12">
          <div className="relative w-full max-w-lg aspect-square bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden flex items-center justify-center">
            {/* Simple abstract map placeholder for MVP Phase 1 */}
            <div className="absolute inset-0 bg-gray-50" style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            <div className="relative z-10 flex flex-col items-center justify-center text-center p-8 bg-white/80 backdrop-blur-sm rounded-3xl border border-white">
              <Navigation className="w-12 h-12 text-brand-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900">Map Integration</h3>
              <p className="text-gray-500 mt-2 text-sm">Google Maps Platform will be integrated here in the next phase.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

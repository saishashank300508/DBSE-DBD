import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Navigation, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-br from-primary-50 via-emerald-50 to-primary-100 rounded-3xl mt-4 text-center px-4 shadow-sm border border-primary-100/50">
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
          Connect surplus food <br className="hidden md:block"/>
          with those who <span className="text-primary-600">need it most.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-gray-600 mb-10 leading-relaxed">
          A real-time platform connecting donors (restaurants, hotels, events) with nearby NGOs and volunteers to eliminate food waste and fight hunger.
        </p>

        {user ? (
          <div className="flex justify-center">
            <Link
              to={`/${user.role ? user.role.toLowerCase() : 'donor'}`}
              className="px-8 py-4 bg-primary-600 text-white font-bold rounded-full shadow-lg hover:bg-primary-700 hover:-translate-y-1 transition-all flex items-center gap-2 text-lg"
            >
              <span>Go to Your {user.role} Dashboard</span>
              <ArrowRight size={20} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register?role=DONOR"
              className="px-8 py-4 bg-primary-600 text-white font-bold rounded-full shadow-lg hover:bg-primary-700 hover:-translate-y-1 transition-all"
            >
              Join as a Donor
            </Link>
            <Link
              to="/register?role=NGO"
              className="px-8 py-4 bg-white text-primary-600 font-bold rounded-full shadow-lg hover:bg-gray-50 hover:-translate-y-1 transition-all border border-primary-200"
            >
              Register your NGO
            </Link>
            <Link
              to="/register?role=VOLUNTEER"
              className="px-8 py-4 bg-emerald-50 text-emerald-800 font-bold rounded-full shadow-lg hover:bg-emerald-100 hover:-translate-y-1 transition-all border border-emerald-200"
            >
              Join as Volunteer
            </Link>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="w-full py-20 px-4">
        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          <div className="flex flex-col items-center text-center group">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600 mb-6 group-hover:scale-110 transition-transform shadow-inner">
              <Navigation className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Live GPS Tracking</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Track surplus food donations in real-time from pickup to drop-off with live breadcrumbs and OSRM turn-by-turn ETA.
            </p>
          </div>
          <div className="flex flex-col items-center text-center group">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform shadow-inner">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Instant NGO Matches</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Our algorithm notifies NGOs within a 10 km radius instantly via WebSockets for rapid claim and rescue.
            </p>
          </div>
          <div className="flex flex-col items-center text-center group">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Verified OTP & Impact</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              4-digit handover OTPs eliminate fake pickups. Get verified distribution proof and downloadable impact certificates.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

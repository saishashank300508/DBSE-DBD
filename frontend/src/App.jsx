import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import PopupManager from './components/PopupManager';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import DonorDash from './pages/donor/DonorDash';
import NgoDash from './pages/ngo/NgoDash';
import VolDash from './pages/volunteer/VolDash';
import AdminDash from './pages/admin/AdminDash';
import LiveTracking from './pages/LiveTracking';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user's actual role
    const roleRoutes = { DONOR: '/donor', NGO: '/ngo', VOLUNTEER: '/volunteer', ADMIN: '/admin' };
    return <Navigate to={roleRoutes[user.role] || '/'} replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
        <Navbar />
        <PopupManager />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Donor */}
            <Route path="/donor/*" element={
              <ProtectedRoute allowedRoles={['DONOR']}><DonorDash /></ProtectedRoute>
            } />

            {/* NGO */}
            <Route path="/ngo/*" element={
              <ProtectedRoute allowedRoles={['NGO']}><NgoDash /></ProtectedRoute>
            } />

            {/* Volunteer */}
            <Route path="/volunteer/*" element={
              <ProtectedRoute allowedRoles={['VOLUNTEER']}><VolDash /></ProtectedRoute>
            } />

            {/* Admin */}
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['ADMIN']}><AdminDash /></ProtectedRoute>
            } />

            {/* Live tracking (accessible to authenticated users) */}
            <Route path="/tracking/:id" element={<LiveTracking />} />

            {/* Catch-all: redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

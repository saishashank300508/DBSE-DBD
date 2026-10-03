import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, MapPin, CheckCircle2, XCircle } from 'lucide-react';

// Password strength checker
function PasswordStrength({ password }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)', ok: /[A-Z]/.test(password) },
    { label: 'One digit (0-9)', ok: /[0-9]/.test(password) },
    { label: 'One special character (@#$%^&+=!)', ok: /[@#$%^&+=!]/.test(password) },
  ];
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1">
      {checks.map(c => (
        <li key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-green-600' : 'text-red-500'}`}>
          {c.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {c.label}
        </li>
      ))}
    </ul>
  );
}

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'DONOR',
    organization: '',
    address: '',
    city: '',
    latitude: 12.9716,
    longitude: 77.5946
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const role = params.get('role');
    if (role && ['DONOR', 'NGO', 'VOLUNTEER'].includes(role)) {
      setFormData(prev => ({
        ...prev,
        role,
        // Clear address/org when switching to volunteer
        address: role === 'VOLUNTEER' ? '' : prev.address,
        city: role === 'VOLUNTEER' ? '' : prev.city,
        organization: role === 'VOLUNTEER' ? '' : prev.organization
      }));
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'role' && value === 'VOLUNTEER') {
        updated.address = '';
        updated.city = '';
        updated.organization = '';
      }
      return updated;
    });
  };

  const handleLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationDetecting(true);
    setLocationSuccess(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }));
        setLocationDetecting(false);
        setLocationSuccess(true);
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err);
        setError('Location access was denied or timed out. Default coordinates are kept.');
        setLocationDetecting(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Extract a user-friendly message from any error shape
  const extractErrorMessage = (err) => {
    if (!err.response) return 'Unable to connect to server. Please check your connection.';
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    return `Registration failed (${err.response.status})`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    // Client-side password validation
    const pwd = formData.password;
    if (pwd.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(pwd)) { setError('Password must contain at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(pwd)) { setError('Password must contain at least one digit.'); return; }
    if (!/[@#$%^&+=!]/.test(pwd)) { setError('Password must contain at least one special character: @#$%^&+=!'); return; }

    // Client-side phone validation
    if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      setError('Phone must be a valid 10-digit Indian mobile number starting with 6-9.');
      return;
    }

    // Role-specific validation
    if (formData.role === 'NGO' && !formData.organization.trim()) {
      setError('Organization name is required for NGOs.');
      return;
    }
    if (formData.role !== 'VOLUNTEER' && !formData.address.trim()) {
      setError('Address is required for donors and NGOs.');
      return;
    }

    const payload = {
      ...formData,
      email: formData.email.trim().toLowerCase(),
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      address: formData.role === 'VOLUNTEER' ? null : formData.address.trim(),
      city: formData.role === 'VOLUNTEER' ? null : formData.city.trim(),
      organization: formData.role === 'VOLUNTEER' ? null : formData.organization.trim()
    };

    setLoading(true);
    try {
      const user = await register(payload);
      navigate(`/${user.role.toLowerCase()}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 mb-10 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <h2 className="text-3xl font-bold text-center mb-2 text-gray-900">Create an Account</h2>
      <p className="text-center text-gray-500 text-sm mb-8">Join Food Connect — fight hunger, reduce waste.</p>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-sm border border-red-200 flex items-start gap-2">
          <XCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        {/* Name + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Your full name"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="9876543210"
              maxLength={10}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
            <p className="text-xs text-gray-400 mt-1">10-digit number (starts with 6-9)</p>
          </div>
        </div>

        {/* Email + Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min 8 chars with A, 1, @"
                className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={formData.password} />
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">I am a... *</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white transition-all font-medium"
          >
            <option value="DONOR">🍽️ Food Donor (Restaurant, Event, Hotel, Household)</option>
            <option value="NGO">🏢 NGO / Charity Organization</option>
            <option value="VOLUNTEER">🙋 Volunteer (Pickup & Delivery)</option>
          </select>
        </div>

        {/* Organization (DONOR & NGO only) */}
        {formData.role !== 'VOLUNTEER' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name {formData.role === 'NGO' ? '*' : '(optional)'}
            </label>
            <input
              id="organization"
              name="organization"
              type="text"
              required={formData.role === 'NGO'}
              value={formData.organization}
              onChange={handleChange}
              placeholder={formData.role === 'NGO' ? 'e.g. Helping Hands Foundation' : 'Restaurant / hotel / household name'}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>
        )}

        {/* Address + City - hidden and optional for VOLUNTEER */}
        {formData.role !== 'VOLUNTEER' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <textarea
                id="address"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                rows="2"
                placeholder="Street address or landmark"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                id="city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Bangalore"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* Location Detection */}
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-800">
              {formData.role === 'VOLUNTEER' ? 'Operating Location: ' : 'Base Coordinates: '}
            </span>
            <span className="font-mono text-xs text-gray-500">
              {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
            </span>
            {locationSuccess && (
              <span className="ml-2 text-xs text-green-600 font-semibold inline-flex items-center gap-1">
                ✓ Detected
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleLocation}
            disabled={locationDetecting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg font-medium hover:bg-primary-100 text-sm transition-colors disabled:opacity-50"
          >
            <MapPin size={15} />
            {locationDetecting ? 'Detecting...' : 'Detect Location'}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition-colors mt-2 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"/>
              </svg>
              Creating Account...
            </>
          ) : 'Sign Up'}
        </button>
      </form>

      <p className="text-center mt-6 text-gray-600 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 font-bold hover:underline">Sign in</Link>
      </p>
    </div>
  );
}

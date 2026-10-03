import { useState, useEffect, useCallback } from 'react';
import { donationApi } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import FoodSafetyTimer from '../../components/FoodSafetyTimer';
import {
  Map, Loader2, RefreshCw, CheckCircle2, MapPin, Phone,
  Building, Navigation, Check, KeyRound, AlertCircle, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VolDash() {
  const { user } = useAuth();
  const { stompClient } = useNotifications();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // OTP Verification Modal state
  const [otpModal, setOtpModal] = useState(null); // { donation, targetStatus, title, placeholder, prompt }
  const [otpInput, setOtpInput] = useState('');

  const navigate = useNavigate();

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchDash = useCallback(async () => {
    if (!user?.profileId) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await donationApi.get(`/donations/volunteer/${user.profileId}`);
      setAssignments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error fetching volunteer assignments:', e);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.profileId]);

  useEffect(() => {
    fetchDash();
  }, [fetchDash]);

  // Real-time WebSocket listener for volunteer assignments
  useEffect(() => {
    if (stompClient && stompClient.connected && user?.profileId) {
      const sub1 = stompClient.subscribe(`/topic/volunteer/${user.profileId}/assignments`, () => {
        fetchDash();
        showToast('New pickup task assigned to you!');
      });

      const sub2 = stompClient.subscribe('/topic/donations', () => {
        fetchDash();
      });

      return () => {
        try {
          sub1.unsubscribe();
          sub2.unsubscribe();
        } catch (e) {
          // ignore
        }
      };
    }
  }, [stompClient, user?.profileId, fetchDash]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDash();
  };

  const handleAcceptTask = async (donationId) => {
    setActionLoading(true);
    try {
      await donationApi.put(`/donations/${donationId}/accept-task`);
      showToast('Task accepted! You are now on the way for pickup.');
      fetchDash();
      navigate(`/tracking/${donationId}`);
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to accept task', 'error');
    }
    setActionLoading(false);
  };

  const openOtpModal = (donation, targetStatus) => {
    setOtpInput('');
    if (targetStatus === 'PICKED_UP') {
      setOtpModal({
        donation,
        targetStatus,
        title: 'Verify Food Pickup',
        prompt: 'Ask the Donor for the 4-digit Pickup OTP to verify food collection.',
        buttonLabel: 'Confirm Food Picked Up'
      });
    } else if (targetStatus === 'REACHED_NGO') {
      setOtpModal({
        donation,
        targetStatus,
        title: 'Verify Delivery to NGO',
        prompt: 'Ask the NGO staff for the 4-digit Delivery OTP to confirm food handover.',
        buttonLabel: 'Confirm Safe Delivery'
      });
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpModal || !otpInput.trim()) return;

    setActionLoading(true);
    try {
      await donationApi.put(`/donations/${otpModal.donation.id}/status`, {
        status: otpModal.targetStatus,
        otp: otpInput.trim()
      });
      showToast(
        otpModal.targetStatus === 'PICKED_UP'
          ? 'Pickup verified successfully with OTP!'
          : 'Delivery verified successfully with OTP!'
      );
      setOtpModal(null);
      setOtpInput('');
      fetchDash();
    } catch (e) {
      showToast(e.response?.data?.message || 'OTP verification failed. Please check the code.', 'error');
    }
    setActionLoading(false);
  };

  const getStatusBadge = (status) => {
    const styles = {
      VOLUNTEER_ASSIGNED: 'bg-purple-100 text-purple-800 border-purple-200',
      PICKUP_IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
      PICKED_UP: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      REACHED_NGO: 'bg-teal-100 text-teal-800 border-teal-200',
      DISTRIBUTED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-primary-500 w-12 h-12" />
        <p className="text-gray-500 font-medium">Loading volunteer assignments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between shadow-md transition-all ${
          notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="font-medium text-sm">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Volunteer Dashboard</h1>
          <p className="text-gray-600">Your assigned food pickups and transit deliveries.</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh Tasks
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Assigned Pickups ({assignments.length})
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full">
            Active Volunteer #{user?.profileId || 'N/A'}
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">All Caught Up!</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              You currently have no pending pickup assignments. When an NGO assigns you to a surplus food donation, it will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((d) => (
              <div
                key={d.id}
                className="border border-gray-200 hover:border-primary-300 rounded-2xl p-5 flex flex-col gap-4 transition-all hover:shadow-sm bg-white"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg text-gray-900">{d.foodName}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(d.status)}`}>
                      {d.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                      {d.quantity} servings • {d.foodType}
                    </span>
                  </div>
                  <FoodSafetyTimer expiresAt={d.expiresAt} />
                </div>

                {/* Details grid: Pickup & Dropoff */}
                <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-primary-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-gray-800 text-xs uppercase block">Pickup Location (Donor)</span>
                        <span className="text-xs">{d.pickupAddress}</span>
                      </div>
                    </div>
                    {d.contactNumber && (
                      <div className="flex items-center gap-2 pl-6">
                        <Phone size={14} className="text-gray-400" />
                        <a href={`tel:${d.contactNumber}`} className="text-xs text-primary-600 font-semibold hover:underline">
                          Donor: {d.contactNumber} (Tap to Call)
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:border-l sm:pl-3 border-gray-200">
                    <div className="flex items-start gap-2">
                      <Building size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-gray-800 text-xs uppercase block">Drop-off Destination (NGO)</span>
                        <span className="text-xs font-medium text-gray-900">{d.ngoName || 'NGO Drop-off Shelter'}</span>
                        {d.ngoAddress && <span className="text-xs block text-gray-500">{d.ngoAddress}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-1 items-center justify-between">
                  <button
                    onClick={() => navigate(`/tracking/${d.id}`)}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Navigation size={14} />
                    <span>Live GPS Map & Route</span>
                  </button>

                  <div className="flex gap-2 flex-wrap">
                    {d.status === 'VOLUNTEER_ASSIGNED' && (
                      <button
                        onClick={() => handleAcceptTask(d.id)}
                        disabled={actionLoading}
                        className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Check size={14} />
                        <span>Accept Task / Start Pickup</span>
                      </button>
                    )}

                    {d.status === 'PICKUP_IN_PROGRESS' && (
                      <button
                        onClick={() => openOtpModal(d, 'PICKED_UP')}
                        disabled={actionLoading}
                        className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <KeyRound size={14} />
                        <span>Confirm Picked Up (Enter OTP)</span>
                      </button>
                    )}

                    {d.status === 'PICKED_UP' && (
                      <button
                        onClick={() => openOtpModal(d, 'REACHED_NGO')}
                        disabled={actionLoading}
                        className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <KeyRound size={14} />
                        <span>Confirm Delivered (Enter OTP)</span>
                      </button>
                    )}

                    {d.status === 'REACHED_NGO' && (
                      <span className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={14} /> Food delivered to NGO!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OTP Verification Modal */}
      {otpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <KeyRound className="text-primary-600" size={20} />
                {otpModal.title}
              </h3>
              <button onClick={() => setOtpModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              {otpModal.prompt}
            </p>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Enter 4-Digit Handover OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="e.g. 4821"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl text-center text-xl font-mono tracking-widest font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setOtpModal(null)}
                  className="px-4 py-2 border rounded-xl text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !otpInput.trim()}
                  className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50 shadow-sm"
                >
                  {actionLoading ? 'Verifying...' : otpModal.buttonLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

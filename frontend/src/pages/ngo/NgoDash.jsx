import { useState, useEffect, useCallback } from 'react';
import { donationApi } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import FoodSafetyTimer from '../../components/FoodSafetyTimer';
import {
  MapPin, Navigation, UserCheck, Loader2, CheckCircle2,
  AlertCircle, Compass, Users, Check, X, ShieldAlert, Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NgoDash() {
  const { user } = useAuth();
  const { stompClient } = useNotifications();
  const navigate = useNavigate();

  const [nearby, setNearby] = useState([]);
  const [myAccepted, setMyAccepted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState({ lat: 12.9716, lng: 77.5946 });
  const [radius, setRadius] = useState(10); // Standardized to 10 km
  const [locating, setLocating] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modal states
  const [assignModal, setAssignModal] = useState(null); // donation obj
  const [volunteersList, setVolunteersList] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [volunteerIdInput, setVolunteerIdInput] = useState('');
  const [distributeModal, setDistributeModal] = useState(null); // donation obj
  const [distributeForm, setDistributeForm] = useState({
    beneficiaryCount: 50,
    locationName: '',
    notes: '',
  });
  const [submittingAction, setSubmittingAction] = useState(false);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchNearby = useCallback(async (currentCoords = coords, currentRadius = radius) => {
    try {
      const res = await donationApi.get(
        `/donations/nearby?lat=${currentCoords.lat}&lng=${currentCoords.lng}&radius=${currentRadius}`
      );
      setNearby(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to fetch nearby donations:', e);
    }
  }, [coords, radius]);

  const fetchMyAccepted = useCallback(async () => {
    if (!user?.profileId) return;
    try {
      const res = await donationApi.get(`/donations/ngo/${user.profileId}`);
      setMyAccepted(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to fetch accepted donations:', e);
    }
  }, [user?.profileId]);

  const fetchDash = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchNearby(coords, radius),
      fetchMyAccepted()
    ]);
    setLoading(false);
  }, [fetchNearby, fetchMyAccepted, coords, radius]);

  useEffect(() => {
    fetchDash();
  }, [fetchDash]);

  // Live WebSocket update on /topic/donations
  useEffect(() => {
    if (stompClient && stompClient.connected) {
      const sub = stompClient.subscribe('/topic/donations', () => {
        fetchNearby(coords, radius);
        fetchMyAccepted();
      });
      return () => {
        try {
          sub.unsubscribe();
        } catch (e) {
          // ignore
        }
      };
    }
  }, [stompClient, fetchNearby, fetchMyAccepted, coords, radius]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(newCoords);
        fetchNearby(newCoords, radius);
        setLocating(false);
        showToast('Location updated from your GPS!');
      },
      () => {
        setLocating(false);
        showToast('Could not get GPS location. Using default coordinates.', 'error');
      }
    );
  };

  const handleAccept = async (donationId) => {
    if (!user?.profileId) {
      showToast('NGO profile ID not found. Please log in again.', 'error');
      return;
    }
    try {
      await donationApi.put(`/donations/${donationId}/accept?ngoId=${user.profileId}`);
      showToast('Donation accepted successfully!');
      fetchDash();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to accept donation', 'error');
    }
  };

  const openAssignModal = async (donation) => {
    setAssignModal(donation);
    setVolunteerIdInput('');
    setLoadingVolunteers(true);
    try {
      const res = await donationApi.get(`/donations/${donation.id}/available-volunteers`);
      const list = Array.isArray(res.data) ? res.data : [];
      setVolunteersList(list);
      if (list.length > 0) {
        setVolunteerIdInput(String(list[0].id));
      }
    } catch (e) {
      console.error('Failed to load volunteers:', e);
      showToast('Could not load volunteers list', 'error');
    } finally {
      setLoadingVolunteers(false);
    }
  };

  const handleAssignVolunteer = async (e) => {
    e.preventDefault();
    if (!assignModal) return;
    if (!volunteerIdInput) {
      showToast('Please select a volunteer from the list', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      const volunteerId = Number(volunteerIdInput);
      await donationApi.put(`/donations/${assignModal.id}/assign-volunteer`, {
        volunteerId
      });
      showToast('Volunteer assigned successfully! Notifications sent.');
      setAssignModal(null);
      setVolunteerIdInput('');
      fetchDash();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to assign volunteer', 'error');
    }
    setSubmittingAction(false);
  };

  const autoAssignNearestVolunteer = async (donationId) => {
    setSubmittingAction(true);
    try {
      const res = await donationApi.post(`/donations/${donationId}/auto-assign-volunteer`);
      showToast(`Auto-assigned volunteer successfully! (${res.data?.assignedVolunteerName || 'Nearest'})`);
      setAssignModal(null);
      setVolunteerIdInput('');
      fetchDash();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to auto-assign volunteer', 'error');
    }
    setSubmittingAction(false);
  };

  const handleRecordDistribution = async (e) => {
    e.preventDefault();
    if (!distributeModal) return;
    setSubmittingAction(true);
    try {
      await donationApi.post(`/donations/distributions?ngoId=${user.profileId}`, {
        donationId: distributeModal.id,
        beneficiaryCount: Number(distributeForm.beneficiaryCount),
        locationName: distributeForm.locationName || 'Community Shelter',
        notes: distributeForm.notes,
      });
      showToast('Food distribution recorded successfully! Impact verified.');
      setDistributeModal(null);
      setDistributeForm({ beneficiaryCount: 50, locationName: '', notes: '' });
      fetchDash();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to record distribution', 'error');
    }
    setSubmittingAction(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      POSTED: 'bg-blue-100 text-blue-800 border-blue-200',
      ACCEPTED_BY_NGO: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      VOLUNTEER_ASSIGNED: 'bg-purple-100 text-purple-800 border-purple-200',
      PICKUP_IN_PROGRESS: 'bg-orange-100 text-orange-800 border-orange-200',
      PICKED_UP: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      REACHED_NGO: 'bg-teal-100 text-teal-800 border-teal-200',
      DISTRIBUTED: 'bg-green-100 text-green-800 border-green-200',
      EXPIRED: 'bg-red-100 text-red-800 border-red-200',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-primary-500 w-12 h-12" />
        <p className="text-gray-500 font-medium">Loading NGO Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">NGO Dashboard</h1>
          <p className="text-gray-600">Discover surplus donations in your area and assign volunteers for pickup.</p>
        </div>

        {/* Location & Radius Controls */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border shadow-sm flex-wrap">
          <button
            onClick={detectLocation}
            disabled={locating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            {locating ? <Loader2 size={16} className="animate-spin" /> : <Compass size={16} />}
            {locating ? 'Detecting...' : 'My GPS'}
          </button>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Radius:</span>
            <select
              value={radius}
              onChange={(e) => {
                const r = Number(e.target.value);
                setRadius(r);
                fetchNearby(coords, r);
              }}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={20}>20 km</option>
              <option value={50}>50 km</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Nearby Available Donations */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-primary-700">
              <MapPin size={24} /> Available Donations ({nearby.length})
            </h2>
            <span className="text-xs text-gray-400">Within {radius} km</span>
          </div>

          {nearby.length === 0 ? (
            <div className="text-gray-500 text-center py-12 flex-1 flex flex-col items-center justify-center">
              <MapPin size={36} className="text-gray-300 mb-2" />
              <p className="font-medium">No available donations nearby.</p>
              <p className="text-sm text-gray-400 mt-1">Try expanding the search radius or check back shortly.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
              {nearby.map((d) => (
                <div key={d.id} className="border rounded-xl p-4 hover:border-primary-400 hover:shadow-sm transition-all bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{d.foodName}</h3>
                      <p className="text-xs text-gray-500">{d.pickupAddress}</p>
                    </div>
                    {d.distanceKm !== undefined && (
                      <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
                        {d.distanceKm.toFixed(1)} km away
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-3 items-center">
                    <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                      {d.foodType}
                    </span>
                    <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                      {d.quantity} servings
                    </span>
                    <FoodSafetyTimer expiresAt={d.expiresAt} />
                  </div>

                  {d.description && (
                    <p className="text-xs text-gray-500 mb-3 italic">"{d.description}"</p>
                  )}

                  <button
                    onClick={() => handleAccept(d.id)}
                    className="w-full bg-primary-600 text-white font-medium py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Check size={16} /> Accept & Reserve Food
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accepted Pickups / Ongoing Distributions */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
            <UserCheck size={24} /> My Pickups ({myAccepted.length})
          </h2>

          {myAccepted.length === 0 ? (
            <div className="text-gray-500 text-center py-12 flex-1 flex flex-col items-center justify-center">
              <UserCheck size={36} className="text-gray-300 mb-2" />
              <p className="font-medium">You haven't accepted any donations yet.</p>
              <p className="text-sm text-gray-400 mt-1">Accept donations from the list on the left to start collecting.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
              {myAccepted.map((d) => (
                <div key={d.id} className="border rounded-xl p-4 bg-gray-50/70 hover:bg-gray-50 transition-colors space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">{d.foodName}</h3>
                      <p className="text-xs text-gray-500">{d.quantity} servings • {d.foodType}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getStatusColor(d.status)}`}>
                      {d.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <FoodSafetyTimer expiresAt={d.expiresAt} compact={true} />
                  </div>

                  <p className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-100">
                    <span className="font-medium text-gray-700">Pickup:</span> {d.pickupAddress}
                    {d.contactNumber && (
                      <span className="ml-2 text-gray-500">
                        📞 <a href={`tel:${d.contactNumber}`} className="hover:underline">{d.contactNumber}</a>
                      </span>
                    )}
                  </p>

                  {/* Delivery OTP verification card for NGO */}
                  {d.deliveryOtp && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-1.5 rounded-lg flex items-center justify-between">
                      <span className="font-medium">Delivery Verification OTP:</span>
                      <span className="font-mono font-bold text-sm tracking-widest bg-white px-2.5 py-0.5 rounded border border-emerald-300 shadow-xs">
                        {d.deliveryOtp}
                      </span>
                    </div>
                  )}

                  {/* Volunteer info if assigned */}
                  {d.assignedVolunteerName && (
                    <div className="text-xs text-gray-600 bg-purple-50 border border-purple-100 p-2 rounded flex items-center justify-between">
                      <span>Assigned Volunteer: <strong>{d.assignedVolunteerName}</strong></span>
                      {d.assignedVolunteerPhone && (
                        <a href={`tel:${d.assignedVolunteerPhone}`} className="text-purple-700 font-semibold flex items-center gap-1 hover:underline">
                          <Phone size={12} /> {d.assignedVolunteerPhone}
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => navigate(`/tracking/${d.id}`)}
                      className="flex-1 min-w-[120px] bg-white border border-gray-300 text-gray-700 py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-gray-100 flex justify-center items-center gap-1.5 transition-colors"
                    >
                      <Navigation size={14} /> Live Track / GPS
                    </button>

                    {d.status === 'ACCEPTED_BY_NGO' && (
                      <button
                        onClick={() => openAssignModal(d)}
                        className="flex-1 min-w-[120px] bg-blue-600 text-white py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-blue-700 flex justify-center items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Users size={14} /> Assign Volunteer
                      </button>
                    )}

                    {d.status === 'REACHED_NGO' && (
                      <button
                        onClick={() => {
                          setDistributeModal(d);
                          setDistributeForm({
                            beneficiaryCount: d.quantity || 50,
                            locationName: '',
                            notes: ''
                          });
                        }}
                        className="flex-1 min-w-[120px] bg-emerald-600 text-white py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-emerald-700 flex justify-center items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <CheckCircle2 size={14} /> Record Distribution
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Volunteer Modal with Smart Matching */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="text-primary-600" size={20} />
                Assign Volunteer
              </h3>
              <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Assign a volunteer to collect <strong>{assignModal.foodName}</strong> ({assignModal.quantity} servings) from {assignModal.pickupAddress}.
            </p>

            {loadingVolunteers ? (
              <div className="p-8 flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin text-primary-500 w-8 h-8" />
                <p className="text-sm text-gray-500">Ranking nearby available volunteers...</p>
              </div>
            ) : (
              <form onSubmit={handleAssignVolunteer} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                    Available Volunteers (Ranked by Distance & Workload)
                  </label>
                  
                  {volunteersList.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                      <ShieldAlert size={16} className="flex-shrink-0" />
                      <span>No registered volunteers currently marked active in this area.</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {volunteersList.map((vol) => (
                        <label
                          key={vol.id}
                          className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
                            String(vol.id) === volunteerIdInput ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="volunteer"
                              value={String(vol.id)}
                              checked={String(vol.id) === volunteerIdInput}
                              onChange={(e) => setVolunteerIdInput(e.target.value)}
                              className="text-primary-600 focus:ring-primary-500"
                            />
                            <div>
                              <p className="text-sm font-bold text-gray-900">{vol.fullName}</p>
                              <p className="text-xs text-gray-500">{vol.phone || 'No phone'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                              {vol.distanceKm !== undefined ? `${vol.distanceKm} km away` : 'Nearby'}
                            </span>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {vol.activeTasks || 0} active task{vol.activeTasks === 1 ? '' : 's'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-4 text-xs font-semibold text-gray-400 uppercase">Or One-Click Match</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <button
                    type="button"
                    disabled={submittingAction || volunteersList.length === 0}
                    onClick={() => autoAssignNearestVolunteer(assignModal.id)}
                    className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    <span>⚡ Auto-assign Nearest Volunteer</span>
                  </button>
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setAssignModal(null)}
                    className="px-4 py-2 border rounded-xl text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction || !volunteerIdInput}
                    className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50 shadow-sm"
                  >
                    {submittingAction ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Record Distribution Modal */}
      {distributeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Record Food Distribution</h3>
              <button onClick={() => setDistributeModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Record meals served for <strong>{distributeModal.foodName}</strong> to finalize the donation lifecycle.
            </p>
            <form onSubmit={handleRecordDistribution} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Beneficiaries Served *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={distributeForm.beneficiaryCount}
                  onChange={(e) => setDistributeForm({ ...distributeForm, beneficiaryCount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Distribution Location Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. City Community Center"
                  value={distributeForm.locationName}
                  onChange={(e) => setDistributeForm({ ...distributeForm, locationName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Fresh meals provided to families in the area"
                  value={distributeForm.notes}
                  onChange={(e) => setDistributeForm({ ...distributeForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDistributeModal(null)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submittingAction ? 'Recording...' : 'Mark as Distributed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

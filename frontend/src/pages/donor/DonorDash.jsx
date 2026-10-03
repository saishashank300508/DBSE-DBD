import { useState, useEffect, useCallback } from 'react';
import { donationApi } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import FoodSafetyTimer from '../../components/FoodSafetyTimer';
import ImpactCertificateModal from '../../components/ImpactCertificateModal';
import {
  Plus, Map, List as ListIcon, Loader2, Award, KeyRound,
  CheckCircle2, Heart, Leaf, Users, AlertCircle, Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DonorDash() {
  const { user } = useAuth();
  const { stompClient } = useNotifications();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [certModal, setCertModal] = useState(null); // donation obj for impact certificate
  const navigate = useNavigate();

  const pad = (n) => String(n).padStart(2, '0');
  const formatLocal = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const [formData, setFormData] = useState({
    foodName: '',
    foodType: 'VEG',
    quantity: 10,
    cookedAt: formatLocal(new Date()),
    expiresAt: formatLocal(new Date(Date.now() + 4 * 3600000)),
    pickupAddress: '',
    latitude: 12.9716,
    longitude: 77.5946,
    contactNumber: '',
    description: '',
    notificationRadiusKm: 10
  });

  const fetchMyDonations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await donationApi.get('/donations/my');
      setDonations(data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMyDonations();
  }, [fetchMyDonations]);

  // Live WebSocket listener for donor's donations
  useEffect(() => {
    if (stompClient && stompClient.connected) {
      const sub = stompClient.subscribe('/topic/donations', () => {
        fetchMyDonations();
      });
      return () => {
        try {
          sub.unsubscribe();
        } catch (e) {
          // ignore
        }
      };
    }
  }, [stompClient, fetchMyDonations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const cookedTime = new Date(formData.cookedAt).getTime();
    const expiresTime = new Date(formData.expiresAt).getTime();
    const now = Date.now();

    if (expiresTime <= now) {
      setFormError('Expiry time must be in the future.');
      return;
    }
    if (expiresTime <= cookedTime) {
      setFormError('Expiry time must be after the cooked time.');
      return;
    }

    try {
      const toApiDateTime = (val) => {
        if (!val) return '';
        if (val.length === 16) return `${val}:00`;
        if (val.length === 19) return val;
        const d = new Date(val);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      };
      const payload = {
        ...formData,
        cookedAt: toApiDateTime(formData.cookedAt),
        expiresAt: toApiDateTime(formData.expiresAt)
      };
      await donationApi.post('/donations', payload);
      setShowForm(false);
      setFormSuccess('Donation posted! Nearby NGOs have been notified.');
      fetchMyDonations();
    } catch (e) {
      setFormError(e.response?.data?.message || e.message || 'Failed to post donation');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      POSTED: 'bg-blue-100 text-blue-800 border-blue-200',
      ACCEPTED_BY_NGO: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      VOLUNTEER_ASSIGNED: 'bg-purple-100 text-purple-800 border-purple-200',
      PICKUP_IN_PROGRESS: 'bg-orange-100 text-orange-800 border-orange-200',
      PICKED_UP: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      REACHED_NGO: 'bg-teal-100 text-teal-800 border-teal-200',
      DISTRIBUTED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
      EXPIRED: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Donor Dashboard</h1>
          <p className="text-gray-600 text-sm">Post surplus food and track donations from kitchen to beneficiary.</p>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); setFormError(''); setFormSuccess(''); }}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          {showForm ? <ListIcon size={20}/> : <Plus size={20}/>}
          {showForm ? 'View My Donations' : 'Donate Food'}
        </button>
      </div>

      {formSuccess && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl mb-6 font-medium flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span>{formSuccess}</span>
        </div>
      )}

      {showForm ? (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border mb-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Create New Food Donation</h2>
          {formError && (
            <div className="bg-red-50 text-red-700 border border-red-200 p-3.5 rounded-xl mb-4 text-sm flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Food Item *</label>
                <input
                  required
                  type="text"
                  value={formData.foodName}
                  onChange={e => setFormData({...formData, foodName: e.target.value})}
                  className="w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. 50 veg meals or paneer biryani"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.foodType}
                    onChange={e => setFormData({...formData, foodType: e.target.value})}
                    className="w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="VEG">Veg</option>
                    <option value="NON_VEG">Non-Veg</option>
                    <option value="BOTH">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Servings *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                    className="w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cooked At *</label>
                <input
                  required
                  type="datetime-local"
                  value={formData.cookedAt}
                  onChange={e => setFormData({...formData, cookedAt: e.target.value})}
                  className="w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (Safe Until) *</label>
                <input
                  required
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={e => setFormData({...formData, expiresAt: e.target.value})}
                  className="w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address *</label>
                <textarea
                  required
                  rows="2"
                  value={formData.pickupAddress}
                  onChange={e => setFormData({...formData, pickupAddress: e.target.value})}
                  className="w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Street address or kitchen gate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone *</label>
                <input
                  required
                  type="tel"
                  maxLength={10}
                  value={formData.contactNumber}
                  onChange={e => setFormData({...formData, contactNumber: e.target.value})}
                  className="w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="10 digit mobile number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. Packed in clean steel containers, ready for immediate pickup"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary-600 text-white font-bold py-3.5 rounded-xl hover:bg-primary-700 transition-colors shadow-sm mt-4 text-base"
            >
              Post Food Donation
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary-500 w-8 h-8"/></div>
          ) : donations.length === 0 ? (
            <div className="p-16 text-center text-gray-500">
              <p className="font-semibold text-gray-700 text-lg mb-1">You haven't posted any donations yet.</p>
              <p className="text-sm text-gray-400">Click "Donate Food" above to share surplus meals with nearby NGOs.</p>
            </div>
          ) : (
            <div className="divide-y">
              {donations.map(d => {
                const isDeliveredOrDistributed = ['REACHED_NGO', 'DISTRIBUTED'].includes(d.status);
                const isInTransit = ['ACCEPTED_BY_NGO', 'VOLUNTEER_ASSIGNED', 'PICKUP_IN_PROGRESS', 'PICKED_UP', 'OUT_FOR_DISTRIBUTION'].includes(d.status);

                return (
                  <div key={d.id} className="p-6 flex flex-col gap-4 hover:bg-gray-50/60 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h3 className="font-bold text-lg text-gray-900">{d.foodName}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(d.status)}`}>
                            {d.status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                            {d.quantity} servings • {d.foodType}
                          </span>
                          <FoodSafetyTimer expiresAt={d.expiresAt} />
                        </div>
                        <p className="text-gray-500 text-xs">
                          Pickup Address: {d.pickupAddress}
                          {d.ngoName && <span className="ml-2 font-medium text-gray-700">• Claimed by: {d.ngoName}</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {isInTransit && (
                          <button 
                            onClick={() => navigate(`/tracking/${d.id}`)}
                            className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Map size={15} /> Track Live GPS
                          </button>
                        )}

                        {isDeliveredOrDistributed && (
                          <button
                            onClick={() => setCertModal(d)}
                            className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl hover:bg-emerald-100 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <Award size={15} className="text-emerald-600" />
                            <span>Impact Certificate</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pickup OTP Box for Donor */}
                    {d.pickupOtp && ['ACCEPTED_BY_NGO', 'VOLUNTEER_ASSIGNED', 'PICKUP_IN_PROGRESS'].includes(d.status) && (
                      <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-amber-900 text-xs">
                          <KeyRound size={16} className="text-amber-600 flex-shrink-0" />
                          <span>
                            <strong>Pickup Verification OTP:</strong> Share this 4-digit code with the collector/volunteer when they arrive to take the food.
                          </span>
                        </div>
                        <span className="font-mono text-lg font-black tracking-widest text-amber-900 bg-white px-3 py-1 rounded-lg border border-amber-300 shadow-xs self-start sm:self-auto">
                          {d.pickupOtp}
                        </span>
                      </div>
                    )}

                    {/* Impact Card Summary for delivered/distributed */}
                    {isDeliveredOrDistributed && (
                      <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-primary-50/60 p-4 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-6 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Users size={18} className="text-emerald-600" />
                            <div>
                              <div className="text-xs text-gray-500 font-medium">Meals Provided</div>
                              <div className="text-sm font-black text-gray-900">{d.quantity} meals</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Heart size={18} className="text-rose-500" />
                            <div>
                              <div className="text-xs text-gray-500 font-medium">Food Rescued</div>
                              <div className="text-sm font-black text-gray-900">{(d.quantity * 0.4).toFixed(1)} kg</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Leaf size={18} className="text-teal-600" />
                            <div>
                              <div className="text-xs text-gray-500 font-medium">CO₂e Prevented</div>
                              <div className="text-sm font-black text-gray-900">{(d.quantity * 0.4 * 2.5).toFixed(1)} kg</div>
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                          ✓ Mission Accomplished
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Impact Certificate Modal */}
      {certModal && (
        <ImpactCertificateModal
          donation={certModal}
          donorName={user?.fullName}
          onClose={() => setCertModal(null)}
        />
      )}
    </div>
  );
}

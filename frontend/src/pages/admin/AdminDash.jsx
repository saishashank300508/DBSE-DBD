import { useState, useEffect } from 'react';
import { donationApi, authApi } from '../../api/axios';
import { Users, Package, BarChart3, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-2xl shadow-sm border p-6 flex items-center gap-4">
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-7 h-7" />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value ?? '—'}</p>
    </div>
  </div>
);

export default function AdminDash() {
  const [stats, setStats] = useState(null);
  const [donations, setDonations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, donationsRes, usersRes] = await Promise.all([
          donationApi.get('/donations/admin/stats'),
          donationApi.get('/donations'),
          authApi.get('/auth/users'),
        ]);
        setStats(statsRes.data);
        setDonations(donationsRes.data);
        setUsers(usersRes.data);
      } catch (e) {
        console.error(e);
        setError(e.response?.data?.message || 'Failed to load admin data. Make sure you are logged in as ADMIN.');
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const getStatusBadge = (status) => {
    const colors = {
      POSTED: 'bg-blue-100 text-blue-800',
      ACCEPTED_BY_NGO: 'bg-yellow-100 text-yellow-800',
      VOLUNTEER_ASSIGNED: 'bg-purple-100 text-purple-800',
      PICKUP_IN_PROGRESS: 'bg-orange-100 text-orange-800',
      PICKED_UP: 'bg-cyan-100 text-cyan-800',
      REACHED_NGO: 'bg-teal-100 text-teal-800',
      DISTRIBUTED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      EXPIRED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return (
    <div className="p-12 flex justify-center">
      <Loader2 className="animate-spin text-primary-500 w-12 h-12" />
    </div>
  );

  if (error) return (
    <div className="p-12 text-center">
      <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <p className="text-red-600 font-medium">{error}</p>
    </div>
  );

  const tabs = ['overview', 'donations', 'users'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Package} label="Total Donations" value={stats.totalDonations} color="bg-blue-100 text-blue-600" />
            <StatCard icon={CheckCircle2} label="Distributed" value={stats.distributedDonations} color="bg-green-100 text-green-600" />
            <StatCard icon={Clock} label="Active Donations" value={stats.activeDonations} color="bg-yellow-100 text-yellow-600" />
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="bg-purple-100 text-purple-600" />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <StatCard icon={BarChart3} label="Total Meals Served" value={stats.totalMealsServed?.toLocaleString()} color="bg-orange-100 text-orange-600" />
            <StatCard icon={Users} label="NGOs" value={stats.totalNgos} color="bg-cyan-100 text-cyan-600" />
            <StatCard icon={XCircle} label="Expired/Cancelled" value={(stats.expiredDonations ?? 0) + (stats.cancelledDonations ?? 0)} color="bg-red-100 text-red-600" />
          </div>

          {/* Users by Role */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-bold mb-4">Users by Role</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {['DONOR', 'NGO', 'VOLUNTEER', 'ADMIN'].map(role => {
                const count = users.filter(u => u.role === role).length;
                return (
                  <div key={role} className="border rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-500 mt-1">{role}s</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Donations Tab */}
      {activeTab === 'donations' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-lg">All Donations ({donations.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">ID</th>
                  <th className="px-4 py-3 text-left font-medium">Food</th>
                  <th className="px-4 py-3 text-left font-medium">Qty</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Location</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {donations.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">#{d.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{d.foodName}</div>
                      <div className="text-xs text-gray-400">{d.foodType}</div>
                    </td>
                    <td className="px-4 py-3">{d.quantity}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusBadge(d.status)}`}>
                        {d.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">{d.pickupAddress}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {donations.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No donations found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg">All Users ({users.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">ID</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">#{u.id}</td>
                    <td className="px-4 py-3 font-medium">{u.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        u.role === 'DONOR' ? 'bg-blue-100 text-blue-700' :
                        u.role === 'NGO' ? 'bg-green-100 text-green-700' :
                        u.role === 'VOLUNTEER' ? 'bg-purple-100 text-purple-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

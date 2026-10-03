import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { donationApi, trackingApi } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Loader2, ArrowLeft, CheckCircle2, Navigation, MapPin, Building,
  KeyRound, ShieldCheck, Clock, Route, AlertCircle, X
} from 'lucide-react';

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 1. Pickup Pin (Green)
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// 2. Drop-off Pin (Red)
const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// 3. Live Collector / Volunteer Pin (Blue Moving Marker)
const collectorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [28, 45],
  iconAnchor: [14, 45],
  popupAnchor: [1, -38],
  shadowSize: [41, 41]
});

// Auto-fit bounds component
function MapBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (!markers || markers.length === 0) return;
    const valid = markers.filter(m => m && typeof m[0] === 'number' && typeof m[1] === 'number' && !isNaN(m[0]) && !isNaN(m[1]));
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView(valid[0], 14);
    } else {
      const bounds = L.latLngBounds(valid);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }
  }, [markers, map]);
  return null;
}

// Distance helper
function haversineDist(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LiveTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stompClient } = useNotifications();

  const [donation, setDonation] = useState(null);
  const [history, setHistory] = useState([]);
  const [trail, setTrail] = useState([]);
  const [currentLoc, setCurrentLoc] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState({ distanceKm: null, etaMins: null });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // OTP modal
  const [otpModal, setOtpModal] = useState(null); // { targetStatus, title, prompt, otp }
  const [otpInput, setOtpInput] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const watchId = useRef(null);
  const isCollector = user && ['NGO', 'VOLUNTEER'].includes(user.role);

  const showToast = (msg, type = 'success') => {
    setStatusMessage({ msg, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    setFetchError(null);
    try {
      const [dRes, hRes] = await Promise.all([
        donationApi.get(`/donations/${id}`),
        donationApi.get(`/donations/${id}/history`),
      ]);
      const don = dRes.data;
      setDonation(don);
      setHistory(hRes.data);

      // Load GPS breadcrumbs
      try {
        const tRes = await trackingApi.get(`/tracking/${id}`);
        if (tRes.data && tRes.data.length > 0) {
          const points = tRes.data.map(p => [p.latitude, p.longitude]);
          setTrail(points);
          setCurrentLoc(points[points.length - 1]);
        } else {
          setCurrentLoc([don.latitude, don.longitude]);
        }
      } catch (trackErr) {
        setCurrentLoc([don.latitude, don.longitude]);
      }
    } catch (e) {
      console.error(e);
      setFetchError('Failed to load donation details. Please return to dashboard.');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // WebSocket subscriptions for live GPS and status updates
  useEffect(() => {
    if (stompClient && stompClient.connected) {
      const trackSub = stompClient.subscribe(`/topic/tracking/${id}`, (msg) => {
        try {
          const ping = JSON.parse(msg.body);
          const newLoc = [ping.lat, ping.lng];
          setCurrentLoc(newLoc);
          setTrail(prev => [...prev, newLoc]);
        } catch (err) {
          console.error('Error parsing live GPS ping:', err);
        }
      });

      const donSub = stompClient.subscribe('/topic/donations', () => {
        fetchAll();
      });

      return () => {
        try {
          trackSub.unsubscribe();
          donSub.unsubscribe();
        } catch (e) {
          // ignore
        }
      };
    }
  }, [stompClient, id, fetchAll]);

  // Calculate OSRM route between Pickup and NGO Drop-off
  useEffect(() => {
    if (!donation) return;

    const pickup = [donation.latitude, donation.longitude];
    const dropoff = (donation.ngoLatitude && donation.ngoLongitude)
      ? [donation.ngoLatitude, donation.ngoLongitude]
      : [donation.latitude + 0.035, donation.longitude + 0.035]; // fallback destination nearby if NGO unset

    const fetchRoute = async () => {
      // Determine origin and destination:
      // If food already picked up, route from current collector location to NGO
      // Otherwise route from pickup to NGO
      const isPickedUp = ['PICKED_UP', 'REACHED_NGO', 'DISTRIBUTED'].includes(donation.status);
      const start = (isPickedUp && currentLoc) ? currentLoc : pickup;
      const end = dropoff;

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoords(coords);
          setRouteInfo({
            distanceKm: (route.distance / 1000).toFixed(1),
            etaMins: Math.round(route.duration / 60)
          });
          return;
        }
      } catch (err) {
        console.warn('OSRM routing API call failed, using straight-line fallback:', err);
      }

      // Straight line fallback
      const dist = haversineDist(start[0], start[1], end[0], end[1]);
      setRouteCoords([start, end]);
      setRouteInfo({
        distanceKm: dist.toFixed(1),
        etaMins: Math.max(1, Math.round(dist * 2.5))
      });
    };

    fetchRoute();
  }, [donation, currentLoc]);

  // Clean up GPS watch on unmount
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const stopLiveTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsBroadcasting(false);
  };

  const toggleBroadcast = () => {
    if (isBroadcasting) {
      stopLiveTracking();
      showToast('Live GPS broadcasting paused.');
    } else {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
      }

      setIsBroadcasting(true);
      showToast('Live GPS tracking started! Sending coordinates to map.');

      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const payload = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speedKmh: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
            heading: pos.coords.heading || 0
          };

          setCurrentLoc([payload.latitude, payload.longitude]);
          setTrail(prev => [...prev, [payload.latitude, payload.longitude]]);

          if (stompClient && stompClient.connected) {
            stompClient.send(`/app/tracking/${id}`, {}, JSON.stringify(payload));
          } else {
            trackingApi.post(`/tracking/${id}/location`, payload).catch(console.error);
          }
        },
        (err) => {
          console.warn('Geolocation watch error:', err);
          let msg = "Could not access GPS. Please check location permissions.";
          if (err.code === 1) msg = "Location permission denied. Please enable GPS in browser settings.";
          else if (err.code === 2) msg = "Position unavailable. Please ensure GPS/WiFi is enabled.";
          alert(msg);
          setIsBroadcasting(false);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
      );
    }
  };

  const requestStatusUpdate = (targetStatus) => {
    if (targetStatus === 'PICKED_UP') {
      setOtpInput('');
      setOtpModal({
        targetStatus: 'PICKED_UP',
        title: 'Verify Food Pickup',
        prompt: 'Ask the Donor for the 4-digit Pickup OTP to verify food collection.',
        buttonLabel: 'Confirm Picked Up'
      });
    } else if (targetStatus === 'REACHED_NGO') {
      setOtpInput('');
      setOtpModal({
        targetStatus: 'REACHED_NGO',
        title: 'Verify NGO Handover',
        prompt: 'Ask the NGO staff for the 4-digit Delivery OTP to confirm food handover.',
        buttonLabel: 'Confirm Food Delivered'
      });
    } else {
      submitStatusUpdate(targetStatus);
    }
  };

  const submitStatusUpdate = async (targetStatus, otp = null) => {
    setUpdatingStatus(true);
    try {
      const payload = { status: targetStatus };
      if (otp) payload.otp = otp;
      if (currentLoc) {
        payload.latitude = currentLoc[0];
        payload.longitude = currentLoc[1];
      }

      await donationApi.put(`/donations/${id}/status`, payload);
      showToast(`Status updated to ${targetStatus.replace(/_/g, ' ')}!`);
      setOtpModal(null);
      setOtpInput('');

      // If reached NGO or distributed, stop broadcasting
      if (targetStatus === 'REACHED_NGO' || targetStatus === 'DISTRIBUTED') {
        stopLiveTracking();
      }

      fetchAll();
    } catch (e) {
      alert(e.response?.data?.message || 'Status update failed. Please check OTP.');
    }
    setUpdatingStatus(false);
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-primary-500 w-12 h-12" />
        <p className="text-gray-500 font-medium">Loading live map & routing data...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <p className="text-red-600 font-medium mb-4">{fetchError}</p>
        <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200">
          Go Back
        </button>
      </div>
    );
  }

  if (!donation) return null;

  const pickupCoord = [donation.latitude, donation.longitude];
  const dropoffCoord = (donation.ngoLatitude && donation.ngoLongitude)
    ? [donation.ngoLatitude, donation.ngoLongitude]
    : [donation.latitude + 0.035, donation.longitude + 0.035];

  const allMapMarkers = [
    pickupCoord,
    dropoffCoord,
    currentLoc
  ].filter(Boolean);

  return (
    <div className="bg-white rounded-3xl shadow-sm border overflow-hidden max-w-6xl mx-auto space-y-0">
      {/* Toast */}
      {statusMessage && (
        <div className={`p-3 text-center text-sm font-semibold ${
          statusMessage.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
        }`}>
          {statusMessage.msg}
        </div>
      )}

      {/* Top Header */}
      <div className="p-6 border-b flex flex-wrap justify-between items-center gap-4 bg-gray-50/80">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border rounded-full hover:bg-gray-100 transition-colors shadow-xs"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{donation.foodName}</h1>
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium">
                {donation.quantity} servings
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Donor: <span className="font-semibold text-gray-700">{donation.donorName || 'Donor'}</span>
              {donation.ngoName && (
                <> • Distributing NGO: <span className="font-semibold text-gray-700">{donation.ngoName}</span></>
              )}
              {donation.assignedVolunteerName && (
                <> • Volunteer: <span className="font-semibold text-gray-700">{donation.assignedVolunteerName}</span></>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* OTP Prompts for Donor or NGO */}
          {user?.role === 'DONOR' && donation.pickupOtp && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs px-3 py-1.5 rounded-xl flex items-center gap-2">
              <KeyRound size={15} className="text-amber-600" />
              <span>Your Pickup OTP:</span>
              <span className="font-mono font-bold text-sm tracking-widest bg-white px-2 py-0.5 rounded border border-amber-300 shadow-xs">
                {donation.pickupOtp}
              </span>
            </div>
          )}

          {user?.role === 'NGO' && donation.deliveryOtp && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs px-3 py-1.5 rounded-xl flex items-center gap-2">
              <KeyRound size={15} className="text-emerald-600" />
              <span>Your Delivery OTP:</span>
              <span className="font-mono font-bold text-sm tracking-widest bg-white px-2 py-0.5 rounded border border-emerald-300 shadow-xs">
                {donation.deliveryOtp}
              </span>
            </div>
          )}

          <span className="px-3.5 py-1.5 bg-primary-100 text-primary-800 text-xs font-black rounded-xl uppercase tracking-wider border border-primary-200">
            {donation.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x">
        {/* Map Panel */}
        <div className="lg:col-span-2 h-[560px] relative">
          {/* Live ETA & Distance Overlay Banner */}
          {routeInfo.distanceKm && (
            <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-lg border border-gray-200/80 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-gray-700">
                <Route size={16} className="text-primary-600" />
                <span>Transit Distance: <strong>{routeInfo.distanceKm} km</strong></span>
              </div>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex items-center gap-1.5 text-gray-700">
                <Clock size={16} className="text-blue-600" />
                <span>Estimated ETA: <strong>~{routeInfo.etaMins} mins</strong></span>
              </div>
            </div>
          )}

          <MapContainer
            center={pickupCoord}
            zoom={13}
            className="h-full w-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Marker 1: Pickup Location (Donor, Green) */}
            <Marker position={pickupCoord} icon={pickupIcon}>
              <Popup>
                <div className="p-1">
                  <strong className="text-emerald-700 block mb-0.5">📍 Pickup Location</strong>
                  <p className="text-xs text-gray-600">{donation.foodName}</p>
                  <p className="text-xs text-gray-500">{donation.pickupAddress}</p>
                </div>
              </Popup>
            </Marker>

            {/* Marker 2: Drop-off Location (NGO, Red) */}
            <Marker position={dropoffCoord} icon={dropoffIcon}>
              <Popup>
                <div className="p-1">
                  <strong className="text-rose-700 block mb-0.5">🏢 Drop-off Destination (NGO)</strong>
                  <p className="text-xs text-gray-800 font-semibold">{donation.ngoName || 'NGO Community Shelter'}</p>
                  <p className="text-xs text-gray-500">{donation.ngoAddress || 'Local distribution center'}</p>
                </div>
              </Popup>
            </Marker>

            {/* Marker 3: Live Collector / Volunteer (Moving, Blue) */}
            {currentLoc && (
              <Marker position={currentLoc} icon={collectorIcon}>
                <Popup>
                  <div className="p-1 text-center">
                    <strong className="text-blue-700 block mb-0.5">🚴 Active Collector Location</strong>
                    <span className="text-xs text-gray-600">
                      {donation.assignedVolunteerName || 'Transit Collector'}
                    </span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* OSRM Route Polyline (Bold Blue) */}
            {routeCoords.length > 1 && (
              <Polyline
                positions={routeCoords}
                color="#2563eb"
                weight={5}
                opacity={0.8}
                dashArray={donation.status === 'VOLUNTEER_ASSIGNED' ? '8, 8' : null}
              />
            )}

            {/* GPS Trail Breadcrumbs (Cyan) */}
            {trail.length > 1 && (
              <Polyline positions={trail} color="#06b6d4" weight={3} opacity={0.6} />
            )}

            <MapBounds markers={allMapMarkers} />
          </MapContainer>

          {/* Collector Controls Overlay */}
          {isCollector && (
            <div className="absolute bottom-4 right-4 z-[400] bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-200 max-w-xs w-full animate-in fade-in">
              <h3 className="font-bold text-sm text-gray-800 mb-2 flex items-center gap-1.5">
                <Navigation size={16} className="text-primary-600" />
                Live GPS Broadcast
              </h3>

              <button 
                onClick={toggleBroadcast}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 transition-all shadow-sm ${
                  isBroadcasting ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                <Navigation size={15} className={isBroadcasting ? 'animate-spin' : ''} />
                {isBroadcasting ? 'Stop Live GPS Broadcast' : 'Start Live Tracking'}
              </button>

              <div className="mt-3 pt-3 border-t space-y-1.5">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Update Transit Status</p>

                {donation.status === 'VOLUNTEER_ASSIGNED' && (
                  <button
                    onClick={() => requestStatusUpdate('PICKUP_IN_PROGRESS')}
                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Start Pickup / On The Way
                  </button>
                )}

                {donation.status === 'PICKUP_IN_PROGRESS' && (
                  <button
                    onClick={() => requestStatusUpdate('PICKED_UP')}
                    className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1"
                  >
                    <KeyRound size={13} />
                    Confirm Picked Up (Enter OTP)
                  </button>
                )}

                {donation.status === 'PICKED_UP' && (
                  <button
                    onClick={() => requestStatusUpdate('REACHED_NGO')}
                    className="w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1"
                  >
                    <KeyRound size={13} />
                    Confirm Reached NGO (Enter OTP)
                  </button>
                )}

                {donation.status === 'REACHED_NGO' && (
                  <div className="text-xs text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg text-center flex items-center justify-center gap-1">
                    <CheckCircle2 size={14} /> Arrived at NGO
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status History Timeline Panel */}
        <div className="p-6 h-[560px] overflow-y-auto bg-white flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-primary-600" />
              Status Timeline
            </h2>
            <span className="text-xs font-semibold text-gray-500">
              {history.length} event{history.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-6 flex-1 pr-1">
            {history.map((h, i) => (
              <div key={h.id || i} className="flex gap-4 relative">
                {i !== history.length - 1 && (
                  <div className="absolute top-6 left-3 w-0.5 h-full -bottom-6 bg-primary-200" />
                )}
                <div className="relative z-10 w-6 h-6 rounded-full bg-primary-100 border-2 border-primary-600 flex flex-shrink-0 items-center justify-center shadow-xs">
                  <CheckCircle2 size={13} className="text-primary-700" />
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wide">
                      {h.status.replace(/_/g, ' ')}
                    </h4>
                    <span className="text-[10px] text-gray-400">
                      {h.changedAt ? new Date(h.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  {h.note && (
                    <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded-lg border border-gray-100 leading-relaxed">
                      {h.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Marker Legend */}
          <div className="pt-4 mt-4 border-t text-xs text-gray-500 space-y-1">
            <p className="font-bold text-gray-700 mb-1">Map Legend:</p>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              <span>Green Pin: Pickup Location (Donor)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              <span>Red Pin: Drop-off Location (NGO)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span>Blue Pin: Live Moving Collector Location</span>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {otpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitStatusUpdate(otpModal.targetStatus, otpInput.trim());
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Enter 4-Digit OTP Code
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
                  disabled={updatingStatus || !otpInput.trim()}
                  className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50 shadow-sm"
                >
                  {updatingStatus ? 'Verifying...' : otpModal.buttonLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

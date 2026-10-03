import { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { donationApi } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { MapPin, Clock, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PopupManager() {
  const { popup, closePopup, markAsRead } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!popup) return null;

  const handleAccept = async () => {
    try {
      await donationApi.put(`/donations/${popup.donationId}/accept?ngoId=${user.profileId}`);
      alert("Successfully accepted!");
      markAsRead(popup.id);
      closePopup();
      navigate('/ngo'); // Go to dashboard to assign volunteer
    } catch (e) {
      alert(e.response?.data?.message || "Failed to accept or already taken");
      closePopup();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-primary-600 p-4 text-white">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Info className="w-6 h-6" />
            {popup.title}
          </h3>
        </div>
        <div className="p-6">
          <p className="text-gray-700 mb-6">{popup.message}</p>
          
          {popup.type === 'DONATION_NEARBY' && (
            <div className="flex gap-3">
              <button 
                onClick={closePopup}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
              <button 
                onClick={handleAccept}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md font-bold hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg"
              >
                Accept Donation
              </button>
            </div>
          )}
          
          {popup.type !== 'DONATION_NEARBY' && (
            <button 
              onClick={() => { markAsRead(popup.id); closePopup(); }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-md font-medium hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

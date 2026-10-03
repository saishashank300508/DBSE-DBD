import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Bell, LogOut, CheckCheck, ExternalLink } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (n) => {
    const isUnread = n.isRead === false || (n.isRead === undefined && !n.read);
    if (isUnread) markAsRead(n.id);
    setShowDropdown(false);
    if (n.donationId) {
      navigate(`/tracking/${n.donationId}`);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-black text-primary-600 tracking-tight flex items-center gap-2">
          <span>🌱</span> FOOD CONNECT
        </Link>
        
        <div className="flex items-center space-x-6">
          {user ? (
            <>
              <Link
                to={`/${user.role.toLowerCase()}`}
                className="text-gray-600 hover:text-primary-600 font-semibold text-sm transition-colors"
              >
                Dashboard
              </Link>
              
              {/* Notification Bell + Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="relative p-1 text-gray-600 hover:text-primary-600 transition-colors focus:outline-none"
                  aria-label="Notifications"
                >
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 text-sm">Notifications</h4>
                        {unreadCount > 0 && (
                          <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-xs text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1 hover:underline"
                        >
                          <CheckCheck size={14} />
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.slice(0, 15).map((n) => {
                          const isUnread = n.isRead === false || (n.isRead === undefined && !n.read);
                          return (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`p-3.5 hover:bg-gray-50 cursor-pointer transition-colors text-left flex gap-3 items-start ${
                                isUnread ? 'bg-primary-50/40' : ''
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isUnread ? 'bg-primary-600' : 'bg-transparent'}`} />
                              <div className="flex-1">
                                <p className={`text-xs ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                  {n.title}
                                </p>
                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                                <span className="text-[10px] text-gray-400 mt-1 block">
                                  {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              {n.donationId && (
                                <ExternalLink size={14} className="text-gray-400 flex-shrink-0 mt-1" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* User Profile Info & Logout */}
              <div className="flex items-center space-x-3 border-l pl-5">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs uppercase">
                  {user.fullName ? user.fullName[0] : 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-gray-800 leading-tight">{user.fullName}</p>
                  <p className="text-[10px] text-primary-600 font-semibold uppercase">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-gray-50 transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex space-x-3 items-center">
              <Link to="/login" className="text-gray-600 hover:text-primary-600 font-semibold text-sm px-3 py-2">
                Log in
              </Link>
              <Link
                to="/register"
                className="bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700 font-semibold text-sm shadow-sm transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

import { createContext, useState, useEffect, useContext } from 'react';
import { authApi } from '../api/axios';

const AuthContext = createContext();

// Timeout wrapper: rejects after ms milliseconds
const withTimeout = (promise, ms) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), ms)
  );
  return Promise.race([promise, timeout]);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // 5-second timeout: if backend is down, don't hang forever
          const { data } = await withTimeout(authApi.get('/auth/me'), 5000);
          setUser(data);
        } catch (error) {
          console.warn('Auth check failed (backend may be unavailable):', error.message);
          // Only remove token on 401/403, not on network errors
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('token');
          }
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (credentials) => {
    const { data } = await authApi.post('/auth/login', credentials);
    localStorage.setItem('token', data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const register = async (userData) => {
    const { data } = await authApi.post('/auth/register', userData);
    localStorage.setItem('token', data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0fdf4',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          width: 48, height: 48,
          border: '4px solid #dcfce7',
          borderTop: '4px solid #16a34a',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: 16
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#16a34a', fontWeight: 600, fontSize: 18 }}>Food Connect</p>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Loading...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

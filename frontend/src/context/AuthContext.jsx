import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const { token: newToken, user: userData, requires_2fa, otp_code } = res.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      if (requires_2fa) {
        setRequires2FA(true);
        return { requires2FA: true, otpCode: otp_code };
      }
      return { success: true };
    } catch (err) {
      if (!err.response && (err.code === 'ERR_NETWORK' || err.message === 'Network Error')) {
        if (import.meta.env.PROD) {
          throw 'Cannot reach API. In Vercel set LARAVEL_API_URL (Laravel base URL ending in /api), redeploy, or run Laravel locally for dev.';
        }
        throw 'Cannot reach API. Start Laravel: cd backend && php artisan serve --port=8000';
      }
      throw err.response?.data?.message || err.message || 'Login failed';
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async (code) => {
    setLoading(true);
    try {
      const res = await authAPI.verify2FA({ code });
      const userData = res.data.user;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setRequires2FA(false);
      return { success: true };
    } catch (err) {
      throw err.response?.data?.message || 'Verification failed';
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setRequires2FA(false);
  };

  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const isAuthenticated = !!token && !!user;

  // Auto-logout on inactivity (15 min)
  useEffect(() => {
    if (!isAuthenticated) return;
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => { logout(); }, 15 * 60 * 1000);
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timeout);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider value={{
      user, token, loading, requires2FA, isAdmin, isSupervisor, isAuthenticated,
      login, verify2FA, logout, setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

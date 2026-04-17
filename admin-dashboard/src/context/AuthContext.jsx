import { createContext, useContext, useState, useEffect } from 'react';
import { login, getMe } from '../api/index.js';

const AuthContext = createContext(null);

// Admin credentials from .env seed
const ADMIN_EMAIL    = 'admin@salescrm.com';
const ADMIN_PASSWORD = 'Admin@123';

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('crm_token');

    const tryAutoLogin = async () => {
      try {
        const res = await login({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
        localStorage.setItem('crm_token', res.data.token);
        setReady(true);
      } catch (err) {
        setError(`Cannot connect to backend: ${err.message || 'Server error'}`);
        setReady(true); // still render, pages will show API errors
      }
    };

    if (stored) {
      // Verify the stored token is still valid
      getMe()
        .then(() => setReady(true))
        .catch(() => {
          localStorage.removeItem('crm_token');
          tryAutoLogin();
        });
    } else {
      tryAutoLogin();
    }
  }, []);

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12, fontFamily: 'Inter, sans-serif', color: '#6b7280' }}>
        <div style={{ width: 28, height: 28, border: '2.5px solid #e5e7eb', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: '0.85rem' }}>Connecting…</span>
        {error && <span style={{ fontSize: '0.78rem', color: '#ef4444' }}>{error}</span>}
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ error }}>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 16px', fontSize: '0.8rem', textAlign: 'center' }}>
          ⚠️ {error}
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

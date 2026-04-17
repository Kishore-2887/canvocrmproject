import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Auth removed — skip login, go straight to app
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12, fontFamily: 'Inter, sans-serif', color: '#6b7280' }}>
        <div style={{ width: 28, height: 28, border: '2.5px solid #e5e7eb', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: '0.85rem' }}>Loading…</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

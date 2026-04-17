import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: try to restore session from stored token
  useEffect(() => {
    const token = localStorage.getItem('emp_token');
    if (!token) { setLoading(false); return; }

    getMe()
      .then(res => setUser(res.data.data))
      .catch(() => {
        localStorage.removeItem('emp_token');
        localStorage.removeItem('emp_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const loginUser = (token, userData) => {
    localStorage.setItem('emp_token', token);
    localStorage.setItem('emp_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('emp_token');
    localStorage.removeItem('emp_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

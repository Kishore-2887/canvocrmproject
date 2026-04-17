import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './Login.module.css';

export default function Login() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.email.trim()) return; // Only require the first box (name)
    setLoading(true);
    try {
      const res = await login({ 
        username: form.email.trim(), 
        password: form.password.trim() || form.email.trim() // Use first name as default password if blank
      });
      const { token, user } = res.data;
      if (user.role !== 'employee') {
        setError('Only employees can login here');
        return;
      }
      loginUser(token, user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoW}>Canova</span>
          <span className={styles.logoC}>CRM</span>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {error && <div className={styles.error}>{error}</div>}
        <input
          name="email"
          type="text"
          className={styles.input}
          placeholder="first name"
          value={form.email}
          onChange={handleChange}
          autoCapitalize="none"
        />
        <input
          name="password"
          type="password"
          className={styles.input}
          placeholder="first name (password)"
          value={form.password}
          onChange={handleChange}
        />
        <button type="submit" className={styles.btn} disabled={loading}>
          {loading ? '...' : 'Submit'}
        </button>
      </form>
      
    </div>
  );
}

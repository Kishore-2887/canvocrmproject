import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { updateMe } from '../api/index.js';
import styles from './Profile.module.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      const names = (user.name || '').split(' ');
      setForm({ 
        firstName: names[0] || '', 
        lastName: names.slice(1).join(' ') || '', 
        email: user.email || '',
        password: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async e => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSaving(true); setSuccess(''); setError('');
    try {
      const payload = { 
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        password: form.password || undefined
      };
      await updateMe(payload);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.page}>

      {/* Blue Header */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoW}>Canova</span>
          <span className={styles.logoC}>CRM</span>
        </div>
        <h1 className={styles.pageTitle} onClick={() => navigate(-1)}>
          <span style={{ fontSize: '1.2rem', marginRight: 8 }}>‹</span> Profile
        </h1>
      </div>

      <div className={styles.body}>

        <form onSubmit={handleSave} className={styles.form}>
          {success && <div className={styles.successMsg}>{success}</div>}
          {error && <div className={styles.errorMsg}>{error}</div>}

          <div className={styles.group}>
            <label className={styles.label}>First name</label>
            <input name="firstName" className={styles.input} value={form.firstName} onChange={handleChange} placeholder="e.g. Rajesh" />
          </div>

          <div className={styles.group}>
            <label className={styles.label}>Last name</label>
            <input name="lastName" className={styles.input} value={form.lastName} onChange={handleChange} placeholder="e.g. Mehta" />
          </div>

          <div className={styles.group}>
            <label className={styles.label}>Email</label>
            <input name="email" className={styles.input} value={form.email} onChange={handleChange} placeholder="example@gmail.com" />
          </div>

          <div className={styles.group}>
            <label className={styles.label}>Password</label>
            <input name="password" type="password" className={styles.input} value={form.password} onChange={handleChange} placeholder="**********" />
          </div>

          <div className={styles.group}>
            <label className={styles.label}>Confirm Password</label>
            <input name="confirmPassword" type="password" className={styles.input} value={form.confirmPassword} onChange={handleChange} placeholder="**********" />
          </div>

          <div className={styles.actionRow}>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? '…' : 'Save'}
            </button>
            <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

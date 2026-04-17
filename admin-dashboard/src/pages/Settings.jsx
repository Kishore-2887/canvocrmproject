import { useState, useEffect } from 'react';
import { getMe, updateMe } from '../api/index.js';
import styles from './Settings.module.css';

export default function Settings() {
  const [form, setForm]     = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getMe()
      .then(res => {
        const u = res.data.data;
        const parts = (u.name || '').split(' ');
        setForm(f => ({
          ...f,
          firstName: parts[0] || '',
          lastName:  parts.slice(1).join(' ') || '',
          email:     u.email || '',
        }));
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.password && form.password !== form.confirm) {
      setError('Passwords do not match'); return;
    }
    setSaving(true);
    try {
      const payload = { name: `${form.firstName} ${form.lastName}`.trim() };
      if (form.password) payload.password = form.password;
      await updateMe(payload);
      setSuccess('Profile saved successfully!');
      setForm(f => ({ ...f, password: '', confirm: '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className={`${styles.page} fade-in`}>
      <div className={styles.breadcrumb}>
        <span className={styles.breadHome}>Home</span>
        <span className={styles.breadSep}> › </span>
        <span className={styles.breadCurrent}>Settings</span>
      </div>

      <div className={styles.card}>
        <div className={styles.tabHeader}>
          <div className={`${styles.tabItem} ${styles.activeTab}`}>Edit Profile</div>
        </div>

        {error   && <div className="alert alert-error"   style={{ margin: '20px 30px 0' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ margin: '20px 30px 0' }}>{success}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>First name</label>
            <input name="firstName" className={styles.formInput} value={form.firstName} onChange={handleChange} placeholder="Sarthak" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Last name</label>
            <input name="lastName" className={styles.formInput} value={form.lastName} onChange={handleChange} placeholder="Pal" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Email</label>
            <input name="email" className={styles.formInput} value={form.email} disabled style={{ opacity: 0.8 }} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Password</label>
            <input name="password" type="password" className={styles.formInput} value={form.password} onChange={handleChange} placeholder="************" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Confirm Password</label>
            <input name="confirm" type="password" className={styles.formInput} value={form.confirm} onChange={handleChange} placeholder="************" />
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

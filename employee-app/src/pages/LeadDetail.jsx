import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLead, updateLead } from '../api/index.js';
import styles from './LeadDetail.module.css';

const TYPE_COLORS = { Hot: 'badge-hot', Warm: 'badge-warm', Cold: 'badge-cold' };
const STATUS_COLORS = { Ongoing: 'badge-ongoing', Closed: 'badge-closed', Lost: 'badge-lost' };

const InfoRow = ({ label, value }) => (
  <div className={styles.infoRow}>
    <span className={styles.infoLabel}>{label}</span>
    <span className={styles.infoValue}>{value || '—'}</span>
  </div>
);

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: '', status: '', scheduledDate: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getLead(id)
      .then((res) => {
        const l = res.data.data;
        setLead(l);
        setForm({
          type: l.type,
          status: l.status,
          scheduledDate: l.scheduledDate ? l.scheduledDate.split('T')[0] : '',
        });
      })
      .catch(() => setError('Failed to load lead.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError(''); setSuccess('');
    try {
      const res = await updateLead(id, form);
      setLead(res.data.data);
      setSuccess('Lead updated successfully!');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.');
    } finally { setSaving(false); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!lead && error) return <div className="page-content"><div className="alert alert-error">{error}</div></div>;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className={styles.headerContent}>
          <div className={styles.leadAvatar}>{lead.name.charAt(0)}</div>
          <h1 className={styles.leadName}>{lead.name}</h1>
          <p className={styles.leadEmail}>{lead.email || lead.location || 'No contact info'}</p>
          <div className={styles.badges}>
            <span className={`badge ${TYPE_COLORS[lead.type]}`}>{lead.type}</span>
            <span className={`badge ${STATUS_COLORS[lead.status]}`}>{lead.status}</span>
          </div>
        </div>
      </div>

      <div className="page-content">
        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Info card */}
        <div className={styles.infoCard}>
          <h2 className={styles.cardTitle}>Lead Information</h2>
          <InfoRow label="Source" value={lead.source} />
          <InfoRow label="Language" value={lead.language} />
          <InfoRow label="Location" value={lead.location} />
          <InfoRow label="Date Added" value={fmt(lead.date)} />
          <InfoRow label="Scheduled" value={fmt(lead.scheduledDate)} />
        </div>

        {/* Edit card */}
        <div className={styles.editCard}>
          <h2 className={styles.cardTitle}>Update Lead</h2>
          <div className={styles.editForm}>
            <div className="form-group">
              <label className="form-label">Lead Type</label>
              <div className={styles.typeButtons}>
                {['Hot', 'Warm', 'Cold'].map((t) => (
                  <button
                    key={t}
                    className={`${styles.typeBtn} ${form.type === t ? styles.typeBtnActive : ''} ${styles[`type${t}`]}`}
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                  >
                    {t === 'Hot' ? '🔥' : t === 'Warm' ? '🌤️' : '❄️'} {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input form-select" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option>Ongoing</option>
                <option>Closed</option>
                <option>Lost</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Scheduled Date</label>
              <input type="date" className="form-input" value={form.scheduledDate} onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
            </div>
            <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
              {saving ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />Saving…</> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

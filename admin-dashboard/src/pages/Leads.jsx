import { useEffect, useState, useCallback, useRef } from 'react';
import { getLeads, uploadLeadsCSV, createLead } from '../api/index.js';
import styles from './Leads.module.css';
import Modal from '../components/Modal.jsx';


function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  const nums = Array.from({ length: Math.min(pages, 3) }, (_, i) => i + 1);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#fff' }}>
      <button className={styles.btnPageBoundary} disabled={page === 1} onClick={() => onPage(page - 1)}>← Previous</button>
      <div style={{ display: 'flex', gap: 6 }}>
        {nums.map(p => (
          <button key={p} className={`${styles.btnPageNum} ${p === page ? styles.btnPageNumActive : ''}`} onClick={() => onPage(p)}>{p}</button>
        ))}
        {pages > 5 && <span className={styles.pageSep}>…</span>}
        {pages > 4 && <button className={styles.btnPageNum} onClick={() => onPage(pages - 1)}>{pages - 1}</button>}
        {pages > 3 && <button className={styles.btnPageNum} onClick={() => onPage(pages)}>{pages}</button>}
      </div>
      <button className={styles.btnPageBoundary} disabled={page === pages} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  );
}

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi'];
const SOURCES = ['Referral', 'Website', 'Social Media', 'Cold Call', 'Email Campaign', 'Walk-in', 'Other'];

function AddManuallyModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', email: '', source: 'Referral',
    date: new Date().toISOString().slice(0, 10),
    location: '', language: 'English',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      await createLead(form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-box" style={{ width: 480, padding: '24px 32px' }}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Add New Lead</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {error && <div style={{ fontSize: '0.78rem', color: '#ef4444', marginBottom: 10 }}>{error}</div>}

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className={styles.formLabel}>Name</label>
            <input
              name="name" className={styles.formInput}
              value={form.name} onChange={handleChange}
              placeholder="Sarthak Pal" required
            />
          </div>

          <div className="form-group">
            <label className={styles.formLabel}>Email</label>
            <input
              name="email" type="email" className={styles.formInput}
              value={form.email} onChange={handleChange}
              placeholder="Sarthakpal08@gmail.com"
            />
          </div>

          <div className="form-group">
            <label className={styles.formLabel}>Source</label>
            <select name="source" className={styles.formInput} value={form.source} onChange={handleChange}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className={styles.formLabel}>Date</label>
            <input
              name="date" type="text" className={styles.formInput}
              value={form.date ? new Date(form.date).toLocaleDateString('en-GB') : ''} onChange={handleChange}
              placeholder="12/10/25"
            />
          </div>

          <div className="form-group">
            <label className={styles.formLabel}>Location</label>
            <input
              name="location" className={styles.formInput}
              value={form.location} onChange={handleChange}
              placeholder="Mumbai"
            />
          </div>

          <div className="form-group">
            <label className={styles.formLabel}>Preferred Language</label>
            <select name="language" className={styles.formInput} value={form.language} onChange={handleChange}>
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>

          <div className={styles.modalFooter}>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}


function CSVUploadModal({ onClose, onUploaded }) {
  const [step, setStep] = useState('idle'); // idle | uploading | done | error
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [errMsg, setErrMsg] = useState('');
  const fileRef = useRef();

  const handleDrop = e => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStep('uploading');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await uploadLeadsCSV(fd);
      setResult(res.data);
      setStep('done');
      // Adding a small delay just to visually match the process
      setTimeout(() => {
        onUploaded();
      }, 1000);
    } catch (err) {
      setErrMsg(err.response?.data?.message || 'Upload failed');
      setStep('error');
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-box" style={{ width: 440, padding: '24px 32px' }}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>CSV Upload</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#616161', marginBottom: 20 }}>Add your documents here</p>

        {step === 'idle' && (
          <div className={styles.dropZone} onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5">
              <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
              <polyline points="14 2 14 8 20 8" />
              <circle cx="9" cy="15" r="4" fill="#000" />
              <path d="M9 13l0 4M7 15l4 0" stroke="#fff" />
            </svg>
            <p style={{ fontSize: '0.85rem', color: '#616161', marginTop: 12, fontWeight: 500 }}>
              Drag your file(s) to start uploading
            </p>
            <div className={styles.orDivider}>
              <span className={styles.orText}>OR</span>
            </div>
            <button type="button" className={styles.btnBrowse} onClick={() => fileRef.current.click()}>
              Browse files
            </button>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />

            <div className={styles.fileRow}>
              <span className={styles.fileName}>{file ? file.name : 'Sample File.csv'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
          </div>
        )}

        {step === 'uploading' && (
          <div className={styles.dropZone} style={{ cursor: 'default' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2">
              <circle cx="12" cy="12" r="10" stroke="#e0e0e0" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#111" strokeLinecap="round" />
            </svg>
            <p style={{ fontSize: '0.9rem', color: '#111', marginTop: 16, fontWeight: 500 }}>
              Verifying...
            </p>
            <button className={styles.btnCancelWait} onClick={onClose}>Cancel</button>
          </div>
        )}

        {step === 'done' && (
          <div className={styles.dropZone} style={{ cursor: 'default' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
              <circle cx="12" cy="12" r="10" stroke="#e0e0e0" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#111" strokeLinecap="round" />
            </svg>
            <p style={{ fontSize: '0.9rem', color: '#111', marginTop: 16, fontWeight: 500 }}>
              Verifying...
            </p>
            <button className={styles.btnCancelWait} onClick={onClose}>Cancel</button>
          </div>
        )}

        {step === 'error' && (
          <div className={styles.dropZone} style={{ cursor: 'default', borderColor: '#fecaca' }}>
            <p style={{ fontSize: '0.9rem', color: '#ef4444' }}>{errMsg}</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button className={styles.btnModalCancel} onClick={onClose}>Cancel</button>
          <button
            className={styles.btnModalNext}
            onClick={handleUpload}
            disabled={!file && step === 'idle'}
          >
            {step === 'idle' ? 'Next >' : 'Upload'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const fmt = d => d ? new Date(d).toLocaleDateString('en-GB') : '—';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);

  const fetchLeads = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await getLeads({ page: p, limit: 10 });
      setLeads(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(page); }, [page]);

  return (
    <div className={`${styles.page} fade-in`}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadHome}>Home</span>
          <span className={styles.breadSep}> › </span>
          <span className={styles.breadCurrent}>Leads</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button className={styles.btnPill} onClick={() => setShowAdd(true)}>Add Manually</button>
          <button className={styles.btnPill} onClick={() => setShowCSV(true)}>Add CSV</button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>No.</th>
              <th>Name</th>
              <th>Email</th>
              <th>Source</th>
              <th>Date</th>
              <th>Location</th>
              <th>Language</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th>Type</th>
              <th>Scheduled Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11}><div className="page-loading"><div className="spinner" /></div></td></tr>
            ) : error ? (
              <tr><td colSpan={11} style={{ padding: 24, color: '#ef4444', textAlign: 'center' }}>{error}</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={11}>
                <div className="empty-state">No leads yet — upload a CSV to get started</div>
              </td></tr>
            ) : (
              leads.map((lead, i) => (
                <tr key={lead._id}>
                  <td style={{ color: '#111' }}>{(page - 1) * 10 + i + 1}</td>
                  <td style={{ fontWeight: 600, color: '#111' }}>{lead.name}</td>
                  <td style={{ color: '#111' }}>{lead.email || '—'}</td>
                  <td>{lead.source || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmt(lead.date)}</td>
                  <td>{lead.location || '—'}</td>
                  <td>{lead.language || '—'}</td>
                  <td style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lead.assignedTo ? lead.assignedTo._id : ''}>
                    {lead.assignedTo ? lead.assignedTo._id : '—'}
                  </td>
                  <td>
                    {lead.status || 'Ongoing'}
                  </td>
                  <td>
                    {lead.type || 'Warm'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmt(lead.scheduledDate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {leads.length > 0 && <Pagination page={page} pages={pagination.pages} onPage={p => setPage(p)} />}
      </div>

      {showAdd && <AddManuallyModal onClose={() => setShowAdd(false)} onSaved={() => fetchLeads(1)} />}
      {showCSV && <CSVUploadModal onClose={() => setShowCSV(false)} onUploaded={() => { setPage(1); fetchLeads(1); setShowCSV(false); }} />}
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getMyLeads } from '../api/index.js';
import styles from './Schedule.module.css';

const fmtCard = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(-2)}`;
};

/* ── Filter Popover Component ── */
function FilterPopover({ current, onSave, onClose, popupRef }) {
  const [sel, setSel] = useState(current);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.popover} ref={popupRef}>
      <h2 className={styles.popTitle}>Filter</h2>

      <div className={styles.selectBox} onClick={() => setIsOpen(!isOpen)}>
        <span className={styles.selectLabel}>{sel}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          {['Today', 'All'].map(o => (
            <div
              key={o}
              className={`${styles.opt} ${sel === o ? styles.optActive : ''}`}
              onClick={() => { setSel(o); setIsOpen(false); }}
            >{o}</div>
          ))}
        </div>
      )}

      <button className={styles.saveBtn} onClick={() => onSave(sel)}>Save</button>
    </div>
  );
}

export default function Schedule() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filterType, setFilterType] = useState('Today'); // Default to Today
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const filterPopupRef = useRef();

  // Close filter on click outside
  useEffect(() => {
    const h = e => { if (isFilterOpen && filterPopupRef.current && !filterPopupRef.current.contains(e.target)) setIsFilterOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isFilterOpen]);

  const fetchLeads = () => {
    getMyLeads()
      .then(r => {
        const all = r.data?.data || [];
        const sched = all.filter(l => l.scheduledDate).sort((a,b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
        setLeads(sched);
        applyFilter(sched, filterType);
      })
      .catch(() => { setLeads([]); setFiltered([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLeads(); }, []);

  const applyFilter = (data, type) => {
    if (type === 'All') {
      setFiltered(data);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFiltered(data.filter(l => l.scheduledDate && l.scheduledDate.startsWith(today)));
    }
  };

  const handleFilterSave = (newType) => {
    setFilterType(newType);
    applyFilter(leads, newType);
    setIsFilterOpen(false);
  };

  return (
    <div className={styles.page}>
      {/* Blue Header */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoW}>Canova</span>
          <span className={styles.logoC}>CRM</span>
        </div>
        <h1 className={styles.pageTitle} onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
          <span style={{ fontSize: '1.2rem', marginRight: 8 }}>‹</span> Schedule
        </h1>
      </div>

      <div className={styles.body}>
        {/* Search + Filter Toggle */}
        <div className={styles.searchRow}>
          <div className={styles.searchBar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input className={styles.searchInput} placeholder="Search" readOnly />
          </div>
          <button className={styles.filterBtn} onClick={() => setIsFilterOpen(!isFilterOpen)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
              <line x1="2" y1="14" x2="6" y2="14" /><line x1="10" y1="8" x2="14" y2="8" /><line x1="18" y1="16" x2="22" y2="16" />
            </svg>
          </button>
          {isFilterOpen && (
            <FilterPopover
              current={filterType}
              onSave={handleFilterSave}
              onClose={() => setIsFilterOpen(false)}
              popupRef={filterPopupRef}
            />
          )}
        </div>

        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>No scheduled leads found for {filterType.toLowerCase()}.</div>
        ) : (
          <div className={styles.cardList}>
            {filtered.map((lead, idx) => {
              const isHighlight = idx === 0; // Highlight the very first scheduled item
              return (
                <div
                  key={lead._id}
                  className={`${styles.schedCard} ${isHighlight ? styles.cardHot : styles.cardDefault}`}
                >
                  <div className={styles.topRow}>
                    <span className={styles.typeLabel}>{lead.type || 'Referral'}</span>
                    <div className={styles.dateWrap}>
                      <span className={styles.smallLabel}>Date</span>
                      <span className={styles.dateVal}>{fmtCard(lead.scheduledDate)}</span>
                    </div>
                  </div>

                  <div className={styles.phone}>{lead.phoneNumber || lead.email || '—'}</div>

                  <div className={styles.infoRow}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>Call</span>
                  </div>

                  <div className={styles.userRow}>
                    <div className={styles.avatar}>
                      <img src={`https://ui-avatars.com/api/?name=${lead.name}&background=random`} alt="" style={{ width: '100%', height: '100%' }} />
                    </div>
                    <span className={styles.userName}>{lead.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyLeads, updateLead } from '../api/index.js';
import styles from './Leads.module.css';

/* ── constants ─────────────────────────────────────── */
const TYPE_COLORS = { Hot: '#f97316', Warm: '#eab308', Cold: '#06b6d4', Closed: '#94a3b8' };
const STATUS_RING_COLORS = { Ongoing: '#f97316', Closed: '#dcc6b1' }; // Matching the screenshot's soft peach for closed

/* ── Status Circle (Donut version) ──────────────────── */
function StatusCircle({ status, type }) {
  const isClosed = status === 'Closed';
  const color = isClosed ? '#dcc6b1' : (TYPE_COLORS[type] || '#f97316');
  const r = 26, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f1f1" strokeWidth="9" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={0} 
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: '0.85rem', fontWeight: 800, color: '#1e293b',
          textAlign: 'center', lineHeight: 1.2,
        }}>{status}</span>
      </div>
    </div>
  );
}

/* ── Popovers ────────────────────────────────────────── */
function TypePopover({ current, onSave }) {
  return (
    <div className={`${styles.popover} ${styles.typePopover}`}>
      <p className={styles.popHead} style={{ textAlign: 'center', marginBottom: 5 }}>Type</p>
      {['Hot', 'Warm', 'Cold'].map(t => (
        <button
          key={t}
          className={styles.typeItem}
          style={{ background: TYPE_COLORS[t], color: '#fff' }}
          onClick={() => onSave(t)}
        >{t}</button>
      ))}
    </div>
  );
}

function StatusPopover({ current, onSave }) {
  const [sel, setSel] = useState(current);
  return (
    <div className={`${styles.popover} ${styles.statusPopover}`}>
      <div className={styles.popHeadWrap}>
        <span className={styles.popHead}>Lead Status</span>
        <svg className={styles.infoIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
      </div>
      <select className={styles.popInput} value={sel} onChange={e => setSel(e.target.value)}>
        <option value="Ongoing">Ongoing</option>
        <option value="Closed">Closed</option>
      </select>
      <button className={styles.saveBtn} onClick={() => onSave(sel)}>Save</button>
    </div>
  );
}

function SchedulePopover({ current, onSave }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  return (
    <div className={`${styles.popover} ${styles.statusPopover}`}>
      <div className={styles.popHeadWrap}>
        <span className={styles.popHead} style={{ fontSize: '1.4rem' }}>Date</span>
      </div>
      <input
        className={styles.popInput}
        type="text"
        placeholder="dd/mm/yy"
        value={date}
        onChange={e => setDate(e.target.value)}
        style={{ fontSize: '1.2rem', padding: '14px' }}
      />

      <div className={styles.popHeadWrap} style={{ marginTop: 10 }}>
        <span className={styles.popHead} style={{ fontSize: '1.4rem' }}>Time</span>
      </div>
      <input
        className={styles.popInput}
        type="text"
        placeholder="02:30PM"
        value={time}
        onChange={e => setTime(e.target.value)}
        style={{ fontSize: '1.2rem', padding: '14px', fontWeight: 800, textTransform: 'uppercase' }}
      />

      <button className={styles.saveBtn} onClick={() => onSave(date, time)} style={{ marginTop: 10, padding: '14px', borderRadius: '35px' }}>
        Save
      </button>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────── */
export default function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null); // { leadId, kind, data }
  const popupRef = useRef();

  const fetchLeads = () => {
    getMyLeads()
      .then(r => { const d = r.data?.data || []; setLeads(d); setFiltered(d); })
      .catch(() => { setLeads([]); setFiltered([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLeads(); }, []);

  useEffect(() => {
    if (!search) { setFiltered(leads); return; }
    setFiltered(leads.filter(l =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(search.toLowerCase())
    ));
  }, [search, leads]);

  useEffect(() => {
    const h = e => { if (popup && popupRef.current && !popupRef.current.contains(e.target)) setPopup(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [popup]);

  const openPopup = (leadId, kind, data) =>
    setPopup(p => (p?.leadId === leadId && p?.kind === kind) ? null : { leadId, kind, data });

  const saveUpdate = async (leadId, payload) => {
    try {
      // If we are updating the scheduledDate, we need to parse the manual string inputs
      if (payload.scheduledDate && typeof payload.scheduledDate === 'object') {
        const { dateStr, timeStr } = payload.scheduledDate;

        // 1. Parse Date (dd/mm/yy)
        const dParts = dateStr.split('/');
        if (dParts.length !== 3) throw new Error('Invalid date format. Use dd/mm/yy');
        const day = parseInt(dParts[0]);
        const month = parseInt(dParts[1]) - 1;
        const year = 2000 + parseInt(dParts[2]);

        // 2. Parse Time (e.g. 02:30PM)
        const tMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!tMatch) throw new Error('Invalid time format. Use HH:MMPM (e.g. 02:30PM)');

        let hours = parseInt(tMatch[1]);
        const minutes = parseInt(tMatch[2]);
        const ampm = tMatch[3].toUpperCase();

        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;

        const dateObj = new Date(year, month, day, hours, minutes);
        if (isNaN(dateObj.getTime())) throw new Error('Invalid date/time values');

        payload.scheduledDate = dateObj.toISOString();
      }

      await updateLead(leadId, payload);
      setLeads(ls => ls.map(l => l._id === leadId ? { ...l, ...payload } : l));
      setPopup(null);
    } catch (e) {
      alert(e.message || 'Update failed');
      console.error(e);
    }
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }) : null;

  return (
    <div className={styles.page}>
      {/* Header with gradient */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoW}>Canova</span>
          <span className={styles.logoC}>CRM</span>
        </div>
        <h1 className={styles.pageTitle} onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
          <span style={{ fontSize: '1.2rem', marginRight: 8 }}>‹</span> Leads
        </h1>
      </div>

      <div className={styles.body}>
        {/* Search grey pill */}
        <div className={styles.searchBar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : (
          <div className={styles.cardList}>
            {filtered.map(lead => {
              const currentPop = popup?.leadId === lead._id ? popup.kind : null;
              const accentColor = TYPE_COLORS[lead.type] || '#e5e7eb';

              return (
                <div key={lead._id} className={styles.leadCard}>
                  {/* Vertical bar */}
                  <div className={styles.statusBar} style={{ background: accentColor }} />

                  <div className={styles.cardRow}>
                    <div className={styles.cardLeft}>
                      <h3 className={styles.leadName}>{lead.name}</h3>
                      <p className={styles.leadEmail}>@{lead.email || 'no-email'}</p>

                      {lead.scheduledDate && (
                        <div className={styles.dateRow}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>{fmtDate(lead.scheduledDate)}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.cardRight}>
                      <StatusCircle status={lead.status} type={lead.type} />
                    </div>
                  </div>

                  {/* Action Icons */}
                  <div className={styles.iconRow}>
                    <button className={`${styles.iconBtn} ${currentPop === 'type' ? styles.iconActive : ''}`} onClick={() => openPopup(lead._id, 'type')}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.99831 0C10.5542 0 11.0981 0.044 11.63 0.132L9.75835 2.004C8.19799 2.05083 6.68544 2.5533 5.40715 3.44948C4.12886 4.34566 3.1407 5.59636 2.56448 7.04743C1.98826 8.49849 1.84917 10.0865 2.16435 11.6156C2.47954 13.1448 3.23522 14.5483 4.33825 15.6531C5.44128 16.758 6.84344 17.5158 8.37189 17.8333C9.90033 18.1507 11.4883 18.0139 12.9399 17.4397C14.3916 16.8655 15.6435 15.879 16.5414 14.6018C17.4393 13.3246 17.9439 11.8125 17.9929 10.252L19.8666 8.38C19.9533 8.90666 19.9966 9.44666 19.9966 10C19.9966 11.9778 19.4102 13.9112 18.3116 15.5557C17.213 17.2002 15.6514 18.4819 13.8245 19.2388C11.9975 19.9957 9.98722 20.1937 8.04774 19.8078C6.10825 19.422 4.32673 18.4696 2.92844 17.0711C1.53015 15.6725 0.577906 13.8907 0.192119 11.9509C-0.193668 10.0111 0.0043321 8.00042 0.76108 6.17316C1.51783 4.3459 2.79934 2.78412 4.44355 1.6853C6.08776 0.58649 8.02083 0 9.99831 0ZM18.8788 1.124C18.5234 0.768479 18.1014 0.486461 17.637 0.294051C17.1727 0.101642 16.6749 0.00260949 16.1723 0.00260949C15.6696 0.00260949 15.1719 0.101642 14.7075 0.294051C14.2431 0.486461 13.8211 0.768479 13.4657 1.124L8.2986 6.292C8.18979 6.40111 8.10766 6.5339 8.05864 6.68L6.09097 12.52C6.02566 12.714 6.01577 12.9224 6.06243 13.1217C6.10908 13.321 6.21042 13.5034 6.35505 13.6483C6.49967 13.7931 6.68184 13.8947 6.88107 13.9417C7.08029 13.9886 7.28866 13.979 7.48273 13.914L13.3217 11.95C13.4685 11.9012 13.602 11.8191 13.7117 11.71L18.8788 6.54C19.2343 6.18453 19.5162 5.76251 19.7086 5.29804C19.901 4.83357 20 4.33575 20 3.833C20 3.33025 19.901 2.83243 19.7086 2.36796C19.5162 1.90349 19.2343 1.47947 18.8788 1.124Z" fill="currentColor" />
                      </svg>
                    </button>
                    <button className={`${styles.iconBtn} ${currentPop === 'date' ? styles.iconActive : ''}`} onClick={() => openPopup(lead._id, 'date')}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 9.6V6C11 5.71666 10.904 5.47933 10.712 5.288C10.52 5.09667 10.2827 5.00067 9.99999 5C9.71733 4.99933 9.47999 5.09533 9.288 5.288C9.09599 5.48067 9 5.718 9 6V9.975C9 10.1083 9.02499 10.2377 9.075 10.363C9.125 10.4883 9.2 10.6007 9.3 10.7L12.6 14C12.7833 14.1833 13.0167 14.275 13.3 14.275C13.5833 14.275 13.8167 14.1833 14 14C14.1833 13.8167 14.275 13.5833 14.275 13.3C14.275 13.0167 14.1833 12.7833 14 12.6L11 9.6ZM9.99999 20C8.61666 20 7.31666 19.7373 6.1 19.212C4.88333 18.6867 3.825 17.9743 2.925 17.075C2.025 16.1757 1.31267 15.1173 0.788001 13.9C0.263335 12.6827 0.000667932 11.3827 1.26582e-06 10C-0.0006654 8.61733 0.262001 7.31733 0.788001 6.1C1.314 4.88267 2.02633 3.82433 2.925 2.925C3.82367 2.02567 4.882 1.31333 6.1 0.788C7.318 0.262667 8.618 0 9.99999 0C11.382 0 12.682 0.262667 13.9 0.788C15.118 1.31333 16.1763 2.02567 17.075 2.925C17.9737 3.82433 18.6863 4.88267 19.213 6.1C19.7397 7.31733 20.002 8.61733 20 10C19.998 11.3827 19.7353 12.6827 19.212 13.9C18.6887 15.1173 17.9763 16.1757 17.075 17.075C16.1737 17.9743 15.1153 18.687 13.9 19.213C12.6847 19.739 11.3847 20.0013 9.99999 20ZM9.99999 18C12.2167 18 14.1043 17.221 15.663 15.663C17.2217 14.105 18.0007 12.2173 18 10C17.9993 7.78266 17.2203 5.895 15.663 4.337C14.1057 2.779 12.218 2 9.99999 2C7.782 2 5.89433 2.77933 4.337 4.338C2.77967 5.89666 2.00067 7.784 2 10C1.99933 12.216 2.77867 14.1037 4.338 15.663C5.89733 17.2223 7.78466 18.0013 9.99999 18Z" fill="currentColor" />
                      </svg>
                    </button>
                    <button className={`${styles.iconBtn} ${currentPop === 'status' ? styles.iconActive : ''}`} onClick={() => openPopup(lead._id, 'status')}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M9.33344 13.7217L4 8.34415L5.33312 7L10 11.7055L14.6669 7L16 8.34415L10.6666 13.7217C10.4898 13.8999 10.25 14 10 14C9.75 14 9.51024 13.8999 9.33344 13.7217Z" fill="currentColor" />
                      </svg>
                    </button>
                  </div>

                  {/* Popovers */}
                  {popup?.leadId === lead._id && (
                    <div ref={popupRef}>
                      {popup.kind === 'type' && <TypePopover current={lead.type} onSave={t => saveUpdate(lead._id, { type: t })} />}
                      {popup.kind === 'status' && <StatusPopover current={lead.status} onSave={s => saveUpdate(lead._id, { status: s })} />}
                      {popup.kind === 'date' && <SchedulePopover
                        current={{ date: lead.scheduledDate?.split('T')[0], time: lead.scheduledDate?.split('T')[1]?.slice(0, 5) }}
                        onSave={(d, t) => saveUpdate(lead._id, { scheduledDate: { dateStr: d, timeStr: t } })}
                      />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

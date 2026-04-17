import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getMyLeads, getMyTimeLog, getMyActivities, checkIn, checkOut, toggleBreak } from '../api/index.js';
import styles from './Dashboard.module.css';

/* ── helpers ─────────────────────────── */
const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hour${Math.floor(s / 3600) > 1 ? 's' : ''} ago`;
  return `${Math.floor(s / 86400)} day${Math.floor(s / 86400) > 1 ? 's' : ''} ago`;
};

const formatEmpActivity = (a) => {
  const action = a.action || '';
  const lower = action.toLowerCase();
  if (lower.startsWith('assigned lead')) {
    return `You were assigned a new lead`;
  }
  if (lower.includes('status: closed')) return 'You closed a deal';
  if (lower.includes('status: ongoing')) return 'You updated a lead to Ongoing';
  return action;
};

/* ── Toggle switch component (Vertical SVG version) ── */
function VerticalToggle({ color }) {
  return (
    <svg width="14" height="36" viewBox="0 0 14 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <rect width="14" height="36" rx="7" fill="#EEF2FF" />
      <g filter="url(#filter0_i_custom_toggle)">
        <rect x="2" y="2" width="10" height="32" rx="5" fill={color} />
      </g>
      <defs>
        <filter id="filter0_i_custom_toggle" x="2" y="2" width="10" height="32.9509" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feMorphology radius="0.950893" operator="erode" in="SourceAlpha" result="effect1_innerShadow_custom_toggle" />
          <feOffset dy="0.950893" />
          <feGaussianBlur stdDeviation="0.475446" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_custom_toggle" />
        </filter>
      </defs>
    </svg>
  );
}

/* ── Main Component ─────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const [t, setT] = useState({ checkIn: null, checkOut: null, currentBreak: null, breaks: [] });
  const [prevCheckOut, setPrevCheckOut] = useState('--:-- _');
  const [recentBreaks, setRecentBreaks] = useState([]);

  const [leads, setLeads] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTimelog = () => {
    getMyTimeLog().then(res => {
      const data = res.data.data;
      setT(data.log || { checkIn: null, checkOut: null, currentBreak: null, breaks: [] });
      setPrevCheckOut(data.previousCheckOut || '--:-- _');

      // Filter out duplicate breaks using a Set on start times internally
      const uniqueBreaks = [];
      const seen = new Set();
      (data.recentBreaks || []).forEach(b => {
        if (!seen.has(b.start)) {
          seen.add(b.start);
          uniqueBreaks.push(b);
        }
      });
      setRecentBreaks(uniqueBreaks);
    }).catch(console.error);
  };

  useEffect(() => {
    if (user?._id) {
      fetchTimelog();
      getMyActivities()
        .then(r => setActivities(r.data?.data || []))
        .catch(() => setActivities([]));
    }

    getMyLeads()
      .then(r => setLeads(r.data?.data || []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, [user?._id]);

  /* ── handlers ── */
  const doCheckIn = async () => {
    if (t.checkIn) return;
    try { await checkIn(); fetchTimelog(); } catch (err) { console.error(err); }
  };
  const doCheckOut = async () => {
    if (!t.checkIn || t.checkOut) return;
    try { await checkOut(); fetchTimelog(); } catch (err) { console.error(err); }
  };
  const doBreakStart = async () => {
    if (!t.checkIn || t.checkOut || t.currentBreak) return;
    try { await toggleBreak(); fetchTimelog(); } catch (err) { console.error(err); }
  };
  const doBreakEnd = async () => {
    if (!t.currentBreak) return;
    try { await toggleBreak(); fetchTimelog(); } catch (err) { console.error(err); }
  };

  const checkedIn = !!t.checkIn;
  const checkedOut = !!t.checkOut;
  const onBreak = !!t.currentBreak;

  /* Toggle colors matching user request: Grey (initial) -> Green (checked-in) -> Red (checked-out) */
  const checkColor = checkedOut ? '#ef4444' : checkedIn ? '#64E800' : '#ECECEC';
  const breakColor = onBreak ? '#64E800' : '#ECECEC';

  /* Row click handlers */
  const onCheckRow = checkedOut ? undefined : checkedIn ? doCheckOut : doCheckIn;
  const onBreakRow = (checkedIn && !checkedOut) ? (onBreak ? doBreakEnd : doBreakStart) : undefined;

  /* Activities - Only show assignment notifications as requested */
  const activityItems = activities
    .filter(a => (a.action || '').toLowerCase().startsWith('assigned lead'))
    .slice(0, 7)
    .map(a => ({
      text: formatEmpActivity(a),
      time: timeAgo(a.createdAt),
    }));

  const displayCheckOutTime = checkedOut ? t.checkOut : prevCheckOut;

  return (
    <div className={styles.page}>

      {/* ── Blue Header ── */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoW}>Canova</span>
          <span className={styles.logoC}>CRM</span>
        </div>
        <p className={styles.greetSub}>{greet()}</p>
        <h1 className={styles.greetName}>{user?.name || 'User'}</h1>
      </div>

      <div className={styles.body}>

        {/* ── Timings Card ── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Timings</h2>

          {/* Check In / Check Out row — full row is clickable */}
          <div
            className={`${styles.timingRow} ${onCheckRow ? styles.clickable : ''}`}
            onClick={onCheckRow}
          >
            <div className={styles.tCol}>
              <span className={styles.tLabel}>
                {checkedOut ? 'Checked-Out' : checkedIn ? 'Checked-In' : 'Check in'}
              </span>
              <span className={styles.tTime}>{t.checkIn || '--:-- _'}</span>
            </div>
            <div className={styles.tCol}>
              <span className={styles.tLabel}>Check Out</span>
              <span className={styles.tTime}>{displayCheckOutTime}</span>
            </div>
            <VerticalToggle color={checkColor} />
          </div>

          {/* Break / Ended row */}
          <div
            className={`${styles.timingRow} ${onBreakRow ? styles.clickable : styles.dimmed}`}
            style={{ marginTop: 10 }}
            onClick={onBreakRow}
          >
            <div className={styles.tCol}>
              <span className={styles.tLabel}>{onBreak ? 'On Break' : 'Break'}</span>
              <span className={styles.tTime}>{t.currentBreak || '--:-- _'}</span>
            </div>
            <div className={styles.tCol}>
              <span className={styles.tLabel}>Ended</span>
              <span className={styles.tTime}>
                {t.breaks && t.breaks.length ? t.breaks[t.breaks.length - 1].end : '--:-- _'}
              </span>
            </div>
            <VerticalToggle color={breakColor} />
          </div>

          {/* Break history */}
          {recentBreaks.length > 0 && (
            <div className={styles.breakTable}>
              <div className={styles.breakHead}>
                <span>Break</span><span>Ended</span><span>Date</span>
              </div>
              <div className={styles.breakList}>
                {[...recentBreaks].reverse().map((b, i) => (
                  <div key={i} className={styles.breakRow}>
                    <span>{b.start}</span><span>{b.end || '--:--'}</span><span>{b.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Recent Activity ── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Recent Activity Feed</h2>
          <div className={styles.actBox}>
            {loading ? (
              <span className={styles.muted}>Loading…</span>
            ) : activityItems.length === 0 ? (
              <span className={styles.muted}>No recent activity</span>
            ) : activityItems.map((a, i) => (
              <div key={i} className={styles.actItem}>
                <span className={styles.actBullet}>•</span>
                <span className={styles.actText}>{a.text} – {a.time}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

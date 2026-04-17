import { useEffect, useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getDashboard } from '../api/index.js';
import { useSearch } from '../context/SearchContext.jsx';
import styles from './Dashboard.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
function Avatar({ name, index = 0, size = 34 }) {
  const initials = (name || 'Employee').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: AVATAR_COLORS[index % AVATAR_COLORS.length],
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: size * 0.4, fontWeight: 600
    }}>
      {initials}
    </div>
  );
}

const formatActivityText = (a) => {
  if (!a.action) return 'Unknown activity';
  const action = a.action;
  const lower = action.toLowerCase();

  // "Assigned lead "LeadName" to EmployeeName"
  if (lower.startsWith('assigned lead')) {
    const empName = a.user?.name || action.split(' to ').pop();
    return `You assigned a lead to ${empName}`;
  }

  // "Lead "X" updated — status: Closed, type: Warm"
  if (lower.includes('status: closed')) {
    const empName = a.user?.name || 'An employee';
    return `${empName} closed a deal`;
  }
  if (lower.includes('status: ongoing')) {
    const empName = a.user?.name || 'An employee';
    return `${empName} updated a lead to Ongoing`;
  }

  if (lower.includes('bulk uploaded')) return 'You uploaded leads via CSV';
  if (lower.includes('added manually')) return 'You manually added a new lead';
  if (lower.includes('auto-synced')) return action;

  return action;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { searchTerm } = useSearch();

  useEffect(() => {
    getDashboard()
      .then(res => setData(res.data.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  // Graceful empty state if data fails — no red error
  const safeData = data || {};
  const { kpis = {}, leadsPerDay = [], recentActivities = [], activeSalesDetails = [] } = safeData;

  const unassignedLeads  = kpis?.unassignedLeads  ?? 0;
  const assignedThisWeek = kpis?.assignedThisWeek ?? 0;
  const activeSalesPeople = kpis?.activeSalesPeople ?? 0;
  const conversionRate   = kpis?.conversionRate   ?? 0;

  // Build last 14 days chart
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });
  const dayMap = {};
  leadsPerDay.forEach(d => { dayMap[d._id] = d; });

  const chartData = {
    labels: last14.map(d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })),
    datasets: [
      {
        label: 'Assigned Leads',
        data: last14.map(d => dayMap[d]?.assigned || 0),
        backgroundColor: '#9CA3AF',
        hoverBackgroundColor: '#6B7280',
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 12,
      },
      {
        label: 'Closed Leads',
        data: last14.map(d => dayMap[d]?.closed || 0),
        backgroundColor: '#D1D5DB',
        hoverBackgroundColor: '#9CA3AF',
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 12,
      },
    ],
  };


  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 }, maxRotation: 0, minRotation: 0, color: '#666' }, border: { display: false } },
      y: { grid: { color: '#f0f0f0', borderDash: [4, 4] }, ticks: { font: { family: 'Inter', size: 10 }, color: '#666', stepSize: 20, callback: (v) => v + '%' }, beginAtZero: true, max: 100, border: { display: false } },
    },
  };

  const filteredSalesPeople = (activeSalesDetails || []).filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp._id.toString().includes(searchTerm)
  );

  return (
    <div className={`${styles.page} fade-in`}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <span className={styles.breadHome}>Home</span>
        <span className={styles.breadSep}> › </span>
        <span className={styles.breadCurrent}>Dashboard</span>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className="uic-kpi-circle">
            <span className="uic uic-money-kpi" style={{ fontSize: 18 }}></span>
          </div>
          <div className={styles.kpiTextWrap}>
            <div className={styles.kpiLabel}>Unassigned Leads</div>
            <div className={styles.kpiValue}>{unassignedLeads}</div>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className="uic-kpi-circle">
            <span className="uic uic-user-kpi" style={{ fontSize: 18 }}></span>
          </div>
          <div className={styles.kpiTextWrap}>
            <div className={styles.kpiLabel}>Assigned This Week</div>
            <div className={styles.kpiValue}>{assignedThisWeek}</div>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className="uic-kpi-circle">
            <div className="uic uic-shake-kpi" style={{ fontSize: 18 }}>
              <div className="uic-shake-line"></div>
            </div>
          </div>
          <div className={styles.kpiTextWrap}>
            <div className={styles.kpiLabel}>Active Salespeople</div>
            <div className={styles.kpiValue}>{activeSalesPeople}</div>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className="uic-kpi-circle">
            <div className="uic uic-gauge-kpi" style={{ fontSize: 18 }}>
              <div className="uic-gauge-kpi-dot"></div>
            </div>
          </div>
          <div className={styles.kpiTextWrap}>
            <div className={styles.kpiLabel}>Conversion Rate</div>
            <div className={styles.kpiValue}>{conversionRate}%</div>
          </div>
        </div>
      </div>

      <div className={styles.midRow}>
        <div className={`${styles.chartCard} card`}>
          <div className={styles.chartWrap}>
            <Bar data={chartData} options={chartOptions} />
          </div>
          <div className={styles.cardFooterText}>Sale Analytics</div>
        </div>

        <div className={`${styles.activityCard} card`}>
          <div className={styles.cardHeader}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#616161' }}>Recent Activity Feed</span>
          </div>
          <div className={styles.activityList}>
            {recentActivities.slice(0, 7).map((a, i) => (
              <div key={a._id || i} className={styles.activityItem}>
                <div className={styles.activityDot} />
                <div className={styles.activityText}>
                  {formatActivityText(a)} – {timeAgo(a.createdAt)}
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className={styles.emptyActivity}>No recent activity to show.</div>
            )}
          </div>
        </div>
      </div>

      {activeSalesDetails && activeSalesDetails.length > 0 && (
        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Active Sales People</h3>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>Assigned Leads</th>
                  <th>Closed Leads</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalesPeople.map((emp, i) => (
                  <tr key={emp._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={emp.name} index={i} size={34} />
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#111' }}>{emp.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.tagId}>{emp._id}</span>
                    </td>
                    <td style={{ fontWeight: 500, color: '#616161' }}>{emp.assignedLeads ?? 0}</td>
                    <td style={{ fontWeight: 500, color: '#616161' }}>{emp.closedLeads ?? 0}</td>
                    <td>
                      <span className={styles.statusActive}>
                        <span className={styles.dotGreen} /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSalesPeople.length === 0 && (
              <div className={styles.emptySearch}>No team members found matching "{searchTerm}"</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

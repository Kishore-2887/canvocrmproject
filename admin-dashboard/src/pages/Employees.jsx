import { useEffect, useState, useRef } from 'react';
import {
  getEmployees, createEmployee, updateEmployee, bulkDeleteEmployees
} from '../api/index.js';
import styles from './Employees.module.css';
import Modal from '../components/Modal.jsx';

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

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali'];

function EmployeeModal({ employee, onClose, onSaved }) {
  const isEdit = !!employee;
  const [form, setForm] = useState({
    firstName: employee?.name?.split(' ')[0] || '',
    lastName: employee?.name?.split(' ').slice(1).join(' ') || '',
    email: employee?.email || '',
    location: employee?.location || '',
    language: employee?.language || 'English',
    status: employee?.status || 'Active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.firstName.trim()) { setError('First name is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        language: form.language,
        status: form.status,
        location: form.location,
      };
      if (isEdit) {
        await updateEmployee(employee._id, payload);
      } else {
        await createEmployee(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-box" style={{ width: 440, padding: '24px 32px' }}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{isEdit ? 'Edit Employee' : 'Add New Employee'}</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {error && <div style={{ fontSize: '0.78rem', color: '#ef4444', marginBottom: 12 }}>{error}</div>}

        <form className="modal-form" onSubmit={handleSubmit}>

          <div className="form-group">
            <label className={styles.formLabel}>First name</label>
            <input
              name="firstName" className={styles.formInput}
              value={form.firstName} onChange={handleChange}
              placeholder="Tanner" required
            />
          </div>

          <div className="form-group">
            <label className={styles.formLabel}>Last name</label>
            <input
              name="lastName" className={styles.formInput}
              value={form.lastName} onChange={handleChange}
              placeholder="Finsha"
            />
          </div>

          <div className="form-group">
            <label className={styles.formLabel}>Email</label>
            <input
              name="email" type="email" className={styles.formInput}
              value={form.email} onChange={handleChange}
              placeholder="Tannerfisher@gmail.com" required
            />
          </div>

          <div className="form-group">
            <label className={styles.formLabel}>Location</label>
            <input
              name="location" className={styles.formInput}
              value={form.location} onChange={handleChange}
              placeholder="Karnataka"
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

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Close menu on outside click
  useEffect(() => {
    const handler = e => { if (!e.target.closest('[data-menu]')) setMenuOpen(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const fetchEmployees = async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployees({ page: p, limit: 8 });
      setEmployees(res.data.data);
      setPagination(res.data.pagination);
      setSelectedIds(new Set()); // Reset selections on page change
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(page); }, [page]);

  const handleDelete = async (idsArray) => {
    if (!window.confirm('Delete selected employee(s)? This cannot be undone.')) return;
    try {
      await bulkDeleteEmployees(idsArray);
      setSelectedIds(new Set());
      setMenuOpen(null);
      fetchEmployees(page);
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === employees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map(e => e._id)));
    }
  };

  return (
    <div className={`${styles.page} fade-in`}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadHome}>Home</span>
          <span className={styles.breadSep}> › </span>
          <span className={styles.breadCurrent}>Employees</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {selectedIds.size > 0 && (
            <button className={styles.btnPill} style={{ background: '#ef4444', color: '#fff' }} onClick={() => handleDelete(Array.from(selectedIds))}>
              Delete ({selectedIds.size})
            </button>
          )}
          <button className={styles.btnPill} onClick={() => { setEditEmp(null); setShowAdd(true); }}>
            Add Employees
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th style={{ width: 40, paddingLeft: 24 }}>
                <input
                  type="checkbox"
                  onChange={toggleAll}
                  checked={employees.length > 0 && selectedIds.size === employees.length}
                  className={styles.customCheck}
                />
              </th>
              <th>Name</th>
              <th>Employee ID</th>
              <th>Assigned Leads</th>
              <th>Closed Leads</th>
              <th>Status</th>
              <th style={{ width: 40, paddingRight: 24 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="page-loading"><div className="spinner" /></div></td></tr>
            ) : error ? (
              <tr><td colSpan={7} style={{ padding: 24, color: '#ef4444', textAlign: 'center' }}>{error}</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state">No employees yet</div></td></tr>
            ) : (
              employees.map((emp, i) => (
                <tr key={emp._id}>
                  <td style={{ paddingLeft: 24 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(emp._id)}
                      onChange={() => toggleSelection(emp._id)}
                      className={styles.customCheck}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={emp.name} index={(page - 1) * 8 + i} size={34} />
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
                    {emp.status === 'Active' ? (
                      <span className={styles.statusActive}>
                        <span className={styles.dotGreen} /> Active
                      </span>
                    ) : (
                      <span className={styles.statusInactive}>
                        <span className={styles.dotRed} /> Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ paddingRight: 24 }}>
                    <div className={styles.menuWrap} data-menu>
                      <button
                        className={styles.menuBtn}
                        onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === emp._id ? null : emp._id); }}
                        data-menu
                      >
                        <span className="uic uic-more" style={{ fontSize: 20, color: '#a0a0a0' }}></span>
                      </button>
                      {menuOpen === emp._id && (
                        <div className={styles.dropdown} data-menu>
                          <button className={styles.dropdownItem} onClick={() => { setEditEmp(emp); setShowAdd(true); setMenuOpen(null); }}>
                            <span className="uic uic-edit-sm"></span> Edit
                          </button>
                          <button className={`${styles.dropdownItem} ${styles.deleteOpt}`} onClick={() => handleDelete([emp._id])}>
                            <span className="uic uic-trash-sm"></span> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {employees.length > 0 && <Pagination page={page} pages={pagination.pages} onPage={p => setPage(p)} />}
      </div>

      {(showAdd || editEmp) && (
        <EmployeeModal
          employee={editEmp}
          onClose={() => { setShowAdd(false); setEditEmp(null); }}
          onSaved={() => fetchEmployees(page)}
        />
      )}
    </div>
  );
}

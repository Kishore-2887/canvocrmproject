import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ── Auth ─────────────────────────────────────────── */
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateMe = (data) => api.put('/auth/me', data);

/* ── Employees ────────────────────────────────────── */
export const getEmployees = (params) => api.get('/employees', { params });
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const bulkDeleteEmployees = (ids) => api.delete('/employees', { data: { ids } });

/* ── Leads ────────────────────────────────────────── */
export const getLeads = (params) => api.get('/leads', { params });
export const getLead = (id) => api.get(`/leads/${id}`);
export const createLead = (data) => api.post('/leads', data);
export const updateLead = (id, data) => api.put(`/leads/${id}`, data);
export const uploadLeadsCSV = (formData) =>
  api.post('/leads/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

/* ── Dashboard ────────────────────────────────────── */
export const getDashboard = () => api.get('/dashboard');

export default api;

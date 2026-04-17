import axios from 'axios';

const api = axios.create({
  baseURL: 'https://canvo-backend.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach stored JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('emp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401: clear session and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('emp_token');
      localStorage.removeItem('emp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateMe = (data) => api.put('/auth/me', data);

export const getMyLeads = () => api.get('/leads/mine');
export const getLead = (id) => api.get(`/leads/${id}`);
export const updateLead = (id, data) => api.put(`/leads/${id}`, data);
export const getMyActivities = () => api.get('/leads/activities/mine');

export const getMyTimeLog = () => api.get('/timelogs/me');
export const checkIn = () => api.post('/timelogs/checkin');
export const checkOut = () => api.post('/timelogs/checkout');
export const toggleBreak = () => api.post('/timelogs/break');

export default api;

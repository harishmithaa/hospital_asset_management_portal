import axios from 'axios';

// Support Vercel production environment variable or fallback to localhost
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Derived server root for uploaded static files (/uploads/...)
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || API_URL.replace(/\/api\/?$/, '');

// Helper to construct full URL for images, PDFs, certificates
export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${SERVER_URL}${cleanPath}`;
};

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Inject Bearer token on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hams_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  createUser: (formData) => api.post('/auth/users', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateUser: (id, formData) => api.put(`/auth/users/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

// Equipment
export const equipmentAPI = {
  getAll: (params) => api.get('/equipment', { params }),
  getById: (id) => api.get(`/equipment/${id}`),
  getStats: () => api.get('/equipment/stats'),
  create: (formData) => api.post('/equipment', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/equipment/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/equipment/${id}`),
};

// Departments
export const departmentAPI = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

// Maintenance
export const maintenanceAPI = {
  getAll: (params) => api.get('/maintenance', { params }),
  getById: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/maintenance/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/maintenance/${id}`),
};

// Complaints
export const complaintAPI = {
  getAll: (params) => api.get('/complaints', { params }),
  getById: (id) => api.get(`/complaints/${id}`),
  create: (formData) => api.post('/complaints', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/complaints/${id}`, data),
  delete: (id) => api.delete(`/complaints/${id}`),
};

// Calibration
export const calibrationAPI = {
  getAll: (params) => api.get('/calibration', { params }),
  getById: (id) => api.get(`/calibration/${id}`),
  create: (formData) => api.post('/calibration', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/calibration/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/calibration/${id}`),
};

// Vendors
export const vendorAPI = {
  getAll: () => api.get('/vendors'),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
};

// Transfers (Admin only — called from Equipment Details)
export const transferAPI = {
  getAll: (params) => api.get('/transfers', { params }),
  create: (data) => api.post('/transfers', data),
};

// Disposal (Admin only — called from Equipment Details)
export const disposalAPI = {
  getAll: () => api.get('/disposal'),
  create: (formData) => api.post('/disposal', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getByEquipment: (id) => api.get(`/disposal/equipment/${id}`),
};

// Warranty & AMC
export const warrantyAmcAPI = {
  getSummary: () => api.get('/warranty-amc'),
  update: (id, data) => api.put(`/warranty-amc/${id}`, data),
};

// Notifications
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Reports
export const reportAPI = {
  getReport: (type) => api.get(`/reports/${type}`),
};

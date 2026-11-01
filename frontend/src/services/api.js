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
});

// Inject Bearer token on every request & manage content headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hams_token');
    if (token && token !== 'null' && token !== 'undefined') {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // When submitting FormData, ensure Content-Type is not forced so Axios/browser computes multipart boundary
    if (config.data instanceof FormData) {
      if (config.headers && typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else if (config.headers) {
        delete config.headers['Content-Type'];
      }
    } else {
      if (config.headers && typeof config.headers.set === 'function') {
        if (!config.headers.get('Content-Type')) {
          config.headers.set('Content-Type', 'application/json');
        }
      } else {
        config.headers = config.headers || {};
        if (!config.headers['Content-Type']) {
          config.headers['Content-Type'] = 'application/json';
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Auth
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  createUser: (formData) => api.post('/auth/users', formData),
  updateUser: (id, formData) => api.put(`/auth/users/${id}`, formData),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

// Equipment
export const equipmentAPI = {
  getAll: (params) => api.get('/equipment', { params }),
  getById: (id) => api.get(`/equipment/${id}`),
  getStats: () => api.get('/equipment/stats'),
  create: (formData) => api.post('/equipment', formData),
  update: (id, formData) => api.put(`/equipment/${id}`, formData),
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
  create: (data) => api.post('/maintenance', data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
  delete: (id) => api.delete(`/maintenance/${id}`),
  updateChecklist: (id, checklistItems) => api.put(`/maintenance/${id}/checklist`, { checklistItems }),
  updateSpareParts: (id, spareParts) => api.put(`/maintenance/${id}/spare-parts`, { spareParts }),
  getByComplaint: (complaintId) => api.post(`/maintenance/complaint/${complaintId}`),
};

// Complaints
export const complaintAPI = {
  getAll: (params) => api.get('/complaints', { params }),
  getById: (id) => api.get(`/complaints/${id}`),
  create: (formData) => api.post('/complaints', formData),
  update: (id, data) => api.put(`/complaints/${id}`, data),
  passToVendor: (id, data) => api.put(`/complaints/${id}/pass-to-vendor`, data),
  updateVendorArrival: (id, data) => api.put(`/complaints/${id}/vendor-arrival`, data),
  delete: (id) => api.delete(`/complaints/${id}`),
};

// Calibration
export const calibrationAPI = {
  getAll: (params) => api.get('/calibration', { params }),
  getById: (id) => api.get(`/calibration/${id}`),
  create: (formData) => api.post('/calibration', formData),
  update: (id, formData) => api.put(`/calibration/${id}`, formData),
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
  create: (formData) => api.post('/disposal', formData),
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

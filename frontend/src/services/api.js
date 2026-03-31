import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  withCredentials: true,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/login', data),
  verify2FA: (data) => api.post('/verify-2fa', data),
  logout: () => api.post('/logout'),
  logoutAll: () => api.post('/logout-all'),
  me: () => api.get('/me'),
  changePassword: (data) => api.post('/change-password', data),
  forgotPassword: (data) => api.post('/forgot-password', data),
  resetPassword: (data) => api.post('/reset-password', data),
  getUsers: (params) => api.get('/users', { params }),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  forceLogout: (id) => api.post(`/users/${id}/force-logout`),
};

// Dashboard
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

// Production
export const productionAPI = {
  list: (params) => api.get('/productions', { params }),
  create: (data) => api.post('/productions', data),
  show: (id) => api.get(`/productions/${id}`),
  update: (id, data) => api.put(`/productions/${id}`, data),
  delete: (id) => api.delete(`/productions/${id}`),
  dailySummary: (params) => api.get('/production/daily-summary', { params }),
  shiftComparison: (params) => api.get('/production/shift-comparison', { params }),
};

// Materials
export const materialAPI = {
  list: (params) => api.get('/materials', { params }),
  create: (data) => api.post('/materials', data),
  show: (id) => api.get(`/materials/${id}`),
  update: (id, data) => api.put(`/materials/${id}`, data),
  delete: (id) => api.delete(`/materials/${id}`),
  addStock: (id, data) => api.post(`/materials/${id}/add-stock`, data),
  recordWastage: (id, data) => api.post(`/materials/${id}/wastage`, data),
  lowStock: () => api.get('/materials-low-stock'),
  transactions: (id, params) => api.get(`/materials/${id}/transactions`, { params }),
  categories: () => api.get('/material-categories'),
};

// Parties
export const partyAPI = {
  list: (params) => api.get('/parties', { params }),
  create: (data) => api.post('/parties', data),
  show: (id) => api.get(`/parties/${id}`),
  update: (id, data) => api.put(`/parties/${id}`, data),
  delete: (id) => api.delete(`/parties/${id}`),
  ledger: (id) => api.get(`/parties/${id}/ledger`),
  dues: () => api.get('/party-dues'),
};

// Invoices
export const invoiceAPI = {
  list: (params) => api.get('/invoices', { params }),
  create: (data) => api.post('/invoices', data),
  show: (id) => api.get(`/invoices/${id}`),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  pdf: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  whatsapp: (id) => api.get(`/invoices/${id}/whatsapp`),
  nextNumber: () => api.get('/next-invoice-number'),
};

// Payments
export const paymentAPI = {
  list: (params) => api.get('/payments', { params }),
  create: (data) => api.post('/payments', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  show: (id) => api.get(`/payments/${id}`),
  delete: (id) => api.delete(`/payments/${id}`),
};

// Expenses
export const expenseAPI = {
  list: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  show: (id) => api.get(`/expenses/${id}`),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  categories: () => api.get('/expense-categories'),
  createCategory: (data) => api.post('/expense-categories', data),
  deleteCategory: (id) => api.delete(`/expense-categories/${id}`),
  dailySummary: (params) => api.get('/expense-daily-summary', { params }),
};

// Reports
export const reportAPI = {
  production: (params) => api.get('/reports/production', { params }),
  stock: () => api.get('/reports/stock'),
  wastage: (params) => api.get('/reports/wastage', { params }),
  profitLoss: (params) => api.get('/reports/profit-loss', { params }),
  partyDues: () => api.get('/reports/party-dues'),
};

// Search
export const searchAPI = {
  global: (q) => api.get('/search', { params: { q } }),
};

// Notifications
export const notificationAPI = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  unreadCount: () => api.get('/notifications/unread-count'),
};

// Activity logs
export const logAPI = {
  activity: (params) => api.get('/activity-logs', { params }),
  login: (params) => api.get('/login-logs', { params }),
};

export default api;

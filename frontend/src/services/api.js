import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Public API
export const expenseAPI = {
  submitExpense: async (formData) => {
    const response = await api.post('/api/expenses/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getExpense: async (expenseId) => {
    const response = await api.get(`/api/expenses/${expenseId}`);
    return response.data;
  }
};

// Admin API
export const adminAPI = {
  login: async (password) => {
    const response = await api.post('/api/admin/login', { password });
    return response.data;
  },

  listExpenses: async (status = null) => {
    const params = status ? { status } : {};
    const response = await api.get('/api/admin/expenses', { params });
    return response.data;
  },

  getExpense: async (expenseId) => {
    const response = await api.get(`/api/admin/expenses/${expenseId}`);
    return response.data;
  },

  updateExpense: async (expenseId, updateData) => {
    const response = await api.patch(`/api/admin/expenses/${expenseId}`, updateData);
    return response.data;
  },

  uploadAttachments: async (expenseId, formData) => {
    const response = await api.post(
      `/api/admin/expenses/${expenseId}/attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  getFileUrl: (fileType, filename) => {
    return `${API_URL}/api/admin/files/${fileType}/${filename}`;
  },

  deletePhoto: async (expenseId, filename) => {
    const response = await api.delete(`/api/admin/expenses/${expenseId}/photos/${filename}`);
    return response.data;
  },

  softDeleteExpense: async (expenseId) => {
    const response = await api.delete(`/api/admin/expenses/${expenseId}`);
    return response.data;
  },

  restoreExpense: async (expenseId) => {
    const response = await api.post(`/api/admin/expenses/${expenseId}/restore`);
    return response.data;
  }
};

export default api;

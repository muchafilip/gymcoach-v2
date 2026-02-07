import axios from 'axios';
import { API_URL } from '../utils/constants';
import { getAuthToken } from '../utils/auth';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${error.response.status}`, error.response.data);
    } else if (error.request) {
      console.error(`Network Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} →`, error.message);
    }
    return Promise.reject(error);
  }
);

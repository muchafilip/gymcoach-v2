import axios from 'axios';
import { API_URL } from '../utils/constants';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (for auth tokens later)
apiClient.interceptors.request.use(
  (config) => {
    // Future: Add auth token here
    // const token = await getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
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

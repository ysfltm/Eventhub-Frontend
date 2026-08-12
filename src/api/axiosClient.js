import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001/api';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token (sessionStorage prioritized for multi-tab tab isolation)
axiosClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('eventhub_token') || localStorage.getItem('eventhub_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Evict session on 401 Unauthorized (except for auth requests & login page)
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url?.toLowerCase() || '';
      const isAuthRequest = requestUrl.includes('/auth/') || requestUrl.includes('login') || requestUrl.includes('change-password');
      const isLoginPage = window.location.pathname === '/login';

      if (!isAuthRequest && !isLoginPage) {
        sessionStorage.removeItem('eventhub_token');
        sessionStorage.removeItem('eventhub_user');
        localStorage.removeItem('eventhub_token');
        localStorage.removeItem('eventhub_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('railway.app')) {
    const apiHost = window.location.hostname.replace('-web', '-api');
    return `https://${apiHost}/api`;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export const formatImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const baseUrl = getBaseURL().replace(/\/api\/?$/, '');
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Interceptor to inject Bearer Token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hacktracker_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
      // Clear token if invalid/expired session
      // localStorage.removeItem('hacktracker_token');
      // localStorage.removeItem('hacktracker_user');
    }
    return Promise.reject(error);
  }
);

export default api;

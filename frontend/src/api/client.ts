import axios from 'axios';

let API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Safety check: Never hit localhost in production
if (import.meta.env.MODE === 'production' && API_BASE_URL.includes('localhost')) {
  console.warn('API_BASE_URL was misconfigured to localhost in production. Falling back to /api');
  API_BASE_URL = '/api';
}

console.log('API Base URL:', API_BASE_URL);


export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds — fail fast if backend is unreachable
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Debug log for troubleshooting live URL issues
  if (import.meta.env.MODE === 'production') {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  }
  
  return config;
});

// Handle backend error format and auth errors
apiClient.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data && data.success === false) {
      return Promise.reject(new Error(data.error || 'Unknown error occurred'));
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Check if error response follows backend format
    if (error.response?.data?.success === false) {
      return Promise.reject(new Error(error.response.data.error || error.message));
    }

    // Handle timeout / network errors gracefully (avoids infinite loading)
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response) {
      return Promise.reject(new Error('Cannot reach the server. Please check your connection.'));
    }

    return Promise.reject(error);
  }
);

export default apiClient;


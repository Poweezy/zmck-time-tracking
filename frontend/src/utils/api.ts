import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Request cache for GET requests
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Add token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add cache busting for POST/PUT/DELETE
    if (config.method !== 'get') {
      const cacheKey = `${config.method}_${config.url}`;
      requestCache.delete(cacheKey);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Retry logic helper
const retryRequest = async (config: AxiosRequestConfig, retryCount = 0): Promise<any> => {
  try {
    return await axios(config);
  } catch (error) {
    if (retryCount < MAX_RETRIES && error instanceof AxiosError) {
      const status = error.response?.status;
      // Retry on network errors or 5xx errors
      if (!status || (status >= 500 && status < 600)) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return retryRequest(config, retryCount + 1);
      }
    }
    throw error;
  }
};

// Enhanced response interceptor with caching and retry
api.interceptors.response.use(
  (response) => {
    // Cache GET requests
    if (response.config.method === 'get' && response.config.url) {
      const cacheKey = response.config.url;
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Retry logic for network errors or 5xx errors
    if (
      originalRequest &&
      !originalRequest._retry &&
      (!error.response || (error.response.status >= 500 && error.response.status < 600))
    ) {
      originalRequest._retry = true;
      try {
        return await retryRequest(originalRequest);
      } catch (retryError) {
        // If retry fails, show error
        if (retryError instanceof AxiosError && retryError.response) {
          toast.error(
            retryError.response.data?.error || 
            'Network error. Please check your connection and try again.'
          );
        }
        return Promise.reject(retryError);
      }
    }

    // Enhanced error messages
    if (error.response) {
      const status = error.response.status;
      const message = (error.response.data as any)?.error || error.message;
      
      switch (status) {
        case 400:
          toast.error(message || 'Invalid request. Please check your input.');
          break;
        case 403:
          toast.error('You do not have permission to perform this action.');
          break;
        case 404:
          toast.error('The requested resource was not found.');
          break;
        case 422:
          toast.error(message || 'Validation error. Please check your input.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(message || 'An error occurred. Please try again.');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

// Helper function to get cached data
export const getCachedData = (url: string) => {
  const cached = requestCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

// Helper function to clear cache
export const clearCache = (url?: string) => {
  if (url) {
    requestCache.delete(url);
  } else {
    requestCache.clear();
  }
};

export default api;

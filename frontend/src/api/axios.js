import axios from 'axios';

// Generic axios instance where interceptor injects token
const createAxiosInstance = (baseURL) => {
  const instance = axios.create({
    baseURL,
  });

  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  return instance;
};

export const authApi = createAxiosInstance(import.meta.env.VITE_AUTH_API_URL);
export const donationApi = createAxiosInstance(import.meta.env.VITE_DONATION_API_URL);
export const trackingApi = createAxiosInstance(import.meta.env.VITE_TRACKING_API_URL);

import axios from 'axios';
import { mockAPI } from './mockData';

const BASE = import.meta.env.VITE_API_BASE || 'https://florinda-histoid-hermila.ngrok-free.dev/api';

export const api = {
  get: (url, cfg = {}) => {
    if (mockAPI.enabled) {
      return mockAPI.get(url, cfg);
    }
    return axios.get(BASE + url, cfg);
  },
  post: (url, data) => {
    if (mockAPI.enabled) {
      return mockAPI.post(url, data);
    }
    return axios.post(BASE + url, data);
  },
  put: (url, data) => {
    if (mockAPI.enabled) {
      return mockAPI.put(url, data);
    }
    return axios.put(BASE + url, data);
  },
  delete: (url) => {
    if (mockAPI.enabled) {
      return mockAPI.delete(url);
    }
    return axios.delete(BASE + url);
  },
  setToken: (t) => {
    if (t) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }
};
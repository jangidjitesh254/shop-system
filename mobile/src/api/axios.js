import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Resolve API base URL. Priority:
// 1. expo-constants extra.apiBaseUrl (set in app.json)
// 2. Platform-aware default (Android emulator -> 10.0.2.2, iOS sim -> localhost)
const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const configuredRaw =
  Constants?.expoConfig?.extra?.apiBaseUrl ||
  Constants?.manifest?.extra?.apiBaseUrl ||
  Constants?.manifest2?.extra?.expoClient?.extra?.apiBaseUrl;

// Strip accidental whitespace (typo in app.json would otherwise break everything)
const configured = typeof configuredRaw === 'string' ? configuredRaw.trim().replace(/\s+/g, '') : null;
export const API_BASE_URL = configured || `http://${defaultHost}:5000/api`;

// eslint-disable-next-line no-console
console.log('[API] base URL =', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

let cachedToken = null;
let onUnauthorized = null;

export const setToken = (token) => {
  cachedToken = token || null;
  console.log('[API] token set =', cachedToken ? 'YES' : 'no');
};

export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.request.use(async (config) => {
  try {
    if (!cachedToken) {
      const raw = await AsyncStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      cachedToken = user?.token || null;
    }
    if (cachedToken) {
      config.headers.Authorization = `Bearer ${cachedToken}`;
    }
  } catch (e) {
    console.warn('[API] request interceptor error:', e?.message);
  }
  console.log(
    '[API] →',
    (config.method || 'GET').toUpperCase(),
    config.url,
    cachedToken ? '(auth)' : '(no-auth)'
  );
  return config;
});

api.interceptors.response.use(
  (res) => {
    console.log('[API] ←', res.status, res.config.url);
    return res;
  },
  async (err) => {
    const status = err.response?.status;
    const url = err.config?.url;
    const msg = err.response?.data?.message || err.message;
    console.warn('[API] ✗', status || 'NO_RESP', url, '-', msg);

    if (status === 401) {
      cachedToken = null;
      await AsyncStorage.removeItem('user');
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(err);
  }
);

export default api;

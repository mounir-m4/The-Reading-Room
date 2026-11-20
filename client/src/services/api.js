import axios from 'axios';

const TOKEN_KEY = 'bookstore_access_token';
const SESSION_KEY = 'bookstore_session_id';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `guest-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['x-session-id'] = getSessionId();
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    if (status === 401 && !original._retry && tokenStore.get() && !original.url?.includes('/auth/')) {
      original._retry = true;
      try {
        refreshing ||= api.post('/auth/refresh').then((r) => r.data.data.accessToken).finally(() => { refreshing = null; });
        const token = await refreshing;
        tokenStore.set(token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        tokenStore.clear();
      }
    }
    return Promise.reject(error);
  },
);

export const unwrap = (response) => response.data;
export const errorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Something went wrong';

export default api;

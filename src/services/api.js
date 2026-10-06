import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

export const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl;

// ─── Token storage — chunked, SecureStore values are limited to ~2KB ─────────
const TOKEN_KEY = "hc_token";
const CHUNK_COUNT_KEY = "hc_token_chunks";
const CHUNK_SIZE = 1800;

export async function saveToken(token) {
  try {
    await removeToken();
    const chunks = [];
    for (let i = 0; i < token.length; i += CHUNK_SIZE) {
      chunks.push(token.slice(i, i + CHUNK_SIZE));
    }
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${TOKEN_KEY}_${i}`, chunks[i]);
    }
    await SecureStore.setItemAsync(CHUNK_COUNT_KEY, String(chunks.length));
  } catch (e) {
    console.warn("saveToken error:", e);
  }
}

export async function getToken() {
  try {
    const count = parseInt((await SecureStore.getItemAsync(CHUNK_COUNT_KEY)) || "0", 10);
    if (!count) return null;
    const chunks = [];
    for (let i = 0; i < count; i++) {
      const chunk = await SecureStore.getItemAsync(`${TOKEN_KEY}_${i}`);
      if (!chunk) return null;
      chunks.push(chunk);
    }
    return chunks.join("");
  } catch {
    return null;
  }
}

export async function removeToken() {
  try {
    const count = parseInt((await SecureStore.getItemAsync(CHUNK_COUNT_KEY)) || "0", 10);
    for (let i = 0; i < count; i++) {
      await SecureStore.deleteItemAsync(`${TOKEN_KEY}_${i}`);
    }
    await SecureStore.deleteItemAsync(CHUNK_COUNT_KEY);
  } catch (e) {
    console.warn("removeToken error:", e);
  }
}

// ─── Session expiry ──────────────────────────────────────────────────────────
// The store registers a callback so an unrecoverable 401 signs the user out.
let onSessionExpired = null;
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

// ─── Errors ──────────────────────────────────────────────────────────────────
// Every rejection is { message, status, errors } so screens can show it as is.
function toApiError(error, fallback) {
  const data = error?.response?.data;
  const fieldErrors = data?.errors && typeof data.errors === "object" ? data.errors : null;
  const firstFieldError = fieldErrors ? Object.values(fieldErrors).flat()[0] : null;
  return {
    message:
      firstFieldError ||
      data?.message ||
      (error?.code === "ECONNABORTED" ? "The server took too long to respond." : null) ||
      (error?.message === "Network Error" ? "Cannot reach the server. Check your connection." : null) ||
      fallback,
    status: error?.response?.status,
    errors: fieldErrors,
  };
}

// ─── Clients ─────────────────────────────────────────────────────────────────
function createClient(timeout) {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: { Accept: "application/json" },
    timeout,
  });

  client.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;
      const isAuthCall = original?.url?.startsWith("auth/");

      if (error?.response?.status === 401 && original && !original._retried && !isAuthCall) {
        original._retried = true;
        const refreshed = await refreshToken();
        if (refreshed) {
          original.headers.Authorization = `Bearer ${refreshed}`;
          return client(original);
        }
        onSessionExpired?.();
      }

      return Promise.reject(toApiError(error, "Something went wrong. Please try again."));
    },
  );

  return client;
}

const api = createClient(20000);
export const uploadApi = createClient(120000);

// One refresh at a time, shared by every request that hit a 401 together.
let refreshing = null;
async function refreshToken() {
  if (!refreshing) {
    refreshing = (async () => {
      const token = await getToken();
      if (!token) return null;
      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, null, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          timeout: 15000,
        });
        const fresh = data?.data?.access_token;
        if (fresh) await saveToken(fresh);
        return fresh || null;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/** The API wraps everything in { success, message, data }. */
export const unwrap = (response) => response.data?.data;
export const message = (response) => response.data?.message;

export default api;

import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export const NOTIFY_URL = import.meta.env.VITE_NOTIFY_URL || "http://localhost:5000/api";

export function clearAuth() {
  ["hms_access", "hms_refresh", "hms_user"].forEach((k) => localStorage.removeItem(k));
}

function makeClient(baseURL) {
  const client = axios.create({ baseURL });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("hms_access");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // On 401, try one silent token refresh, then retry the original request.
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;
      const refresh = localStorage.getItem("hms_refresh");
      const isAuthCall = original?.url?.includes("/auth/");
      if (error.response?.status === 401 && refresh && original && !original._retry && !isAuthCall) {
        original._retry = true;
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
          localStorage.setItem("hms_access", data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return client(original);
        } catch {
          clearAuth();
          window.location.assign("/login");
        }
      }
      return Promise.reject(error);
    }
  );
  return client;
}

export const api = makeClient(API_URL);
export const notify = makeClient(NOTIFY_URL);

/** Turn any axios error into one readable sentence for the UI. */
export function errorMessage(err) {
  if (!err.response) return "Cannot reach the server. Check your connection and try again.";
  const data = err.response.data;
  if (!data || data instanceof Blob || typeof data === "string") return "Something went wrong. Please try again.";
  if (data.detail) return data.detail;
  return Object.entries(data)
    .map(([key, value]) => {
      const text = [].concat(value).join(" ");
      return key === "non_field_errors" ? text : `${key.replace(/_/g, " ")}: ${text}`;
    })
    .join("; ");
}

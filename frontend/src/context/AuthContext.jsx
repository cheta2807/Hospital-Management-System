import { createContext, useContext, useState } from "react";
import { api, clearAuth } from "../api/client";

const AuthContext = createContext(null);

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("hms_user") || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login/", { username, password });
    localStorage.setItem("hms_access", data.access);
    localStorage.setItem("hms_refresh", data.refresh);
    localStorage.setItem("hms_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

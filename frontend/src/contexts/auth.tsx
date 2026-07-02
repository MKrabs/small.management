import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { User } from "@/api/types";

type AuthCtx = {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  getSessionToken: (activityId: string) => string | null;
  setSessionToken: (activityId: string, token: string) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

const SESSION_KEY = (id: string) => `session_${id}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));

  const login = useCallback((u: User, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("token", t);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }, []);

  const getSessionToken = useCallback(
    (activityId: string) => localStorage.getItem(SESSION_KEY(activityId)),
    [],
  );

  const setSessionToken = useCallback((activityId: string, t: string) => {
    localStorage.setItem(SESSION_KEY(activityId), t);
  }, []);

  return (
    <Ctx.Provider value={{ user, token, login, logout, getSessionToken, setSessionToken }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

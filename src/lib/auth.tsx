"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type User = {
  id: string;
  email: string;
  isCreator: boolean;
};

export type AuthResult = { ok: true } | { ok: false; error: string };

type AuthContextType = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<AuthResult>;
  register: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  setCreatorMode: (isCreator: boolean) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const KEY = "loopa_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
    setReady(true);
  }, []);

  async function login(email: string, password: string, remember = true): Promise<AuthResult> {
    if (!email.trim() || !password) return { ok: false, error: "Missing credentials" };

    const fakeUser: User = {
      id: crypto.randomUUID(),
      email: email.trim(),
      isCreator: false,
    };

    setUser(fakeUser);
    if (remember) localStorage.setItem(KEY, JSON.stringify(fakeUser));

    return { ok: true };
  }

  async function register(email: string, password: string): Promise<AuthResult> {
    if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters" };
    // demo register -> auto login
    return login(email, password, true);
  }

  async function logout() {
    setUser(null);
    localStorage.removeItem(KEY);
  }

  function setCreatorMode(isCreator: boolean) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, isCreator };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }

  const value = useMemo<AuthContextType>(
    () => ({ user, ready, login, register, logout, setCreatorMode }),
    [user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
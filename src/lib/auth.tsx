"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UserRole = "buyer" | "creator";

export type User = {
  id: string;
  email: string;

  /** ✅ New: future-proof role */
  role: UserRole;

  /** ✅ Back-compat alias (do not persist as source-of-truth) */
  isCreator: boolean;
};

export type AuthResult = { ok: true } | { ok: false; error: string };

type AuthContextType = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<AuthResult>;
  register: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;

  /** ✅ Preferred API going forward */
  setRole: (role: UserRole) => void;

  /** ✅ Back-compat API */
  setCreatorMode: (isCreator: boolean) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const KEY = "loopa_user";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeStoredUser(raw: any): User | null {
  if (!raw || typeof raw !== "object") return null;

  const id = String(raw.id ?? "").trim();
  const email = String(raw.email ?? "").trim();
  if (!id || !email) return null;

  // accept either role or legacy isCreator
  const role: UserRole =
    raw.role === "creator" || raw.isCreator === true ? "creator" : "buyer";

  return {
    id,
    email,
    role,
    isCreator: role === "creator",
  };
}

function makeUser(id: string, email: string, role: UserRole): User {
  return {
    id,
    email,
    role,
    isCreator: role === "creator",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = safeParse<any>(localStorage.getItem(KEY));
    const normalized = normalizeStoredUser(stored);
    setUser(normalized);
    setReady(true);
  }, []);

  async function login(email: string, password: string, remember = true): Promise<AuthResult> {
    const e = email.trim();
    if (!e || !password) return { ok: false, error: "Missing credentials" };

    // ✅ If we already have a stored user with same email, reuse id + role
    const stored = normalizeStoredUser(safeParse<any>(localStorage.getItem(KEY)));
    if (stored && stored.email.toLowerCase() === e.toLowerCase()) {
      setUser(stored);
      if (remember) localStorage.setItem(KEY, JSON.stringify(stored));
      return { ok: true };
    }

    const newUser = makeUser(crypto.randomUUID(), e, "buyer");

    setUser(newUser);
    if (remember) localStorage.setItem(KEY, JSON.stringify(newUser));

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

  function setRole(role: UserRole) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = makeUser(prev.id, prev.email, role);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }

  function setCreatorMode(isCreator: boolean) {
    setRole(isCreator ? "creator" : "buyer");
  }

  const value = useMemo<AuthContextType>(
    () => ({ user, ready, login, register, logout, setRole, setCreatorMode }),
    [user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
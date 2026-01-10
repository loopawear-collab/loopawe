"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =======================
   TYPES
======================= */

export type User = {
  id: string;
  email: string;
  isCreator: boolean;
};

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string };

type AuthContextType = {
  user: User | null;
  ready: boolean;
  login: (
    email: string,
    password: string,
    remember?: boolean
  ) => Promise<AuthResult>;
  register: (
    email: string,
    password: string
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

/* =======================
   CONTEXT
======================= */

const AuthContext = createContext<AuthContextType | null>(null);

/* =======================
   PROVIDER
======================= */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("loopa_user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setReady(true);
  }, []);

  async function login(
    email: string,
    password: string,
    remember = true
  ): Promise<AuthResult> {
    if (!email || !password) {
      return { ok: false, error: "Missing credentials" };
    }

    const fakeUser: User = {
      id: crypto.randomUUID(),
      email,
      isCreator: false,
    };

    setUser(fakeUser);

    if (remember) {
      localStorage.setItem("loopa_user", JSON.stringify(fakeUser));
    }

    return { ok: true };
  }

  async function register(
    email: string,
    password: string
  ): Promise<AuthResult> {
    if (password.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters" };
    }

    return login(email, password, true);
  }

  async function logout() {
    setUser(null);
    localStorage.removeItem("loopa_user");
  }

  const value = useMemo(
    () => ({
      user,
      ready,
      login,
      register,
      logout,
    }),
    [user, ready]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* =======================
   HOOK
======================= */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
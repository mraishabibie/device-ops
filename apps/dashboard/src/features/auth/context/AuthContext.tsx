"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setAccessToken, setCookie, eraseCookie, getCookie } from "@/lib/api-client";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  companyId: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Fetch the current authenticated user profile from the API */
async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await apiFetch("/api/v1/users/me");
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      role: data.role,
      companyId: data.company_id,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On initial mount, attempt token restoration from cookie
  useEffect(() => {
    async function restoreSession() {
      const refreshToken = getCookie("deviceops_refresh_token");
      if (!refreshToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiFetch("/api/v1/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (response.ok) {
          const data = await response.json();
          setAccessToken(data.access_token);
          // Fetch real user profile from API
          const currentUser = await fetchCurrentUser();
          setUser(currentUser);
          if (!currentUser) {
            eraseCookie("deviceops_refresh_token");
            setAccessToken("");
          }
        } else {
          eraseCookie("deviceops_refresh_token");
          setAccessToken("");
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to restore session on boot:", err);
        eraseCookie("deviceops_refresh_token");
        setAccessToken("");
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiFetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(errData.detail || "Incorrect email or password");
    }

    const data = await response.json();

    // Store access token in-memory
    setAccessToken(data.access_token);

    // Store refresh token as a cookie (7 day expiry)
    setCookie("deviceops_refresh_token", data.refresh_token, 7);

    // Fetch real user profile from API
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);

    router.push("/dashboard");
  };

  const logout = () => {
    eraseCookie("deviceops_refresh_token");
    setAccessToken("");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

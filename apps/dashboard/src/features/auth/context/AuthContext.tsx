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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On initial mount, attempt token restoration
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (response.ok) {
          const data = await response.json();
          // Access token stored in memory
          setAccessToken(data.access_token);
          
          // Parse user payload from JWT token to populate local state
          const tokenParts = data.access_token.split(".");
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            // Setup a mock user payload containing the ID extracted from token subject
            setUser({
              id: payload.sub,
              email: "admin@deviceops.net", // Fallback info, can query user details endpoint if added
              fullName: "Administrator",
              role: "ADMIN",
              companyId: "mock-company-id",
            });
          }
        } else {
          // Token is invalid/expired
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(errData.detail || "Incorrect email or password");
    }

    const data = await response.json();
    
    // Store access token in-memory
    setAccessToken(data.access_token);
    
    // Store refresh token in a secure client cookie (7 days expiry)
    setCookie("deviceops_refresh_token", data.refresh_token, 7);

    // Decode user details from the JWT
    const tokenParts = data.access_token.split(".");
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      setUser({
        id: payload.sub,
        email: email,
        fullName: "Administrator",
        role: "ADMIN",
        companyId: "mock-company-id",
      });
    }

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

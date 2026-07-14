// In-memory storage for the short-lived access token
let accessTokenInMemory = "";

export function setAccessToken(token: string) {
  accessTokenInMemory = token;
}

export function getAccessToken(): string {
  return accessTokenInMemory;
}

// Client-side cookie utility helpers
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

export function setCookie(name: string, value: string, days: number) {
  if (typeof window === "undefined") return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = `${name}=${value || ""}${expires}; path=/; SameSite=Strict; Secure`;
}

export function eraseCookie(name: string) {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict; Secure`;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function apiFetch(path: string, options: FetchOptions = {}): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const headers = { ...options.headers };

  // Append in-memory Access Token if available
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // Handle Token Refresh logic on 401 Unauthorized response
  if (response.status === 401 && !path.includes("/auth/login") && !path.includes("/auth/refresh")) {
    const refreshToken = getCookie("deviceops_refresh_token");
    
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          // Store new access token in-memory
          setAccessToken(data.access_token);
          
          // Re-attempt original request with the new access token
          headers["Authorization"] = `Bearer ${data.access_token}`;
          return await fetch(url, { ...options, headers });
        }
      } catch (err) {
        console.error("API client automatic token refresh failed:", err);
      }
    }
    
    // Clear credentials and route to login if refresh fails
    eraseCookie("deviceops_refresh_token");
    setAccessToken("");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return response;
}

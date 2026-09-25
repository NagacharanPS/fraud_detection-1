import React, { createContext, useContext, useState, useEffect } from "react";
import API from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("payguard_user_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("payguard_auth_token") || null);
  const [loading, setLoading] = useState(true);

  // Synchronize and verify session on initial load
  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await API.get("/api/auth/me");
          if (res.data && res.data.user_id) {
            setUser(res.data);
            localStorage.setItem("payguard_user_session", JSON.stringify(res.data));
          }
        } catch (err) {
          console.warn("Session check failed, using stored local session:", err);
        }
      } else {
        // Auto-login to Rahul Sharma as demo initial session if fresh session
        try {
          const res = await API.get("/api/auth/me?account_id=A0001");
          if (res.data) {
            setUser(res.data);
            localStorage.setItem("payguard_user_session", JSON.stringify(res.data));
          }
        } catch (e) {
          console.error("Could not fetch default user profile:", e);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (emailOrPhone, password) => {
    const res = await API.post("/api/auth/login", {
      email_or_phone: emailOrPhone,
      password: password,
    });
    if (res.data && res.data.token) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem("payguard_auth_token", res.data.token);
      localStorage.setItem("payguard_user_session", JSON.stringify(res.data.user));
      return res.data;
    }
    throw new Error(res.data?.error || "Login failed");
  };

  const signup = async (formData) => {
    const res = await API.post("/api/auth/signup", formData);
    if (res.data && res.data.token) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem("payguard_auth_token", res.data.token);
      localStorage.setItem("payguard_user_session", JSON.stringify(res.data.user));
      return res.data;
    }
    throw new Error(res.data?.error || "Signup failed");
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("payguard_auth_token");
    localStorage.removeItem("payguard_user_session");
  };

  const switchAccount = async (targetUserIdOrAccount) => {
    try {
      const res = await API.get(`/api/auth/me?user_id=${targetUserIdOrAccount}&account_id=${targetUserIdOrAccount}`);
      if (res.data) {
        setUser(res.data);
        localStorage.setItem("payguard_user_session", JSON.stringify(res.data));
      }
    } catch (e) {
      console.error("Failed to switch persona:", e);
    }
  };

  const refreshBalance = async () => {
    if (user?.account_id) {
      try {
        const res = await API.get(`/api/balance/${user.account_id}`);
        if (res.data?.current_balance !== undefined) {
          setUser((prev) => {
            if (!prev) return prev;
            const updated = {
              ...prev,
              account: {
                ...prev.account,
                current_balance: res.data.current_balance,
              },
            };
            localStorage.setItem("payguard_user_session", JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        console.error("Error refreshing balance:", err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        signout: logout,
        switchAccount,
        refreshBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

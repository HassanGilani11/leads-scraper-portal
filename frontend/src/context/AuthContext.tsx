"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, AuthResponse } from "@/types";
import { getStoredToken, setStoredToken, loginUser, getCurrentUser } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<AuthResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      router.push("/login");
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      setToken(currentToken);
      const profile = await getCurrentUser();
      setUser(profile);
    } catch (err) {
      console.warn("Failed to validate session token:", err);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();

    // Listen for unauthorized 401 events across fetch calls
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [refreshUser, logout]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await loginUser(email, pass);
      setToken(res.access_token);
      setUser(res.user);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = user?.role === "admin";
  const isMember = user?.role === "admin" || user?.role === "member";
  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isMember,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

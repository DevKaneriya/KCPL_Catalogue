import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: any | null;
  token: string | null;
  login: (token: string, user: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== "undefined" ? localStorage.getItem("kcpl_token") : null;
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If we have a token but no user, we could fetch /api/auth/me here
    // For now we just check token existence for basic auth gating
  }, [token]);

  const login = (newToken: string, userData: any) => {
    localStorage.setItem("kcpl_token", newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("kcpl_token");
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
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

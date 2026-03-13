import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

interface UserData {
  id: number;
  username: string;
  email: string;
  roleId: number | null;
  roleName: string | null;
  isActive: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  login: (token: string, user: UserData) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== "undefined" ? localStorage.getItem("kcpl_token") : null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem("kcpl_token");
    if (storedToken) {
      fetch(`/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Session expired");
          return res.json();
        })
        .then((data: UserData) => {
          setUser(data);
          setToken(storedToken);
        })
        .catch(() => {
          localStorage.removeItem("kcpl_token");
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, userData: UserData) => {
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
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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

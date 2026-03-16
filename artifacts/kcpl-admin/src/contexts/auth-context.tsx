import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface UserData {
  id: number;
  username: string;
  email: string;
  roleId: number | null;
  roleName: string | null;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  login: (token: string, user: UserData) => void;
  logout: () => void;
  isLoading: boolean;
  checkPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_TOKEN_KEY = "kcpl_token";
const STORAGE_USER_KEY = "kcpl_user";

const readStoredUser = (): UserData | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.id !== "number" || typeof parsed.username !== "string") return null;
    return parsed as UserData;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== "undefined" ? localStorage.getItem(STORAGE_TOKEN_KEY) : null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = typeof window !== "undefined" ? localStorage.getItem(STORAGE_TOKEN_KEY) : null;
    const storedUser = readStoredUser();
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    // Attempt to refresh token first (extends TTL). If refresh fails, fall back to /auth/me
    (async () => {
      let hardLogout = false;
      try {
        const refreshRes = await fetch(`/api/auth/refresh`, {
          method: "POST",
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        let activeToken = storedToken;
        if (refreshRes.ok) {
          const json = await refreshRes.json();
          if (json?.token) {
            activeToken = json.token;
            localStorage.setItem(STORAGE_TOKEN_KEY, activeToken);
            setToken(activeToken);
          }
        }

        // Validate and load user with whichever token we have
        const meRes = await fetch(`/api/auth/me`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (meRes.ok) {
          const data: UserData = await meRes.json();
          console.log("[AUTH CONTEXT] user data loaded:", data);
          setUser(data);
          setToken(activeToken);
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data));
          return;
        }

        // Only clear session on hard auth failures
        if (meRes.status === 401 || meRes.status === 403) {
          hardLogout = true;
          throw new Error("Session invalid");
        }

        // On transient server errors, keep any previously stored user/token
        if (storedUser) {
          setUser(storedUser);
          setToken(activeToken);
          return;
        }
        throw new Error("Session validation failed");
      } catch (e) {
        if (!hardLogout && storedUser) {
          setUser(storedUser);
          setToken(storedToken);
        } else {
          localStorage.removeItem(STORAGE_TOKEN_KEY);
          localStorage.removeItem(STORAGE_USER_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = (newToken: string, userData: UserData) => {
    localStorage.setItem(STORAGE_TOKEN_KEY, newToken);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  const checkPermission = (permission: string) => {
    if (!user) return false;
    // Admins have all permissions
    if (user.roleName?.toLowerCase() === "admin") return true;
    
    // Ensure permissions is an array before checking
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    return perms.includes(permission);
  };

  if (typeof window !== 'undefined') {
    (window as any).authDebug = { user, token };
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, checkPermission }}>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      ) : (
        children
      )}
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

// Helper component to protect routes. Wrap protected pages with <RequireAuth>.
export function RequireAuth({ children }: { children: any }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) return null; // or a loader
  if (!user) {
    setLocation("/login");
    return null;
  }
  return children;
}

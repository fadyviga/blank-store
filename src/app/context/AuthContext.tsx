"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "user";
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<string | null>;
  register: (email: string, password: string, rememberMe?: boolean) => Promise<string | null>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface StoredUser {
  id: string;
  email: string;
  password: string;
  role: "admin" | "user";
}

function getUsers(): StoredUser[] {
  try {
    const data = localStorage.getItem("blank_users");
    const users = data ? JSON.parse(data) : [];
    return Array.isArray(users)
      ? users.map((u: any) => ({ ...u, role: u.role || "user" }))
      : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem("blank_users", JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("blank_session") || localStorage.getItem("blank_session");
      if (raw) {
        const session = JSON.parse(raw);
        if (session && session.email && session.id) {
          setUser({ id: session.id, email: session.email, role: session.role || "user" });
        }
      }
    } catch {
      sessionStorage.removeItem("blank_session");
      localStorage.removeItem("blank_session");
    }
    setLoading(false);
  }, []);

  const saveSession = useCallback(
    (session: { id: string; email: string; role: "admin" | "user" }, rememberMe: boolean) => {
      const raw = JSON.stringify(session);
      if (rememberMe) {
        localStorage.setItem("blank_session", raw);
        sessionStorage.removeItem("blank_session");
      } else {
        sessionStorage.setItem("blank_session", raw);
        localStorage.removeItem("blank_session");
      }
    },
    []
  );

  const login = useCallback(
    async (email: string, password: string, rememberMe?: boolean): Promise<string | null> => {
      const users = getUsers();
      const found = users.find(
        (u) => u.email === email.toLowerCase().trim()
      );
      if (!found) return "No account found with this email";
      if (found.password !== password) return "Incorrect password";

      const session = { id: found.id, email: found.email, role: found.role };
      saveSession(session, rememberMe ?? true);
      setUser(session);
      return null;
    },
    [saveSession]
  );

  const register = useCallback(
    async (email: string, password: string, rememberMe?: boolean): Promise<string | null> => {
      const users = getUsers();
      const normalizedEmail = email.toLowerCase().trim();

      if (users.find((u) => u.email === normalizedEmail)) {
        return "An account with this email already exists";
      }

      const isFirstUser = users.length === 0;
      const role = isFirstUser ? "admin" : "user";

      const newUser: StoredUser = {
        id: generateId(),
        email: normalizedEmail,
        password,
        role,
      };

      saveUsers([...users, newUser]);

      const session = { id: newUser.id, email: newUser.email, role: newUser.role };
      saveSession(session, rememberMe ?? true);
      setUser(session);
      return null;
    },
    [saveSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("blank_session");
    sessionStorage.removeItem("blank_session");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

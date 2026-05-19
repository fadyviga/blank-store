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
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string) => Promise<string | null>;
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
}

function getUsers(): StoredUser[] {
  try {
    const data = localStorage.getItem("blank_users");
    return data ? JSON.parse(data) : [];
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
      const raw = localStorage.getItem("blank_session");
      if (raw) {
        const session = JSON.parse(raw);
        if (session && session.email && session.id) {
          setUser({ id: session.id, email: session.email });
        }
      }
    } catch {
      localStorage.removeItem("blank_session");
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const users = getUsers();
      const found = users.find(
        (u) => u.email === email.toLowerCase().trim()
      );
      if (!found) return "No account found with this email";
      if (found.password !== password) return "Incorrect password";

      const session = { id: found.id, email: found.email };
      localStorage.setItem("blank_session", JSON.stringify(session));
      setUser(session);
      return null;
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const users = getUsers();
      const normalizedEmail = email.toLowerCase().trim();

      if (users.find((u) => u.email === normalizedEmail)) {
        return "An account with this email already exists";
      }

      const newUser: StoredUser = {
        id: generateId(),
        email: normalizedEmail,
        password,
      };

      saveUsers([...users, newUser]);

      const session = { id: newUser.id, email: newUser.email };
      localStorage.setItem("blank_session", JSON.stringify(session));
      setUser(session);
      return null;
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("blank_session");
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

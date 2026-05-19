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
  phone?: string;
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<string | null>;
  register: (email: string, password: string, phone?: string, rememberMe?: boolean) => Promise<string | null>;
  logout: () => void;
  isAuthenticated: boolean;
  updateProfile: (data: { name?: string; phone?: string }) => string | null;
  changePassword: (currentPassword: string, newPassword: string) => string | null;
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
  phone?: string;
  name?: string;
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
          const users = getUsers();
          const stored = users.find((u) => u.id === session.id);
          setUser({
            id: session.id,
            email: session.email,
            role: session.role || "user",
            phone: stored?.phone || session.phone || "",
            name: stored?.name || session.name || "",
          });
        }
      }
    } catch {
      sessionStorage.removeItem("blank_session");
      localStorage.removeItem("blank_session");
    }
    setLoading(false);
  }, []);

  const saveSession = useCallback(
    (session: { id: string; email: string; role: "admin" | "user"; phone?: string }, rememberMe: boolean) => {
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

      const session = { id: found.id, email: found.email, role: found.role, phone: found.phone, name: found.name };
      saveSession(session, rememberMe ?? true);
      setUser(session);
      return null;
    },
    [saveSession]
  );

  const register = useCallback(
    async (email: string, password: string, phone?: string, rememberMe?: boolean): Promise<string | null> => {
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
        phone: phone || "",
      };

      saveUsers([...users, newUser]);

      const session = { id: newUser.id, email: newUser.email, role: newUser.role, phone: newUser.phone };
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

  const updateProfile = useCallback(
    (data: { name?: string; phone?: string }): string | null => {
      if (!user) return "Not authenticated";
      const users = getUsers();
      const index = users.findIndex((u) => u.id === user.id);
      if (index === -1) return "User not found";
      if (data.phone !== undefined) users[index].phone = data.phone;
      if (data.name !== undefined) users[index].name = data.name;
      saveUsers(users);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              phone: users[index].phone || "",
              name: users[index].name || "",
            }
          : prev
      );
      return null;
    },
    [user]
  );

  const changePassword = useCallback(
    (currentPassword: string, newPassword: string): string | null => {
      if (!user) return "Not authenticated";
      if (newPassword.length < 4) return "New password must be at least 4 characters";
      const users = getUsers();
      const index = users.findIndex((u) => u.id === user.id);
      if (index === -1) return "User not found";
      if (users[index].password !== currentPassword) return "Current password is incorrect";
      users[index].password = newPassword;
      saveUsers(users);
      return null;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        updateProfile,
        changePassword,
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

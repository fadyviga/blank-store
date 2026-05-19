"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

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
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, phone?: string) => Promise<string | null>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<string | null>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthUser(sbUser: SupabaseUser | null, profile?: any): AuthUser | null {
  if (!sbUser) return null;
  return {
    id: sbUser.id,
    email: sbUser.email || "",
    role: profile?.role || "user",
    phone: profile?.phone || "",
    name: profile?.name || "",
  };
}

async function fetchProfile(userId: string) {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(toAuthUser(session.user, profile));
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setUser(toAuthUser(session.user, profile));
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!supabase) return "Supabase is not configured";
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          return "Invalid email or password";
        }
        return error.message;
      }
      return null;
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, phone?: string): Promise<string | null> => {
      if (!supabase) return "Supabase is not configured";

      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) return error.message;
      if (!data?.user) return "Signup failed. Please try again.";

      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email || email.toLowerCase().trim(),
        phone: phone || "",
      });

      if (profileErr) return profileErr.message;

      setUser({
        id: data.user.id,
        email: data.user.email || email.toLowerCase().trim(),
        role: "user",
        phone: phone || "",
        name: "",
      });

      return null;
    },
    []
  );

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (data: { name?: string; phone?: string }): Promise<string | null> => {
      if (!supabase) return "Supabase is not configured";
      if (!user) return "Not authenticated";
      const updates: Record<string, string> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.phone !== undefined) updates.phone = data.phone;
      if (Object.keys(updates).length === 0) return null;
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (error) return error.message;
      setUser((prev) => (prev ? { ...prev, ...updates } : prev));
      return null;
    },
    [user]
  );

  const changePassword = useCallback(
    async (_currentPassword: string, newPassword: string): Promise<string | null> => {
      if (!supabase) return "Supabase is not configured";
      if (newPassword.length < 6) return "New password must be at least 6 characters";
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return error.message;
      return null;
    },
    []
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

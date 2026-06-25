import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: "client" | "provider" | "admin";
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const DEFAULT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuASeFjj4zmjKTScJ6eC5oK98Kbx_xVihuV3AqPVnRf9UN7x2NFOH-fqwbFPuoyIFbzwg_rNiE4Qp0PrRIhwLCXLmle6Iv9TJx3ZP8zRBep_hGMQtJQwg5wx3_anyk9xnTLnn583duE8OzqkvCJ5-adDiIWHGPMpWaWOpT46E_QWb7ZgLQER9-0O4CtRAbds5fSwhlBpPMewn8dPny1h2we18fc1j63yVFBgagMNajj1vDrQcW5VFXWDtx7ROPD_NKUlMnnF5I2xQOQ";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Web AuthContext bilan bir xil rol normalizatsiyasi.
  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      const fullName = profile?.full_name || "";
      const dbRole = (profile?.role || "client").toLowerCase();
      const role: User["role"] =
        dbRole === "admin"
          ? "admin"
          : dbRole === "provider" ||
            dbRole === "specialist" ||
            dbRole === "partner"
          ? "provider"
          : "client";

      setUser({
        id: userId,
        name: fullName || email.split("@")[0],
        email,
        avatar: profile?.avatar_url || DEFAULT_AVATAR,
        role,
      });
      setIsAuthenticated(true);
    } catch (e) {
      console.error("Error fetching profile", e);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchProfile(session.user.id, session.user.email || "");
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user.id, session.user.email || "");
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const register = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return error ? { error: error.message } : {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user.email);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, loading, login, register, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureProfile = async (currentUser: User) => {
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Failed to load profile:", fetchError.message);
      return;
    }

    if (existingProfile) return;

    const fallbackName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split("@")[0] ||
      null;

    const { error: insertError } = await supabase.from("profiles").insert({
      user_id: currentUser.id,
      full_name: fallbackName,
    });

    if (insertError) {
      console.error("Failed to create profile:", insertError.message);
    }
  };

  const syncAuthState = async (nextSession: Session | null) => {
    if (!nextSession) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return null;
    }

    if (!nextSession.user) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return null;
    }

    setSession(nextSession);
    setUser(nextSession.user);
    setLoading(false);

    await ensureProfile(nextSession.user);

    return nextSession.user;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncAuthState(nextSession);
    });

    void supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      void syncAuthState(existingSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
        data: {
          full_name: email.split("@")[0],
        },
      },
    });

    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;

    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut().catch(() => undefined);
      throw new Error("Please verify your email before signing in.");
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshUser = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    return syncAuthState(currentSession);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

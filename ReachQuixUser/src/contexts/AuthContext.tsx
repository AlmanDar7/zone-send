import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { api } from "@/lib/api";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { isFirebaseConfigured } from "@/integrations/firebase/config";
import {
  completeRedirectSignIn,
  mapFirebaseUser,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  signUpWithEmail,
  reloadCurrentUser,
} from "@/lib/firebaseAuth";
import type { AppUser } from "@/types/auth";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<AppUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureProfile = async (currentUser: AppUser) => {
    try {
      const existingProfile = await api.profile.get();
      if (existingProfile) return;

      const fallbackName =
        currentUser.displayName ||
        currentUser.user_metadata?.full_name ||
        currentUser.email?.split("@")[0] ||
        null;

      await api.profile.save({
        full_name: fallbackName,
      });
    } catch (err: any) {
      console.error("Failed to ensure profile:", err?.message || err);
    }
  };

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    let unsubscribe = () => {};

    void (async () => {
      try {
        await completeRedirectSignIn();
      } catch (err) {
        console.error("Google redirect sign-in failed:", err);
      }

      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        const nextUser = firebaseUser ? mapFirebaseUser(firebaseUser) : null;
        setUser(nextUser);
        setLoading(false);

        if (nextUser) {
          window.setTimeout(() => {
            void ensureProfile(nextUser);
          }, 0);
        }
      });
    })();

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const appUser = await signUpWithEmail(email, password);
    setUser(appUser);
  };

  const signIn = async (email: string, password: string) => {
    const appUser = await signInWithEmail(email, password);
    if (!appUser.emailVerified) {
      await signOutUser();
      throw new Error("Please verify your email before signing in.");
    }
    setUser(appUser);
  };

  const signInWithGoogleHandler = async () => {
    const appUser = await signInWithGoogle();
    if (appUser) {
      setUser(appUser);
      await ensureProfile(appUser);
    }
  };

  const signOut = async () => {
    await signOutUser();
    setUser(null);
  };

  const refreshUser = async () => {
    const refreshed = await reloadCurrentUser();
    setUser(refreshed);
    return refreshed;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signInWithGoogle: signInWithGoogleHandler,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

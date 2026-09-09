import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  updatePassword,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, getFirebaseApp } from "@/integrations/firebase/client";
import { isFirebaseConfigured } from "@/integrations/firebase/config";
import { api } from "@/lib/api";
import type { AppUser } from "@/types/auth";

async function sendVerificationViaBackend() {
  try {
    const result = await api.auth.sendVerification();
    return result?.success === true;
  } catch {
    return false;
  }
}

async function sendVerificationViaFirebase(user: FirebaseUser) {
  await sendEmailVerification(user, {
    url: `${window.location.origin}/verify-email`,
  });
}

function requireFirebaseAuth() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Add VITE_FIREBASE_* variables to your .env file (see .env.example).",
    );
  }
  getFirebaseApp();
  return getFirebaseAuth();
}

export function mapFirebaseUser(firebaseUser: FirebaseUser): AppUser {
  const providerIds = firebaseUser.providerData.map((p) => p.providerId).filter(Boolean);
  const displayName =
    firebaseUser.displayName ||
    firebaseUser.providerData.find((p) => p.displayName)?.displayName ||
    null;

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    emailVerified: firebaseUser.emailVerified,
    displayName,
    user_metadata: {
      full_name: displayName ?? undefined,
      name: displayName ?? undefined,
      email_verified: firebaseUser.emailVerified,
    },
    app_metadata: {
      providers: providerIds.length > 0 ? providerIds : ["password"],
    },
  };
}

export async function signUpWithEmail(email: string, password: string) {
  const auth = requireFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const name = email.split("@")[0];

  await updateProfile(credential.user, { displayName: name }).catch(() => undefined);

  const sentViaBackend = await sendVerificationViaBackend();
  if (!sentViaBackend) {
    await sendVerificationViaFirebase(credential.user);
  }

  return mapFirebaseUser(credential.user);
}

export async function signInWithEmail(email: string, password: string) {
  const auth = requireFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return mapFirebaseUser(credential.user);
}

export async function signInWithGoogle() {
  const auth = requireFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithRedirect(auth, provider);
}

export async function checkRedirectResult() {
  const auth = getFirebaseAuth();
  const result = await getRedirectResult(auth);
  return result ? mapFirebaseUser(result.user) : null;
}

export async function signOutUser() {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export async function sendVerificationEmail() {
  const auth = requireFirebaseAuth();
  if (!auth.currentUser) throw new Error("You must be signed in to resend verification email.");
  const sentViaBackend = await sendVerificationViaBackend();
  if (!sentViaBackend) {
    await sendVerificationViaFirebase(auth.currentUser);
  }
}

export async function reloadCurrentUser(): Promise<AppUser | null> {
  const auth = getFirebaseAuth();
  const current = auth.currentUser;
  if (!current) return null;
  await current.reload();
  return mapFirebaseUser(current);
}

export async function requestPasswordReset(email: string) {
  const auth = requireFirebaseAuth();
  await sendPasswordResetEmail(auth, email.trim(), {
    url: `${window.location.origin}/reset-password`,
  });
}

export async function updateUserPassword(newPassword: string) {
  const auth = requireFirebaseAuth();
  if (!auth.currentUser) throw new Error("You must be signed in to change your password.");
  await updatePassword(auth.currentUser, newPassword);
}

export async function updateUserProfile(data: { displayName?: string }) {
  const auth = requireFirebaseAuth();
  if (!auth.currentUser) throw new Error("You must be signed in to update your profile.");
  await updateProfile(auth.currentUser, data);
  await auth.currentUser.reload();
}

export async function deleteFirebaseUser() {
  const auth = getFirebaseAuth();
  if (!auth.currentUser) return;
  await deleteUser(auth.currentUser);
}

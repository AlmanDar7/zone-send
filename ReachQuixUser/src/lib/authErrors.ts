/** Map Supabase / OAuth errors to actionable messages for the UI. */
export function getOAuthErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error ?? "");

  const lower = raw.toLowerCase();

  if (lower.includes("popup-closed") || lower.includes("cancelled-popup")) {
    return "Google sign-in was cancelled.";
  }

  if (lower.includes("firebase is not configured")) {
    return raw;
  }

  if (lower.includes("auth/unauthorized-domain")) {
    return "This domain is not authorized for Firebase. Add localhost in Firebase → Authentication → Settings → Authorized domains.";
  }

  if (lower.includes("auth/operation-not-allowed")) {
    return "This sign-in method is disabled in Firebase. Enable Email/Password or Google under Authentication → Sign-in method.";
  }

  if (lower.includes("access_denied") || lower.includes("cancelled")) {
    return "Google sign-in was cancelled.";
  }

  return raw.trim() || "Google sign in failed. Please try again.";
}

export function getOAuthErrorFromUrl(url: URL): string | null {
  const description = url.searchParams.get("error_description");
  const error = url.searchParams.get("error");
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const hashError = hashParams.get("error_description") || hashParams.get("error");

  const combined = description || hashError || error;
  if (!combined) return null;

  try {
    return getOAuthErrorMessage(new Error(decodeURIComponent(combined.replace(/\+/g, " "))));
  } catch {
    return getOAuthErrorMessage(new Error(combined));
  }
}

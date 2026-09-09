/** Map Firebase / OAuth errors to actionable messages for the UI. */
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

  if (lower.includes("popup-blocked")) {
    return "Google sign-in popup was blocked. Allow popups for this site and try again.";
  }

  if (lower.includes("firebase is not configured")) {
    return raw;
  }

  if (lower.includes("auth/unauthorized-domain")) {
    return "This domain is not authorized. Please add user.reachquix.com to Firebase Console → Authentication → Settings → Authorized domains.";
  }

  if (lower.includes("auth/network-request-failed") || lower.includes("network-request-failed")) {
    return "Network request blocked. If using Brave or an adblocker, disable Shields for this site and verify user.reachquix.com is in Firebase Authorized Domains.";
  }

  if (lower.includes("auth/operation-not-allowed")) {
    return "This sign-in method is disabled in Firebase. Enable Google under Authentication → Sign-in method in Firebase Console.";
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

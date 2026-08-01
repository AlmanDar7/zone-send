const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export function getFirebaseConfig() {
  const missing = Object.entries({
    VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
    VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
    VITE_FIREBASE_APP_ID: firebaseConfig.appId,
  }).filter(([, value]) => !value?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured. Add ${missing.map(([key]) => key).join(", ")} to your .env file.`,
    );
  }

  return firebaseConfig;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey?.trim() &&
      firebaseConfig.authDomain?.trim() &&
      firebaseConfig.projectId?.trim() &&
      firebaseConfig.appId?.trim(),
  );
}

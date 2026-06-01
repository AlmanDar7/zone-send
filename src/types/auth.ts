/** App user shape used across the UI (backed by Firebase Auth). */
export type AppUser = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
    email_verified?: boolean;
  };
  app_metadata?: {
    providers?: string[];
  };
};

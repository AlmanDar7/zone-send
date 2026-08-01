import { getFirebaseAuth } from "@/integrations/firebase/client";

export async function getAccessToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

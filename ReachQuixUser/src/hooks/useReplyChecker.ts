import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Periodically polls for email activity and dashboard freshness
 * Runs in the background when the user is logged in.
 */
export function useReplyChecker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkUpdates = async () => {
      // Invalidate relevant queries periodically
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["email-queue"] });
    };

    // Every 2 minutes
    intervalRef.current = setInterval(checkUpdates, 2 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, queryClient]);
}

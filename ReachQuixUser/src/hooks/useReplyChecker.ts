import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Automatically checks for email replies every 5 minutes
 * by calling the check-replies edge function.
 * Runs in the background when the user is logged in.
 */
export function useReplyChecker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkReplies = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-replies", {
          body: {},
        });
        if (error) {
          console.error("Reply check error:", error);
          return;
        }
        if (data?.repliesDetected > 0) {
          console.log(`Auto-detected ${data.repliesDetected} replies`);
          // Refresh all relevant queries
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
          queryClient.invalidateQueries({ queryKey: ["contacts-count"] });
          queryClient.invalidateQueries({ queryKey: ["replies-count"] });
          queryClient.invalidateQueries({ queryKey: ["recent-contacts"] });
        }
      } catch (err) {
        console.error("Reply checker failed:", err);
      }
    };

    // Run immediately on mount
    checkReplies();

    // Then every 5 minutes
    intervalRef.current = setInterval(checkReplies, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, queryClient]);
}

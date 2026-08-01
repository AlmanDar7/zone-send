import { supabase } from "@/integrations/supabase/client";
import { getSupabaseFunctionErrorMessage } from "@/lib/supabaseFunctionErrors";

const DEFAULT_QUEUE_WAIT_MS = 2500;

type QueueProcessorStartResult = {
  continuedInBackground: boolean;
  failed: number;
};

export async function startQueueProcessor(
  campaignId: string,
  waitMs = DEFAULT_QUEUE_WAIT_MS,
): Promise<QueueProcessorStartResult> {
  const invokePromise = supabase.functions.invoke("process-email-queue", {
    body: { campaignId },
  });

  const raceResult = await Promise.race([
    invokePromise
      .then(({ data, error }) => ({ kind: "result" as const, data, error }))
      .catch((error: unknown) => ({ kind: "error" as const, error })),
    new Promise<{ kind: "timeout" }>((resolve) => {
      setTimeout(() => resolve({ kind: "timeout" }), waitMs);
    }),
  ]);

  if (raceResult.kind === "timeout") {
    void invokePromise
      .then(({ data, error }) => {
        if (error) {
          console.error("Queue processor background invocation failed:", error);
          return;
        }

        if (data && typeof data === "object" && "success" in data && data.success === false) {
          console.error("Queue processor background invocation failed:", data);
        }
      })
      .catch((error) => {
        console.error("Queue processor background invocation failed:", error);
      });

    return { continuedInBackground: true, failed: 0 };
  }

  if (raceResult.kind === "error") {
    throw new Error(
      await getSupabaseFunctionErrorMessage(raceResult.error, "Failed to start email processing"),
    );
  }

  if (raceResult.error) {
    throw new Error(
      await getSupabaseFunctionErrorMessage(raceResult.error, "Failed to start email processing"),
    );
  }

  if (
    raceResult.data &&
    typeof raceResult.data === "object" &&
    "success" in raceResult.data &&
    raceResult.data.success === false
  ) {
    const message =
      "error" in raceResult.data && typeof raceResult.data.error === "string"
        ? raceResult.data.error
        : "Failed to start email processing";
    throw new Error(message);
  }

  const failed =
    raceResult.data &&
    typeof raceResult.data === "object" &&
    "failed" in raceResult.data &&
    typeof raceResult.data.failed === "number"
      ? raceResult.data.failed
      : 0;

  return { continuedInBackground: false, failed };
}

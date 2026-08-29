const DEFAULT_QUEUE_WAIT_MS = 2500;

type QueueProcessorStartResult = {
  continuedInBackground: boolean;
  failed: number;
};

export async function startQueueProcessor(
  campaignId: string,
  waitMs = DEFAULT_QUEUE_WAIT_MS,
): Promise<QueueProcessorStartResult> {
  return { continuedInBackground: true, failed: 0 };
}

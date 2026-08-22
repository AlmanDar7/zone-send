const DEFAULT_QUEUE_WAIT_MS = 2500;

type QueueProcessorStartResult = {
  continuedInBackground: boolean;
  failed: number;
};

export async function startQueueProcessor(
  campaignId: string,
  waitMs = DEFAULT_QUEUE_WAIT_MS,
): Promise<QueueProcessorStartResult> {
  // In the custom backend, queue items are safely saved into the MySQL database.
  // The background worker processes scheduled and immediate sends.
  return { continuedInBackground: true, failed: 0 };
}

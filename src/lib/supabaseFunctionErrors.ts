type ResponseLike = {
  clone?: () => ResponseLike;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
  status?: number;
  statusText?: string;
};

type FunctionErrorLike = {
  message?: string;
  context?: ResponseLike;
};

function extractMessageFromPayload(payload: unknown): string | null {
  if (!payload) return null;

  if (typeof payload === "string") {
    return payload.trim() || null;
  }

  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (typeof record.error === "string" && record.error.trim()) {
      return record.error.trim();
    }

    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }
  }

  return null;
}

async function extractMessageFromResponse(response: ResponseLike): Promise<string | null> {
  const readable = typeof response.clone === "function" ? response.clone() : response;

  if (typeof readable.json === "function") {
    try {
      const payload = await readable.json();
      const message = extractMessageFromPayload(payload);
      if (message) return message;
    } catch {
      // Fall back to plain text parsing below.
    }
  }

  if (typeof readable.text === "function") {
    try {
      const text = await readable.text();
      const message = extractMessageFromPayload(text);
      if (message) return message;
    } catch {
      // Ignore and use the fallback message below.
    }
  }

  return null;
}

export async function getSupabaseFunctionErrorMessage(
  error: unknown,
  fallback = "Request failed",
): Promise<string> {
  if (error && typeof error === "object") {
    const functionError = error as FunctionErrorLike;

    if (functionError.context) {
      const contextMessage = await extractMessageFromResponse(functionError.context);
      if (contextMessage) return contextMessage;
    }

    if (typeof functionError.message === "string" && functionError.message.trim()) {
      return functionError.message.trim();
    }
  }

  return fallback;
}

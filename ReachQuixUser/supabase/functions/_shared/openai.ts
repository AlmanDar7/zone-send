export type ChatMessage = { role: string; content: string };

export class AiApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AiApiError";
    this.status = status;
  }
}

export async function chatCompletion(options: {
  messages: ChatMessage[];
  temperature?: number;
  model?: string;
}): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey?.trim()) {
    throw new Error(
      "AI is not configured. Set OPENAI_API_KEY in your Supabase Edge Function secrets.",
    );
  }

  const baseUrl = (Deno.env.get("OPENAI_API_BASE") || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = options.model || Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 429) {
      throw new AiApiError("Rate limit exceeded. Please try again shortly.", 429);
    }
    if (response.status === 401) {
      throw new AiApiError("Invalid OPENAI_API_KEY. Check Supabase Edge Function secrets.", 401);
    }
    throw new AiApiError(`AI API error: ${errText}`, response.status);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

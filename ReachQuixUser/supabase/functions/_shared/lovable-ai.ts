const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

export type ChatMessage = { role: string; content: string };

export async function lovableChatCompletion(options: {
  messages: ChatMessage[];
  temperature?: number;
  model?: string;
}): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey?.trim()) {
    throw new Error(
      "AI is not configured. Set LOVABLE_API_KEY in your Supabase Edge Function secrets.",
    );
  }

  const response = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 429) {
      throw new LovableAiError("Rate limit exceeded. Please try again shortly.", 429);
    }
    if (response.status === 402) {
      throw new LovableAiError("AI credits exhausted. Add credits in your Lovable workspace.", 402);
    }
    throw new LovableAiError(`AI API error: ${errText}`, response.status);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export class LovableAiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LovableAiError";
    this.status = status;
  }
}

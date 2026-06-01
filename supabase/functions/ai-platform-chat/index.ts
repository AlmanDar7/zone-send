import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LovableAiError, lovableChatCompletion } from "../_shared/lovable-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { messages, platformContext } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("messages array is required");
    }

    const ctx = platformContext || {};
    const contextSummary = `You are an AI assistant inside the user's cold-email platform. You help the user understand and act on THEIR OWN data only.

STRICT RULES:
- Only reference numbers, names, statuses, and details that appear in the platform context below.
- Never invent metrics, contacts, campaigns, templates, open rates, reply rates, or any data not present.
- If the user asks about something not in the context, say you don't have that data and suggest where in the app to find it.
- Keep answers concise, actionable, and specific to this user's platform.

PLATFORM CONTEXT (JSON):
${JSON.stringify(ctx, null, 2)}`;

    const content = await lovableChatCompletion({
      messages: [{ role: "system", content: contextSummary }, ...messages],
      temperature: 0.4,
    });

    return new Response(JSON.stringify({ success: true, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error instanceof LovableAiError ? error.status : 400;
    console.error("ai-platform-chat error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: status >= 400 && status < 600 ? status : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

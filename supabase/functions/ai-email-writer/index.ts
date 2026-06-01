import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AiApiError, chatCompletion } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const { prompt, type, tone } = await req.json();

    const systemPrompt = `You are an expert cold email copywriter. You write high-converting outreach emails that are personalized, concise, and drive action.

Rules:
- Use merge tags like {{FirstName}}, {{CompanyName}}, {{Email}} where appropriate
- Keep subject lines under 60 characters
- Keep emails concise (under 150 words for body)
- Include a clear call to action
- Sound human, not robotic
- Avoid spam trigger words`;

    let userPrompt = "";
    if (type === "subject") {
      userPrompt = `Generate 5 compelling email subject line variations for the following context. Return them as a JSON array of strings.\n\nContext: ${prompt}\nTone: ${tone || "professional"}`;
    } else if (type === "body") {
      userPrompt = `Write a compelling cold email body for the following context. Use merge tags where appropriate.\n\nContext: ${prompt}\nTone: ${tone || "professional"}`;
    } else {
      userPrompt = `Write a complete cold email (subject line + body) for the following context. Use merge tags where appropriate. Return as JSON with "subject" and "body" keys.\n\nContext: ${prompt}\nTone: ${tone || "professional"}`;
    }

    const content = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
    });

    return new Response(JSON.stringify({ success: true, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error instanceof AiApiError ? error.status : 400;
    console.error("AI writer error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: status >= 400 && status < 600 ? status : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

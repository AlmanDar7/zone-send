import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { event_type, user_id, payload } = await req.json();

    if (!event_type || !user_id) {
      return new Response(JSON.stringify({ error: "Missing event_type or user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find active webhooks for this user that listen to this event
    const { data: webhooks } = await supabase
      .from("webhooks")
      .select("*")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .contains("events", [event_type]);

    if (!webhooks || webhooks.length === 0) {
      return new Response(JSON.stringify({ delivered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const body = JSON.stringify({
          event: event_type,
          timestamp: new Date().toISOString(),
          data: payload,
          ...(webhook.secret ? { signature: await hmacSign(webhook.secret, JSON.stringify(payload)) } : {}),
        });

        try {
          const res = await fetch(webhook.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });

          const responseBody = await res.text().catch(() => "");

          await supabase.from("webhook_deliveries").insert({
            webhook_id: webhook.id,
            event_type,
            payload,
            status_code: res.status,
            response_body: responseBody.slice(0, 1000),
            success: res.ok,
          });

          return { webhook_id: webhook.id, success: res.ok };
        } catch (err: any) {
          await supabase.from("webhook_deliveries").insert({
            webhook_id: webhook.id,
            event_type,
            payload,
            status_code: 0,
            response_body: err.message,
            success: false,
          });
          return { webhook_id: webhook.id, success: false };
        }
      })
    );

    return new Response(JSON.stringify({ delivered: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook dispatch error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function hmacSign(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

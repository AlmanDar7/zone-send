import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1x1 transparent GIF
const PIXEL = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), c => c.charCodeAt(0));

serve(async (req) => {
  const url = new URL(req.url);
  const eventType = url.searchParams.get("t"); // 'open' or 'click'
  const contactId = url.searchParams.get("c");
  const campaignId = url.searchParams.get("ca");
  const queueId = url.searchParams.get("q");
  const userId = url.searchParams.get("u");
  const linkUrl = url.searchParams.get("l"); // original link for click tracking

  if (!eventType || !contactId || !userId) {
    return new Response("Missing params", { status: 400 });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Record the event
    await supabase.from("email_events").insert({
      user_id: userId,
      contact_id: contactId,
      campaign_id: campaignId || null,
      email_queue_id: queueId || null,
      event_type: eventType,
      link_url: linkUrl || null,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
      user_agent: req.headers.get("user-agent") || null,
    });

    // Update email_queue counts
    if (queueId) {
      const col = eventType === "open" ? "open_count" : "click_count";
      const { data: queueItem } = await supabase.from("email_queue").select(col).eq("id", queueId).single();
      if (queueItem) {
        await supabase.from("email_queue").update({ [col]: (queueItem as any)[col] + 1 }).eq("id", queueId);
      }
    }

    // For opens, return tracking pixel
    if (eventType === "open") {
      return new Response(PIXEL, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }

    // For clicks, redirect to original URL
    if (eventType === "click" && linkUrl) {
      return new Response(null, {
        status: 302,
        headers: { Location: linkUrl },
      });
    }

    return new Response("OK");
  } catch (error: any) {
    console.error("Track error:", error.message);
    // Still redirect on click even if tracking fails
    if (eventType === "click" && linkUrl) {
      return new Response(null, { status: 302, headers: { Location: linkUrl } });
    }
    return new Response(PIXEL, { headers: { "Content-Type": "image/gif" } });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const deleteByUserId = async (table: string) => {
      const { error } = await adminClient.from(table).delete().eq("user_id", user.id);
      if (error) throw error;
    };

    const deleteByIds = async (table: string, column: string, ids: string[]) => {
      if (!ids.length) return;
      const { error } = await adminClient.from(table).delete().in(column, ids);
      if (error) throw error;
    };

    const [{ data: campaigns }, { data: contacts }, { data: folders }, { data: webhooks }] = await Promise.all([
      adminClient.from("campaigns").select("id").eq("user_id", user.id),
      adminClient.from("contacts").select("id").eq("user_id", user.id),
      adminClient.from("contact_folders").select("id").eq("user_id", user.id),
      adminClient.from("webhooks").select("id").eq("user_id", user.id),
    ]);

    const campaignIds = campaigns?.map((item) => item.id) ?? [];
    const contactIds = contacts?.map((item) => item.id) ?? [];
    const folderIds = folders?.map((item) => item.id) ?? [];
    const webhookIds = webhooks?.map((item) => item.id) ?? [];

    await deleteByIds("webhook_deliveries", "webhook_id", webhookIds);
    await deleteByIds("campaign_steps", "campaign_id", campaignIds);
    await deleteByIds("contact_folder_members", "folder_id", folderIds);
    await deleteByIds("contact_folder_members", "contact_id", contactIds);

    await Promise.all([
      deleteByUserId("email_events"),
      deleteByUserId("email_queue"),
      deleteByUserId("webhooks"),
      deleteByUserId("email_templates"),
      deleteByUserId("google_sheet_settings"),
      deleteByUserId("sending_limits"),
      deleteByUserId("smtp_settings"),
    ]);

    await Promise.all([
      deleteByUserId("contacts"),
      deleteByUserId("contact_folders"),
      deleteByUserId("campaigns"),
      deleteByUserId("profiles"),
    ]);

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteUserError) throw deleteUserError;

    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete account";
    return json({ error: message }, 500);
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    // Get Google Sheet settings
    const { data: settings, error: settingsError } = await supabase
      .from("google_sheet_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !settings || !settings.sheet_id || !settings.service_account_json) {
      throw new Error("Google Sheet not configured. Go to Settings to connect your sheet.");
    }

    // Parse service account JSON
    const serviceAccount = JSON.parse(settings.service_account_json);

    // Create JWT for Google API
    const now = Math.floor(Date.now() / 1000);
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }));

    // Sign JWT with private key
    const encoder = new TextEncoder();
    const keyData = serviceAccount.private_key
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\n/g, "");
    
    const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8", binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false, ["sign"]
    );

    const signatureInput = encoder.encode(`${header}.${payload}`);
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signatureInput);
    const jwt = `${header}.${payload}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    // Get access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("Failed to get Google API token");

    // Read contacts from sheet (first tab, columns A and B = Name, Email)
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${settings.sheet_id}/values/A:E?key=`;
    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${settings.sheet_id}/values/Contacts!A:E`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const sheetData = await sheetRes.json();

    if (!sheetData.values || sheetData.values.length < 2) {
      throw new Error("No data found in the Contacts sheet. Ensure columns: Name, Email, Company (optional)");
    }

    const rows = sheetData.values.slice(1); // Skip header
    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const name = row[0]?.trim();
      const email = row[1]?.trim();
      const company = row[2]?.trim() || null;

      if (!name || !email) { skipped++; continue; }

      // Check if contact already exists
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("user_id", user.id)
        .eq("email", email)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      await supabase.from("contacts").insert({
        user_id: user.id, name, email, company_name: company, source: "google_sheets",
      });
      imported++;
    }

    // Update last synced
    await supabase.from("google_sheet_settings").update({ last_synced_at: new Date().toISOString() }).eq("user_id", user.id);

    return new Response(JSON.stringify({
      success: true,
      message: `Synced: ${imported} new contacts imported, ${skipped} skipped (duplicates or invalid)`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Google Sheets sync error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

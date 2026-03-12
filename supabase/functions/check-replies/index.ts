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

    // Get all users with SMTP settings configured
    const { data: smtpList } = await supabase.from("smtp_settings").select("*");
    if (!smtpList || smtpList.length === 0) {
      return new Response(JSON.stringify({ message: "No SMTP settings configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalReplies = 0;

    for (const smtp of smtpList) {
      try {
        // Use IMAP to check for replies
        // Note: Deno doesn't have a native IMAP library, so we'll use a simple approach
        // Check inbox via IMAP using the configured SMTP credentials
        // For Namecheap, IMAP is typically on the same host, port 993

        const imapHost = smtp.host; // Usually same as SMTP host
        const imapPort = 993;

        // Connect to IMAP server
        const conn = await Deno.connectTls({
          hostname: imapHost,
          port: imapPort,
        });

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const buf = new Uint8Array(4096);

        // Helper to send IMAP command and read response
        const sendCmd = async (cmd: string): Promise<string> => {
          await conn.write(encoder.encode(cmd + "\r\n"));
          const n = await conn.read(buf);
          return decoder.decode(buf.subarray(0, n || 0));
        };

        // Read greeting
        await conn.read(buf);

        // Login
        const loginRes = await sendCmd(`A001 LOGIN ${smtp.username} ${smtp.password}`);
        if (!loginRes.includes("OK")) {
          conn.close();
          continue;
        }

        // Select INBOX
        await sendCmd("A002 SELECT INBOX");

        // Search for recent unseen emails (last 24 hours)
        const searchRes = await sendCmd("A003 SEARCH UNSEEN SINCE " + getIMAPDate());
        const messageIds = searchRes.match(/\d+/g)?.filter((id) => parseInt(id) > 0) || [];

        for (const msgId of messageIds.slice(0, 50)) {
          // Fetch FROM header
          const fetchRes = await sendCmd(`A004 FETCH ${msgId} (BODY[HEADER.FIELDS (FROM SUBJECT)])`);
          
          // Extract sender email
          const fromMatch = fetchRes.match(/From:\s*(?:.*<)?([^\s>]+@[^\s>]+)/i);
          if (!fromMatch) continue;

          const senderEmail = fromMatch[1].toLowerCase().trim();

          // Check if this email is from a contact in an active campaign
          const { data: contact } = await supabase
            .from("contacts")
            .select("*")
            .eq("user_id", smtp.user_id)
            .eq("email", senderEmail)
            .eq("status", "Active")
            .maybeSingle();

          if (contact) {
            // Mark as replied
            await supabase.from("contacts").update({
              status: "Replied",
              reply_date: new Date().toISOString(),
            }).eq("id", contact.id);

            // Remove pending emails from queue
            await supabase
              .from("email_queue")
              .update({ status: "cancelled" })
              .eq("contact_id", contact.id)
              .eq("status", "pending");

            // Update Google Sheets if configured
            await updateGoogleSheetsReply(supabase, smtp.user_id, contact);

            totalReplies++;

            // Mark email as seen
            await sendCmd(`A005 STORE ${msgId} +FLAGS (\\Seen)`);
          }
        }

        // Logout
        await sendCmd("A006 LOGOUT");
        conn.close();
      } catch (imapError: any) {
        console.error(`IMAP error for user ${smtp.user_id}:`, imapError.message);
      }
    }

    return new Response(JSON.stringify({ success: true, repliesDetected: totalReplies }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Reply check error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getIMAPDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

async function updateGoogleSheetsReply(supabase: any, userId: string, contact: any) {
  try {
    const { data: settings } = await supabase
      .from("google_sheet_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!settings?.sheet_id || !settings?.service_account_json) return;

    const serviceAccount = JSON.parse(settings.service_account_json);
    const now = Math.floor(Date.now() / 1000);

    // Create JWT
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600, iat: now,
    }));

    const encoder = new TextEncoder();
    const keyData = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
    const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const signatureInput = encoder.encode(`${header}.${payload}`);
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signatureInput);
    const jwt = `${header}.${payload}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return;

    // Append to Replied tab
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${settings.sheet_id}/values/Replied!A:D:append?valueInputOption=RAW`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          values: [[contact.name, contact.email, new Date().toISOString(), "Auto-detected reply"]],
        }),
      }
    );
  } catch (e: any) {
    console.error("Failed to update Google Sheets:", e.message);
  }
}

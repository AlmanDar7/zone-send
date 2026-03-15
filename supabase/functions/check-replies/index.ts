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

    const { data: smtpList } = await supabase.from("smtp_settings").select("*");
    if (!smtpList || smtpList.length === 0) {
      return new Response(JSON.stringify({ message: "No SMTP settings configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalReplies = 0;

    for (const smtp of smtpList) {
      try {
        const imapHost = smtp.host;
        const imapPort = 993;

        console.log(`Connecting to IMAP ${imapHost}:${imapPort} for user ${smtp.user_id}`);

        const conn = await Deno.connectTls({
          hostname: imapHost,
          port: imapPort,
        });

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        // Read full response until we see a tagged response or timeout
        const readResponse = async (tag?: string): Promise<string> => {
          let result = "";
          const buf = new Uint8Array(8192);
          const deadline = Date.now() + 10000; // 10s timeout
          
          while (Date.now() < deadline) {
            try {
              // Set a read deadline
              const n = await conn.read(buf);
              if (n === null) break;
              result += decoder.decode(buf.subarray(0, n));
              
              // If we have a tag, wait until we see the tagged response
              if (tag) {
                if (result.includes(`${tag} OK`) || result.includes(`${tag} NO`) || result.includes(`${tag} BAD`)) {
                  break;
                }
              } else {
                // For greeting, just read once
                break;
              }
            } catch {
              break;
            }
          }
          return result;
        };

        const sendCmd = async (tag: string, cmd: string): Promise<string> => {
          const fullCmd = `${tag} ${cmd}\r\n`;
          await conn.write(encoder.encode(fullCmd));
          return await readResponse(tag);
        };

        // Read server greeting
        await readResponse();

        // Login
        const loginRes = await sendCmd("A001", `LOGIN "${smtp.username}" "${smtp.password}"`);
        if (!loginRes.includes("A001 OK")) {
          console.error(`IMAP login failed for ${smtp.username}: ${loginRes.substring(0, 200)}`);
          try { conn.close(); } catch {}
          continue;
        }
        console.log(`IMAP login successful for ${smtp.username}`);

        // Select INBOX
        const selectRes = await sendCmd("A002", "SELECT INBOX");
        if (!selectRes.includes("A002 OK")) {
          console.error(`Failed to select INBOX: ${selectRes.substring(0, 200)}`);
          try { await sendCmd("A099", "LOGOUT"); conn.close(); } catch {}
          continue;
        }

        // Search for unseen emails from the last 2 days
        const imapDate = getIMAPDate();
        const searchRes = await sendCmd("A003", `SEARCH UNSEEN SINCE ${imapDate}`);
        console.log(`Search result: ${searchRes.substring(0, 300)}`);

        // Extract message sequence numbers from SEARCH response
        // Response format: "* SEARCH 1 2 3\r\nA003 OK ..."
        const searchLine = searchRes.split("\r\n").find(l => l.startsWith("* SEARCH"));
        const messageIds: string[] = [];
        if (searchLine) {
          const parts = searchLine.replace("* SEARCH", "").trim().split(/\s+/);
          for (const p of parts) {
            if (/^\d+$/.test(p) && parseInt(p) > 0) {
              messageIds.push(p);
            }
          }
        }

        console.log(`Found ${messageIds.length} unseen messages`);

        // Get all active contacts for this user to match against
        const { data: activeContacts } = await supabase
          .from("contacts")
          .select("id, email, campaign_id")
          .eq("user_id", smtp.user_id)
          .eq("status", "Active");

        if (!activeContacts || activeContacts.length === 0) {
          try { await sendCmd("A099", "LOGOUT"); conn.close(); } catch {}
          continue;
        }

        // Build email lookup map
        const contactMap = new Map<string, any>();
        for (const c of activeContacts) {
          contactMap.set(c.email.toLowerCase().trim(), c);
        }

        // Process messages (limit to 50 to avoid timeouts)
        let fetchTag = 10;
        for (const msgId of messageIds.slice(0, 50)) {
          const tag = `A${String(fetchTag++).padStart(3, "0")}`;
          const fetchRes = await sendCmd(tag, `FETCH ${msgId} (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT)])`);

          // Extract sender email from From header
          const fromMatch = fetchRes.match(/From:\s*(?:[^<]*<)?([^\s<>]+@[^\s<>]+)/i);
          if (!fromMatch) continue;

          const senderEmail = fromMatch[1].toLowerCase().trim();
          const contact = contactMap.get(senderEmail);

          if (contact) {
            console.log(`Reply detected from ${senderEmail} (contact ${contact.id})`);

            // Update contact status to Replied
            await supabase.from("contacts").update({
              status: "Replied",
              reply_date: new Date().toISOString(),
            }).eq("id", contact.id);

            // Cancel pending emails for this contact
            await supabase
              .from("email_queue")
              .update({ status: "cancelled" })
              .eq("contact_id", contact.id)
              .eq("status", "pending");

            totalReplies++;

            // Mark email as seen in IMAP
            const storeTag = `A${String(fetchTag++).padStart(3, "0")}`;
            await sendCmd(storeTag, `STORE ${msgId} +FLAGS (\\Seen)`);

            // Remove from map so we don't double-count
            contactMap.delete(senderEmail);
          }
        }

        // Logout
        try { await sendCmd("A098", "LOGOUT"); } catch {}
        try { conn.close(); } catch {}

        console.log(`Processed ${messageIds.length} messages, found ${totalReplies} replies for user ${smtp.user_id}`);
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
  d.setDate(d.getDate() - 2); // Check last 2 days
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

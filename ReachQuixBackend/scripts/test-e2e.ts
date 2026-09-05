import prisma from '../src/db';
import { processPendingQueue } from '../src/services/queueWorker';

const TEST_USER_ID = "test_user_reachquix_001";
const TEST_EMAIL = "tester@reachquix.local";

// Create valid dev-fallback JWT Bearer token
const mockPayload = Buffer.from(
  JSON.stringify({
    uid: TEST_USER_ID,
    user_id: TEST_USER_ID,
    email: TEST_EMAIL,
    sub: TEST_USER_ID,
  })
).toString("base64");

const MOCK_TOKEN = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${mockPayload}.mockSignature`;

async function apiRequest(endpoint: string, method: string = "GET", body?: any, isPublic: boolean = false) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!isPublic) {
    headers["Authorization"] = `Bearer ${MOCK_TOKEN}`;
  }

  const res = await fetch(`http://localhost:5000/api${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  try {
    return { status: res.status, ok: res.ok, data: JSON.parse(text) };
  } catch {
    return { status: res.status, ok: res.ok, data: text };
  }
}

async function runE2ETests() {
  console.log("==================================================================");
  console.log(" 🚀 STARTING REACHQUIX END-TO-END VERIFICATION SUITE");
  console.log(` 👤 Test User: ${TEST_USER_ID} (${TEST_EMAIL})`);
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${testName}`, detail || "");
      failed++;
    }
  }

  try {
    // 0. Clean previous test data
    console.log("\n🧹 0. Cleaning old test artifacts for test user...");
    await prisma.emailEvent.deleteMany({ where: { user_id: TEST_USER_ID } });
    await prisma.emailQueue.deleteMany({ where: { user_id: TEST_USER_ID } });
    await prisma.campaignStep.deleteMany({ where: { campaign: { user_id: TEST_USER_ID } } });
    await prisma.campaign.deleteMany({ where: { user_id: TEST_USER_ID } });
    await prisma.emailTemplate.deleteMany({ where: { user_id: TEST_USER_ID } });
    await prisma.contactTag.deleteMany({ where: { contact: { user_id: TEST_USER_ID } } });
    await prisma.tag.deleteMany({ where: { user_id: TEST_USER_ID } });
    await prisma.contactFolderMember.deleteMany({ where: { contact: { user_id: TEST_USER_ID } } });
    await prisma.contactFolder.deleteMany({ where: { user_id: TEST_USER_ID } });
    await prisma.contact.deleteMany({ where: { user_id: TEST_USER_ID } });
    await prisma.smtpSettings.deleteMany({ where: { user_id: TEST_USER_ID } });
    await prisma.sendingLimit.deleteMany({ where: { user_id: TEST_USER_ID } });
    await prisma.profile.deleteMany({ where: { user_id: TEST_USER_ID } });

    // 1. Profile API
    console.log("\n👤 1. Testing Profile API...");
    const profileRes = await apiRequest("/profile", "POST", {
      full_name: "ReachQuix Tester",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
    });
    assert(profileRes.ok && profileRes.data.full_name === "ReachQuix Tester", "Save Profile via API", profileRes.data);

    // 2. SMTP Settings API
    console.log("\n⚙️ 2. Testing Settings & SMTP API...");
    const saveSmtpRes = await apiRequest("/settings/smtp", "POST", {
      host: "smtp.mailgun.org",
      port: 587,
      username: "postmaster@sandbox.mailgun.org",
      password: "secretpassword123",
      from_name: "ReachQuix Growth",
      from_email: "tester@reachquix.local",
      use_ssl: false,
    });
    assert(saveSmtpRes.ok && saveSmtpRes.data.host === "smtp.mailgun.org", "Save SMTP Settings", saveSmtpRes.data);

    // 3. Tags and Folders
    console.log("\n🏷️ 3. Testing Contact Tags & Folders...");
    const tagRes = await apiRequest("/contacts/tags", "POST", { name: "VIP Customer" });
    assert(tagRes.ok && tagRes.data.name === "VIP Customer", "Create Tag (VIP Customer)", tagRes.data);

    const folderRes = await apiRequest("/contacts/folders", "POST", { name: "Early Adopters" });
    assert(folderRes.ok && folderRes.data.name === "Early Adopters", "Create Segment Folder", folderRes.data);
    const folderId = folderRes.data.id;

    // 4. Contacts & Tag Assignment
    console.log("\n👥 4. Testing Contacts API...");
    const contactRes = await apiRequest("/contacts", "POST", {
      name: "Sophia Carter",
      email: "sophia@example.com",
      company_name: "Acme Corp",
      phone: "+1 555-0199",
      status: "active",
    });
    assert(contactRes.ok && contactRes.data.email === "sophia@example.com", "Create Contact", contactRes.data);
    const contactId = contactRes.data.id;

    // Assign folder and tag
    await apiRequest("/contacts/folder-members/assign", "POST", {
      folderId,
      contactIds: [contactId],
    });
    await apiRequest("/contacts/contact-tags/assign", "POST", {
      contactIds: [contactId],
      tagIds: [tagRes.data.id],
    });

    // 5. Email Templates & Forms
    console.log("\n🎨 5. Testing Email & Form Templates API...");
    const emailTemplateRes = await apiRequest("/templates", "POST", {
      name: "Welcome Onboarding",
      subject: "Welcome to ReachQuix!",
      preview_text: "Here is your exclusive onboarding guide.",
      body: "Welcome to ReachQuix, {{name}}! We are thrilled to have you.",
      category: "email",
      template_format: "visual",
      html_body: "<html><body><h1>Welcome {{name}}!</h1><a href='https://reachquix.com/start'>Get Started</a></body></html>",
    });
    assert(emailTemplateRes.ok, "Create Email Template", emailTemplateRes.data);
    const templateId = emailTemplateRes.data.id;

    const formTemplateRes = await apiRequest("/templates", "POST", {
      name: "Product Waitlist Form",
      subject: "Thank you for joining our waitlist",
      body: "Sign up to be the first to know when we launch.",
      category: "form",
      template_format: "form",
      design_config: { primaryColor: "#10b981", buttonText: "Join Waitlist" },
    });
    assert(formTemplateRes.ok, "Create Form Template", formTemplateRes.data);
    const formId = formTemplateRes.data.id;

    // 6. Public Form Endpoints
    console.log("\n📝 6. Testing Public Form Embed & Lead Submission API...");
    const publicFormRes = await apiRequest(`/public/forms/${formId}`, "GET", undefined, true);
    assert(publicFormRes.ok && publicFormRes.data.name === "Product Waitlist Form", "Fetch Public Form Metadata", publicFormRes.data);

    const embedJsRes = await fetch(`http://localhost:5000/api/public/forms/${formId}/embed.js`);
    const embedJsText = await embedJsRes.text();
    assert(embedJsRes.ok && embedJsText.includes("rq-form-"), "Serve Public Form Embed JavaScript", embedJsText.slice(0, 100));

    const submitFormRes = await apiRequest(`/public/forms/${formId}/submit`, "POST", {
      name: "Alex Morgan",
      email: "alex.morgan@startup.io",
      company_name: "Startup Labs",
    }, true);
    assert(submitFormRes.ok && submitFormRes.data.success === true, "Submit Lead via Public Form API", submitFormRes.data);

    // 7. Campaign Creation & Step Atomic Syncing
    console.log("\n🚀 7. Testing Campaign Creation & Step Syncing...");
    const campaignRes = await apiRequest("/campaigns", "POST", {
      name: "Q4 Outreach Campaign",
      daily_limit: 500,
    });
    assert(campaignRes.ok, "Create Campaign", campaignRes.data);
    const campaignId = campaignRes.data.id;

    const syncStepsRes = await apiRequest(`/campaigns/${campaignId}/steps/sync`, "PUT", {
      steps: [
        {
          step_number: 1,
          template_id: templateId,
          subject_a: "Welcome to ReachQuix!",
          preview_text_a: "Here is your exclusive invite.",
          body_a: "Hi {{FirstName}}, welcome to our platform!",
          delay_days: 0,
          delay_unit: "days",
          delay_value: 0,
        },
        {
          step_number: 2,
          template_id: templateId,
          subject_a: "Following up on our note",
          body_a: "Hi {{FirstName}}, just checking in.",
          delay_days: 3,
          delay_unit: "days",
          delay_value: 3,
        }
      ]
    });
    assert(syncStepsRes.ok && syncStepsRes.data.length === 2, "Atomically Sync 2 Campaign Steps", syncStepsRes.data);

    // 8. Email Queue & Tracking Engine
    console.log("\n📬 8. Testing Email Queue, Worker & Tracking Engine...");
    const queueRes = await apiRequest("/queue", "POST", {
      campaign_id: campaignId,
      contact_id: contactId,
      step_number: 1,
      scheduled_at: new Date().toISOString(),
      status: "pending",
    });
    assert(queueRes.ok, "Enqueue Email for Dispatch", queueRes.data);
    const queueId = queueRes.data.id;

    // Test Open Tracking Pixel (GET /api/track/open/:queueId)
    const trackOpenRes = await fetch(`http://localhost:5000/api/track/open/${queueId}`);
    assert(trackOpenRes.ok && trackOpenRes.headers.get("content-type") === "image/gif", "Record Email Open Event & Serve 1x1 Pixel");

    // Test Click Tracking Redirect (GET /api/track/click/:queueId?url=...)
    const targetUrl = "https://reachquix.com/pricing";
    const trackClickRes = await fetch(`http://localhost:5000/api/track/click/${queueId}?url=${encodeURIComponent(targetUrl)}`, {
      redirect: 'manual',
    });
    assert(trackClickRes.status === 302 && trackClickRes.headers.get("location") === targetUrl, "Record Email Click Event & 302 Redirect");

    // Verify events recorded in database
    const events = await prisma.emailEvent.findMany({ where: { email_queue_id: queueId } });
    assert(events.length === 2 && events.some(e => e.event_type === 'open') && events.some(e => e.event_type === 'click'), "Events logged into EmailEvent table", events);

    // 9. AI Email Copywriter
    console.log("\n🤖 9. Testing AI Copywriter API...");
    const aiSubjectRes = await apiRequest("/ai/write-email", "POST", {
      prompt: "AI cold email software for agencies",
      type: "subject",
      tone: "professional",
    });
    assert(aiSubjectRes.ok && aiSubjectRes.data.content, "Generate AI Subject Lines", aiSubjectRes.data);

    const aiFullRes = await apiRequest("/ai/write-email", "POST", {
      prompt: "Automated cold outreach for SaaS founders",
      type: "full",
      tone: "friendly",
    });
    assert(aiFullRes.ok && aiFullRes.data.content, "Generate AI Full Email", aiFullRes.data);

    // 10. Dashboard & Analytics Telemetry
    console.log("\n📊 10. Testing Analytics & Dashboard Telemetry...");
    const dashRes = await apiRequest("/dashboard/stats", "GET");
    assert(
      dashRes.ok &&
      dashRes.data.contactsCount >= 2 &&
      dashRes.data.engagement?.uniqueOpens >= 1 &&
      dashRes.data.engagement?.uniqueClicks >= 1,
      "Dashboard Telemetry Reflects Opens & Clicks",
      dashRes.data.engagement
    );

    const adminStatsRes = await apiRequest("/admin/stats", "GET");
    assert(adminStatsRes.ok && adminStatsRes.data.totalContacts >= 2, "Admin Stats Aggregation", adminStatsRes.data);

    // 11. Unsubscribe & Opt-Out Engine
    console.log("\n🛑 11. Testing Automated Unsubscribe & Resubscribe API...");
    const unsubRes = await fetch(`http://localhost:5000/api/track/unsubscribe/${queueId}`);
    const unsubHtml = await unsubRes.text();
    assert(unsubRes.ok && unsubHtml.includes("Successfully Unsubscribed"), "GET /api/track/unsubscribe renders confirmation HTML", unsubHtml.slice(0, 150));

    // Verify contact status changed to Unsubscribed in DB
    const updatedContact = await prisma.contact.findUnique({ where: { id: contactId } });
    assert(updatedContact?.status === "Unsubscribed", "Contact status automatically updated to 'Unsubscribed'");

    // Test One-Click Unsubscribe POST
    const oneClickRes = await fetch(`http://localhost:5000/api/track/unsubscribe/${queueId}`, { method: "POST" });
    const oneClickJson = await oneClickRes.json();
    assert(oneClickRes.ok && oneClickJson.success === true, "POST /api/track/unsubscribe RFC 8058 One-Click Opt-out");

    // Test Resubscribe
    const resubRes = await fetch(`http://localhost:5000/api/track/resubscribe/${queueId}`);
    const resubHtml = await resubRes.text();
    assert(resubRes.ok && resubHtml.includes("Welcome Back"), "GET /api/track/resubscribe restores recipient", resubHtml.slice(0, 150));

    const restoredContact = await prisma.contact.findUnique({ where: { id: contactId } });
    assert(restoredContact?.status === "active", "Contact status restored to 'active'");

    console.log("\n==================================================================");
    console.log(` 🏁 ALL TESTS COMPLETE: ${passed} PASSED | ${failed} FAILED`);
    console.log("==================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("FATAL ERROR IN TEST SUITE:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runE2ETests();

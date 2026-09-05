const TEST_USER_ID = "test_user_reachquix_001";
const TEST_EMAIL = "tester@reachquix.local";
const mockPayload = Buffer.from(JSON.stringify({ uid: TEST_USER_ID, user_id: TEST_USER_ID, email: TEST_EMAIL, sub: TEST_USER_ID })).toString("base64");
const MOCK_TOKEN = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${mockPayload}.mockSignature`;

async function api(endpoint: string, method = "GET", body?: any) {
  const res = await fetch(`http://localhost:5000/api${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${MOCK_TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; } catch { return { ok: res.ok, status: res.status, data: text }; }
}

async function run() {
  console.log("==================================================================");
  console.log(" 👑 SUPER ADMIN FULL CONTROL VERIFICATION SUITE");
  console.log("==================================================================\n");
  let passed = 0, failed = 0;

  function assert(ok: boolean, name: string, detail?: any) {
    if (ok) { console.log(` ✅ ${name}`); passed++; }
    else { console.error(` ❌ ${name}`, detail || ""); failed++; }
  }

  // 1. Admin Stats
  const stats = await api("/admin/stats");
  assert(stats.ok && stats.data.totalUsers >= 1, "Admin Stats (totalUsers >= 1)", stats.data);

  // 2. Admin Users List & Deep Dive
  const users = await api("/admin/users");
  assert(stats.ok && Array.isArray(users.data) && users.data.length >= 1, "Admin Users List", users.data?.length);

  const userId = users.data[0]?.user_id;
  if (userId) {
    const details = await api(`/admin/users/${userId}/details`);
    assert(details.ok && details.data.profile, "Admin User Deep-Dive Inspector", Object.keys(details.data));
    assert(details.ok && Array.isArray(details.data.campaigns), "  → User Campaigns loaded", details.data.campaigns?.length);
    assert(details.ok && Array.isArray(details.data.contacts), "  → User Contacts loaded", details.data.contacts?.length);
    assert(details.ok && Array.isArray(details.data.templates), "  → User Templates loaded", details.data.templates?.length);
    assert(details.ok && Array.isArray(details.data.queue), "  → User Queue loaded", details.data.queue?.length);

    // Override User Profile
    const profileRes = await api(`/admin/users/${userId}/profile`, "PUT", { full_name: "Super Admin Tested User" });
    assert(profileRes.ok && profileRes.data.full_name === "Super Admin Tested User", "Admin Override User Profile Name");

    // Override User Limits
    const limitsRes = await api(`/admin/users/${userId}/limits`, "PUT", { max_per_day: 1000 });
    assert(limitsRes.ok && limitsRes.data.max_per_day === 1000, "Admin Set User Daily Limit to 1000", limitsRes.data);

    // Override User SMTP
    const smtpRes = await api(`/admin/users/${userId}/smtp`, "PUT", {
      host: "smtp.mailgun.org",
      port: 587,
      username: "admin_override@reachquix.local",
      password: "SecretPassword123!",
      use_ssl: false,
      from_name: "ReachQuix Admin VIP",
      from_email: "vip@reachquix.local",
    });
    assert(smtpRes.ok && smtpRes.data.host === "smtp.mailgun.org", "Admin Override User SMTP Configuration");
  }

  // 3. Global Platform Settings
  const settingsGet = await api("/admin/settings");
  assert(settingsGet.ok && settingsGet.data.defaultDailyLimit !== undefined, "Admin Get Global Platform Settings", settingsGet.data);

  const settingsPut = await api("/admin/settings", "PUT", {
    maintenanceMode: "false",
    defaultDailyLimit: "750",
    allowNewSignups: "true",
    aiCopywritingEnabled: "true",
    announcementBanner: "Welcome to ReachQuix 2.0!",
    announcementType: "success",
  });
  assert(settingsPut.ok && settingsPut.data.success === true, "Admin Update Global Platform Settings & Banner");

  // 4. Audit Logs
  const auditLogs = await api("/admin/audit-logs");
  assert(auditLogs.ok && Array.isArray(auditLogs.data) && auditLogs.data.length >= 1, "Admin Audit Logs Live Stream", auditLogs.data?.length);

  // 5. Global Tracking Telemetry Events Feed
  const events = await api("/admin/events");
  assert(events.ok && Array.isArray(events.data), "Admin Global Tracking Telemetry Events Feed", events.data?.length);

  // 6. Admin Create & Update Contact directly
  const createContactRes = await api("/admin/contacts", "POST", {
    user_id: TEST_USER_ID,
    email: "enterprise_lead@corp.com",
    name: "Enterprise Client",
    company_name: "MegaCorp",
    status: "active",
  });
  assert(createContactRes.ok && createContactRes.data.id, "Admin Create Contact directly under User");
  const createdContactId = createContactRes.data.id;

  if (createdContactId) {
    const updateContactRes = await api(`/admin/contacts/${createdContactId}`, "PUT", {
      name: "VIP Enterprise Client",
      status: "active",
    });
    assert(updateContactRes.ok && updateContactRes.data.name === "VIP Enterprise Client", "Admin Update Contact Details directly");

    const bulkStatusRes = await api("/admin/contacts-bulk/status", "PUT", {
      contactIds: [createdContactId],
      status: "active",
    });
    assert(bulkStatusRes.ok && bulkStatusRes.data.count >= 1, "Admin Bulk Update Contact Status");
  }

  // 7. Global Campaigns Controller
  const campaigns = await api("/admin/campaigns");
  assert(campaigns.ok && Array.isArray(campaigns.data), "Admin Global Campaigns List", campaigns.data?.length);

  if (campaigns.data?.[0]?.id) {
    const statusRes = await api(`/admin/campaigns/${campaigns.data[0].id}/status`, "PUT", { status: "paused" });
    assert(statusRes.ok && statusRes.data.status === "paused", "Admin Override Campaign → Paused", statusRes.data.status);

    const resumeRes = await api(`/admin/campaigns/${campaigns.data[0].id}/status`, "PUT", { status: "Running" });
    assert(resumeRes.ok && resumeRes.data.status === "Running", "Admin Override Campaign → Running", resumeRes.data.status);
  }

  // 8. Global Email Queue & Maintenance
  const queue = await api("/admin/queue");
  assert(queue.ok && Array.isArray(queue.data), "Admin Global Email Queue", queue.data?.length);

  const bulkRetry = await api("/admin/maintenance/bulk-retry-queue", "POST");
  assert(bulkRetry.ok && bulkRetry.data.success === true, "Admin Maintenance: Bulk Retry Queue");

  const purgeEvents = await api("/admin/maintenance/purge-old-events", "POST", { days: 90 });
  assert(purgeEvents.ok && purgeEvents.data.success === true, "Admin Maintenance: Purge Old Telemetry Events");

  // 9. Global Templates List
  const templates = await api("/admin/templates");
  assert(templates.ok && Array.isArray(templates.data), "Admin Global Templates List", templates.data?.length);

  // 10. System Diagnostics & Worker Force Trigger
  const system = await api("/admin/system");
  assert(system.ok && system.data.status === "operational", "Admin System Diagnostics", system.data.status);

  const worker = await api("/admin/system/trigger-worker", "POST");
  assert(worker.ok && worker.data.success === true, "Admin Force Dispatch Worker", worker.data.message);

  // 11. Frontend Alive Checks
  const userFrontend = await fetch("http://localhost:8080");
  assert(userFrontend.ok, "User Frontend (port 8080) Alive");

  const adminFrontend = await fetch("http://localhost:8081");
  assert(adminFrontend.ok, "Admin Frontend (port 8081) Alive");

  console.log(`\n==================================================================`);
  console.log(` 🏁 SUPER ADMIN SUITE: ${passed} PASSED | ${failed} FAILED`);
  console.log(`==================================================================`);

  if (failed > 0) process.exit(1);
}

run();

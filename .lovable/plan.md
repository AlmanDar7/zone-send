## Goal
Replace the current single-page campaign creation with a guided 6-step wizard (Template → Audience → Details → Schedule → Success → Analytics) styled like Flodesk.

## New Route
`/campaigns/new` — wizard shell with step indicator, animated transitions (framer-motion), Back/Continue, draft auto-save to `campaigns` (status=Draft) + `campaign_steps`.

Existing `/campaigns` list gets a prominent "New Campaign" CTA pointing here. Old inline editor stays available for edits but the primary creation flow is the wizard.

## Steps

**Step 1 — Template**
- Card grid of `email_templates` with thumbnail preview (reuse `TemplatePreview`).
- "Edit" opens the existing `BlockEditor` inline in a full-bleed panel with desktop/mobile toggle.
- Selection stored in wizard state (`templateId`, edited `blocks`/`html_body`).

**Step 2 — Audience**
- Tabs: Folders (from `contact_folders`) and Individual contacts.
- Search + status filter, multi-select with checkboxes.
- Live count badge "X recipients selected".

**Step 3 — Details**
- Subject, preview text, sender name, sender email (defaults from `smtp_settings`).
- Right panel: live email preview (subject + first lines + rendered body).
- "AI suggest" button → existing `ai-email-writer` function for subject ideas.

**Step 4 — Schedule**
- Two big cards: "Send Now" / "Schedule for Later".
- If scheduled: shadcn Calendar + time input + timezone select (reuse `TimezoneSelector`).
- Bottom: confirmation summary card (template name, recipients, subject, schedule).

**Step 5 — Success Modal**
- Animated check icon, campaign name, recipient count, send/schedule time.
- Buttons: "View Analytics" → `/campaigns/:id/report`, "Back to Dashboard".

**Step 6 — Analytics**
- Use existing `CampaignReport` page; ensure cards for open/click/bounce/unsubscribe/delivered + 7-day chart + top links list. Add device breakdown if `user_agent` data available (parse mobile/desktop from `email_events.user_agent`).

## Technical
- New files:
  - `src/pages/CampaignWizard.tsx` (shell + state)
  - `src/components/wizard/StepIndicator.tsx`
  - `src/components/wizard/Step1Template.tsx`
  - `src/components/wizard/Step2Audience.tsx`
  - `src/components/wizard/Step3Details.tsx`
  - `src/components/wizard/Step4Schedule.tsx`
  - `src/components/wizard/SuccessModal.tsx`
- Wizard state via `useState`/context inside the page; persist to `campaigns` + `campaign_steps` on Continue.
- Reuse: `BlockEditor`, `TemplatePreview`, `TimezoneSelector`, `Calendar`, queue insertion logic from existing campaign creation.
- Animations: framer-motion `AnimatePresence` for step transitions.
- Add route in `src/App.tsx`. Update `Campaigns.tsx` "New Campaign" button to navigate to `/campaigns/new`.
- No DB migration required — uses existing tables. Optional: add `preview_text` column to `campaigns` if needed (will add migration if user approves).

## Out of scope
- Rewriting the BlockEditor itself (already exists).
- Building a new analytics page (extend existing `CampaignReport`).

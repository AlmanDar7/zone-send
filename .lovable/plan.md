## Overview

This is a major platform overhaul inspired by Flodesk. I'll restructure the sidebar around five core sections — Emails, Forms, Workflows, Audience, Analytics — and rebuild each with a premium, minimal, card-driven UI. Given the scope, I'll do this in phases so you can review progress and steer.

## Proposed Sidebar Structure

```text
Dashboard
Emails        (replaces Templates + Campaigns + Email Queue views)
Forms         (new)
Workflows     (new — replaces today's Campaigns automation flow)
Audience      (replaces Contacts)
Analytics
─────────────
Profile
Settings
```

Old routes will redirect so nothing breaks.

## Phase 1 — Foundation & Emails (this round)

1. **Design system polish**: refined typography scale, softer shadows, smoother transitions, skeleton loaders, empty-state component, dark mode pass.
2. **New sidebar** with the 5 sections + collapsible behavior, mobile drawer.
3. **Emails section** (`/emails`):
   - Visual card grid of all `email_templates` with thumbnail rendered from `blocks`
   - Card shows: preview, name, subject, status (Draft/Scheduled/Sent), open rate, click rate, date
   - Actions menu: Edit, Duplicate, Delete, Preview, Schedule, Send
   - Search bar + status/tag filters + category tabs
   - Add `tags TEXT[]` and `category TEXT` columns to `email_templates`
   - Open/click rates pulled from existing `email_events` joined via campaign

## Phase 2 — Forms

- New `forms` and `form_submissions` tables (RLS per user)
- `/forms` list with visual cards (preview, name, submissions, list, status)
- Drag-and-drop form builder (reuse @dnd-kit) with field types: name, email, phone, custom text/textarea/select/checkbox
- Form types: popup, embedded, landing page
- Embed code + public submit edge function
- Connect form → audience tag/list

## Phase 3 — Workflows

- New `workflows`, `workflow_nodes`, `workflow_edges` tables
- Visual node-based builder (React Flow) with triggers (form submit, tag added, signup), actions (send email, wait/delay, condition)
- Workflow cards: name, trigger, email count, active toggle
- Hook into existing `email_queue` for execution

## Phase 4 — Audience

- Rebrand Contacts as Audience at `/audience`
- Card + table dual view, segmentation, tag system (new `contact_tags` + `contact_tag_members`)
- CSV import/export, growth chart, subscriber sources
- Lists/groups (extend existing `contact_folders`)

## Phase 5 — Analytics & Final Polish

- Rich `/analytics` dashboard: open/click/bounce/spam/unsub rates, totals, best campaigns, comparison, date-range filter, animated charts (recharts)
- Final responsive + a11y pass, loading skeletons everywhere, empty states

## Technical Notes

- Stack stays React + Vite + Tailwind + shadcn + Supabase (Lovable Cloud)
- New libs: `reactflow` (workflows), `react-hook-form` (already present), reuse `@dnd-kit`
- All new tables get RLS scoped to `auth.uid()`
- Old routes (`/campaigns`, `/templates`, `/contacts`, `/email-queue`) redirect to new equivalents; underlying data preserved
- Migrations created per phase; types regenerate automatically

## What I need from you

1. **Approve the phased approach** (5 phases, starting with Foundation + Emails now).
2. **Workflow builder library**: OK to use `reactflow` for the node canvas? (it's the standard)
3. **Old routes**: redirect silently, or keep them accessible too?

Once you confirm, I'll start Phase 1.
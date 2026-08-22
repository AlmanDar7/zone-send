# ReachQuix Project Documentation & Migration Export

**Export Date:** August 22, 2026  
**Project Repositories / Directories:**
- Frontend: `c:\Users\Yasir\Desktop\ReachQuix\ReachQuixUser`
- Backend: `c:\Users\Yasir\Desktop\ReachQuix\ReachQuixBackend`
- Local Database: XAMPP MySQL (`localhost:3306`, Database: `reachquix`)

---

## 1. Executive Summary

In this development session, the entire ReachQuix application was fully migrated away from Supabase to an in-house custom architecture:
1. **Database:** Local XAMPP MySQL instance managed via **Prisma ORM**.
2. **Backend API:** Built with **Node.js, TypeScript, and Express**, running at `http://localhost:5000/api`.
3. **Authentication:** Authenticates client requests using **Firebase Auth** ID tokens verified server-side with the **Firebase Admin SDK**.
4. **Frontend:** Completely refactored the React (Vite + TypeScript + Shadcn UI + Tailwind) application across all pages, removing all `@supabase/supabase-js` database calls and replacing them with a clean, typed `api.ts` service layer.

---

## 2. System Architecture

```
                                  +---------------------------+
                                  |   ReachQuix Frontend      |
                                  |   (React / Vite on 8080)  |
                                  +-------------+-------------+
                                                |
                                   Bearer Token | JSON HTTP Requests
                                                v
                                  +-------------+-------------+
                                  |   ReachQuix Backend API   |
                                  |   (Node.js / Express 5000)|
                                  +------+--------------+-----+
                                         |              |
                    Verifies JWT Tokens  |              | Prisma ORM
                                         v              v
                           +-------------+----+   +-----+---------------+
                           |  Firebase Admin  |   |  XAMPP MySQL DB     |
                           |  Authentication  |   |  (port 3306)        |
                           +------------------+   +---------------------+
```

---

## 3. Database Schema (Prisma Models)

The Prisma schema is defined in `ReachQuixBackend/prisma/schema.prisma` and contains the following models:

- **`Profile`**: User profiles (`id`, `user_id`, `full_name`, `avatar_url`, `created_at`, `updated_at`).
- **`Contact`**: Contact database (`id`, `email`, `name`, `first_name`, `last_name`, `company_name`, `phone`, `status`, `campaign_id`, timestamps).
- **`ContactFolder` & `ContactFolderMember`**: Folders / segments for grouping contacts.
- **`Tag` & `ContactTag`**: Flexible tagging system for audience management.
- **`EmailTemplate`**: Rich templates for visual builder and form builder (`name`, `subject`, `body`, `html_body`, `design_config`, `blocks`, `category`, `template_format`, `tags`).
- **`BrandTheme`**: Reusable email typography, color palettes, button styles, and footer configurations.
- **`TemplateSection`**: Reusable email sections and layout blocks.
- **`Campaign` & `CampaignStep`**: Email automation workflows, sequence steps, delays, and A/B test variations.
- **`EmailQueue` & `EmailEvent`**: Scheduled/pending email queue items, sent timestamps, open/click event tracking.
- **`SmtpSettings`**: User SMTP connection configuration (`host`, `port`, `username`, `password`, `use_ssl`, `from_name`, `from_email`).
- **`GoogleSheetSettings`**: Credentials and sheet URLs for automatic contact synchronization.
- **`SendingLimit`**: Daily sending throttle settings and quotas.

---

## 4. API Endpoints Reference

All endpoints are mounted under `http://localhost:5000/api` and protected by the `requireAuth` Firebase JWT middleware (except public health checks).

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/health` | Service health check |
| **Dashboard** | `GET` | `/api/dashboard/stats` | Aggregated dashboard stats (contacts, campaigns, open/click rate, 7-day timeline) |
| **Analytics** | `GET` | `/api/analytics` | Filterable performance metrics (per campaign or global) |
| **Contacts** | `GET` | `/api/contacts` | List contacts with folder & tag relations |
| | `POST` | `/api/contacts` | Create a single contact |
| | `POST` | `/api/contacts/bulk` | Bulk insert contacts from CSV/Excel |
| | `PUT` | `/api/contacts/bulk-update` | Bulk update contacts (e.g. assigning to campaigns) |
| | `PUT` | `/api/contacts/:id` | Update contact |
| | `DELETE` | `/api/contacts/:id` | Delete contact |
| **Folders & Tags** | `GET` | `/api/contacts/folders` | List contact folders |
| | `POST` | `/api/contacts/folders` | Create folder |
| | `GET` | `/api/contacts/folder-members` | List folder membership |
| | `POST` | `/api/contacts/folder-members/assign` | Assign contacts to folder |
| | `POST` | `/api/contacts/folder-members/remove` | Remove contacts from folder |
| | `GET` | `/api/contacts/tags` | List all tags |
| | `POST` | `/api/contacts/tags` | Create tag |
| | `GET` | `/api/contacts/contact-tags` | List contact tag links |
| | `POST` | `/api/contacts/contact-tags/assign` | Assign tags |
| **Templates** | `GET` | `/api/templates` | List templates (supports `?category=email` or `form`) |
| | `GET` | `/api/templates/:id` | Get template by ID |
| | `POST` | `/api/templates` | Create template |
| | `PUT` | `/api/templates/:id` | Update template |
| | `DELETE` | `/api/templates/:id` | Delete template |
| | `GET` | `/api/templates/brand-themes/all` | List brand themes |
| | `POST` | `/api/templates/brand-themes` | Create brand theme |
| | `PUT` | `/api/templates/brand-themes/:id` | Update brand theme |
| | `DELETE` | `/api/templates/brand-themes/:id` | Delete brand theme |
| | `GET` | `/api/templates/sections/all` | List saved template sections |
| | `POST` | `/api/templates/sections` | Save template section |
| | `DELETE` | `/api/templates/sections/:id` | Delete template section |
| **Campaigns** | `GET` | `/api/campaigns` | List campaigns |
| | `GET` | `/api/campaigns/:id` | Get single campaign with steps |
| | `POST` | `/api/campaigns` | Create campaign |
| | `PUT` | `/api/campaigns/:id` | Update campaign status/name |
| | `DELETE` | `/api/campaigns/:id` | Delete campaign |
| | `GET` | `/api/campaigns/:id/report` | Complete campaign performance report |
| | `GET` | `/api/campaigns/steps` | List all workflow steps |
| | `POST` | `/api/campaigns/:id/steps` | Add sequence step |
| | `PUT` | `/api/campaigns/:id/steps/:stepId`| Update step timing/template |
| | `DELETE` | `/api/campaigns/:id/steps/:stepId`| Delete step |
| **Queue** | `GET` | `/api/queue` | List queue items with status/campaign filters |
| | `PUT` | `/api/queue/:id/retry` | Re-queue failed email |
| | `POST` | `/api/queue/bulk` | Bulk queue emails for campaign dispatch |
| **Settings** | `GET` | `/api/settings/smtp` | Get user SMTP config |
| | `POST` | `/api/settings/smtp` | Upsert user SMTP config |
| | `GET` | `/api/settings/google-sheets`| Get Google Sheets sync config |
| | `POST` | `/api/settings/google-sheets`| Save Google Sheets config |
| | `GET` | `/api/settings/sending-limits`| Get daily sending limits |
| | `POST` | `/api/settings/sending-limits`| Save daily sending limits |
| | `POST` | `/api/settings/test-email` | Trigger SMTP verification test |
| **Profile** | `GET` | `/api/profile` | Get user profile info |
| | `POST` | `/api/profile` | Upsert user profile |
| | `DELETE` | `/api/profile/account` | Account deletion handler |
| **AI & Sync** | `POST` | `/api/ai/write-email` | AI subject and body generation |
| | `POST` | `/api/ai/sync-google-sheets`| Trigger Google Sheets sync |

---

## 5. Migrated Frontend Pages & Components

Every frontend page and component in `ReachQuixUser/src` was updated to communicate solely with `api.ts`:

1. `Dashboard.tsx`: Loads stats through single `/api/dashboard/stats` endpoint.
2. `Contacts.tsx`: Direct integration with Prisma contacts and folder APIs.
3. `Campaigns.tsx`: Manages active, draft, and completed campaigns.
4. `CampaignWizard.tsx`: 5-step visual wizard that generates and queues campaign rows directly to MySQL.
5. `CampaignReport.tsx`: Detailed per-step graphs and metrics via `/api/campaigns/:id/report`.
6. `Analytics.tsx`: Comprehensive metrics, growth chart, and donut breakdown.
7. `EmailQueue.tsx`: Queue monitoring, CSV export, and retry capabilities.
8. `SettingsPage.tsx`: Manages SMTP settings, Google Sheets credentials, daily quotas, and full data export.
9. `Profile.tsx`: User profile management.
10. `TemplateGallery.tsx` & `FormPublishWizard.tsx`: Layout gallery and form embed script generator.
11. `ContentGallery.tsx`, `BlockEditor.tsx`, & `ImageUploader.tsx`: Email design canvas, brand themes, saved sections, and image uploads.
12. `AppTopNav.tsx` & `AuthContext.tsx`: App-wide profile hydration and session management.

---

## 6. How to Run the Project Locally

### Step 1: Start XAMPP MySQL
Ensure the MySQL module in the XAMPP Control Panel is started (or run `C:\xampp\mysql_start.bat`).

### Step 2: Start the Backend API
```powershell
cd C:\Users\Yasir\Desktop\ReachQuix\ReachQuixBackend
npm run dev
```
*Backend will run on `http://localhost:5000`.*

### Step 3: Start the Frontend App
```powershell
cd C:\Users\Yasir\Desktop\ReachQuix\ReachQuixUser
npm run dev
```
*Frontend will be accessible at `http://localhost:8080`.*

### Database Management Tools (Optional)
To view and edit the database using Prisma's visual GUI:
```powershell
cd C:\Users\Yasir\Desktop\ReachQuix\ReachQuixBackend
npx prisma studio
```

---

## 7. Production Deployment Guide

When ready to deploy:
- **Main User App (`https://www.reachquix.com/`):** Built from `ReachQuixUser` via `npm run build` (outputs to `dist/`).
- **Admin Panel (`https://admin.reachquix.com/`):** Deployed with admin privileges and connected to the backend API.
- **Backend Server:** Host `ReachQuixBackend` on a cloud VPS (e.g. Ubuntu with PM2 + Nginx reverse proxy + MySQL or AWS RDS / DigitalOcean Managed DB).

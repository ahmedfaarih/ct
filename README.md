# Contract Triage

An internal digital tool for handling incoming contract review requests in a consistent, structured, and efficient way. Built as a university PoC for an IT Law course at Corvinus University of Budapest.

---

## What It Does

Legal teams receive contracts through an intake form. The system automatically classifies the contract, scores its risk, routes it to the right legal team, assigns it to the responsible reviewer, and produces an AI-powered clause analysis — all without manual steps.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS — monochrome light theme |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
| Auth & Database | Supabase (Postgres + Auth + RLS) |
| Deployment | Netlify (`@netlify/plugin-nextjs`) |

---

## Features Built

### Contract Intake
- **Two submission modes**: Upload a PDF (Gemini extracts all details automatically) or fill in the form manually
- **PDF upload**: 5 MB limit enforced client- and server-side; Gemini extracts contract type, counterparty, risk factors, value, deadline, full text, and clause analysis in a single call
- **Manual mode**: Guided form covering contract type, counterparty, department, estimated value, deadline, contract status (new/renewal/amendment), risk factors, contract text (paste), and notes

### AI Clause Analysis
- Runs automatically on every submission — no manual trigger
- Powered by Gemini 2.5 Flash
- Extracts key clauses with risk level (low / medium / high) and a one-sentence review note per clause
- PDF mode and paste mode both produce clause results

### Triage Engine
- Risk score computed from weighted risk factors (personal data, uncapped liability, exclusivity, government entity, IP transfer, high value, cross-border, auto-renewal)
- Deadline proximity bonus applied (+3 if < 5 days, +1 if < 14 days)
- Urgency levels: **Low**, **Medium**, **High**, **Critical**
- Routing by contract type with risk factor overrides (e.g. personal data → DPO, IP transfer → IP Legal)
- Critical contracts get Senior Counsel Escalation appended to route

### Auto-Assignment
- Admin assigns contract types to reviewers/admins via the Admin panel
- On submission, the contract is automatically assigned to the reviewer whose case types include the submitted contract type
- Manual reassignment available for reviewers and admins from the contract detail view and the contracts list

### Version Control
- Each contract keeps a full version history (`v1`, `v2`, `v3`, ...)
- Users can submit new versions with updated PDF or text — AI re-analysis runs automatically on each new version
- Version timeline shown in the contract detail view

### Contract List
- Sortable by urgency (Critical → High → Medium → Low)
- Reviewers and admins can filter by "All" or "Assigned to me"
- Urgency stats shown inline
- Click **View** on any row to open the full triage result for that contract

### Roles & Access Control

| Role | Submit | See Own | See All | Update Checklist | Assign | Admin Panel |
|------|--------|---------|---------|-----------------|--------|-------------|
| Requestor | Yes | Yes | No | No | No | No |
| Reviewer | Yes | Yes | Yes | Yes | Yes | No |
| Admin | Yes | Yes | Yes | Yes | Yes | Yes |

All access enforced by Supabase Row Level Security — no client-side bypass possible.

### Admin Panel
- **User Management**: View all registered users, change roles, reset passwords
- **Case Type Assignments**: Assign one or more contract types to each reviewer/admin; contracts auto-route to the matched reviewer on submission

### Review Checklist
- Each contract gets a triage-generated checklist based on its type and risk factors
- Reviewers can tick off items — progress saved to the database in real time

---

## Database Schema

Five tables in Supabase Postgres:

| Table | Purpose |
|-------|---------|
| `profiles` | Extends `auth.users` — stores name, role, department |
| `contracts` | Main contract record — triage output, assignment, current version |
| `contract_versions` | Full history of each version submitted per contract |
| `reviewer_contract_types` | Junction table — which contract types each reviewer handles |

Row Level Security enabled on all tables. A `get_my_role()` security-definer function prevents recursive RLS on the profiles table.

---

## Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx                  # New intake form + post-submission triage result
│   │   └── contracts/page.tsx        # Contract list with View-to-detail
│   ├── admin/page.tsx                # Admin panel (admin role only)
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── api/
│       ├── contracts/submit/         # POST — intake, AI analysis, triage, auto-assign
│       ├── contracts/[id]/versions/  # POST/GET — new version submission + history
│       ├── contracts/[id]/assign/    # PATCH — manual assignment
│       ├── officers/                 # GET — list of assignable reviewers/admins
│       ├── admin/users/              # GET/PATCH — user management
│       ├── admin/reviewer-types/     # GET/PUT — case type assignments
│       └── analyze/                  # POST — standalone clause analysis
├── components/
│   ├── IntakeForm.tsx                # Upload PDF or fill manually
│   ├── TriageResult.tsx              # Full contract detail view
│   ├── ContractList.tsx              # List + inline detail view
│   ├── AdminPanel.tsx                # User management + case type assignment
│   ├── AssignDropdown.tsx            # Reusable assignment widget
│   ├── ClauseAnalysis.tsx            # AI clause results display
│   ├── VersionHistory.tsx            # Version timeline
│   ├── NewVersionForm.tsx            # Submit new version (PDF or text)
│   └── Navbar.tsx
└── lib/
    ├── triage.ts                     # Risk scoring, urgency, routing logic
    ├── constants.ts                  # Contract types, risk factors, weights
    └── types.ts                      # TypeScript interfaces
```

---

## Setup

### 1. Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Database

Run `supabase/schema.sql` in the Supabase SQL Editor (Dashboard → SQL Editor → New Query). The file is idempotent and can be re-run safely.

### 3. Run locally

```bash
npm install
npm run dev
```

---

## Deployment

Deployed to Netlify. Set the four environment variables above in the Netlify dashboard under Site → Environment Variables.

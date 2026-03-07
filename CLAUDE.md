# Contract Triage — Contract Review Intake & Triage PoC

## What This Project Is

An internal digital tool that helps organizations handle incoming contract review requests in a consistent, structured, and efficient way. It is a **Next.js** app deploying to **Netlify**, with AI-powered clause extraction via the **Google Gemini API**, and **Supabase** for authentication and persistent storage.

This is a university PoC (Proof of Concept) for an IT Law course at Corvinus University of Budapest. The quality bar is "polished, demo-ready, and presentation-worthy."

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | **Next.js 14+ (App Router)** | TypeScript, `src/` directory |
| Styling | **Tailwind CSS** | Light monochrome theme, professional legal/enterprise aesthetic |
| AI | **Google Gemini 2.5 Flash** via `@google/genai` | Called from Next.js API routes (server-side only) |
| Auth & DB | **Supabase** (Postgres + Auth) | Email/password auth, role-based access, persistent contracts |
| Deployment | **Netlify** | Using `@netlify/plugin-nextjs` |

---

## Project Structure (Target)

```
contract-triage/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout — dark theme, fonts
│   │   ├── page.tsx                  # Landing / redirect based on auth
│   │   ├── globals.css               # Tailwind + custom CSS variables
│   │   ├── login/
│   │   │   └── page.tsx              # Login page (email + password)
│   │   ├── signup/
│   │   │   └── page.tsx              # Sign-up page (email + password + role selection)
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Main app — intake form, triage results, contract list
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts          # Supabase auth callback handler
│   │   └── api/
│   │       └── analyze/
│   │           └── route.ts          # POST — Gemini AI clause analysis
│   ├── components/
│   │   ├── IntakeForm.tsx            # Guided contract intake form
│   │   ├── TriageResult.tsx          # Triage output: summary, routing, checklist
│   │   ├── ContractList.tsx          # All submitted contracts (replaces old Dashboard)
│   │   ├── ClauseAnalysis.tsx        # AI clause extraction results
│   │   ├── Navbar.tsx                # Top nav — logo, nav items, user info, logout
│   │   ├── AuthForm.tsx              # Shared login/signup form component
│   │   └── ui/                       # Reusable primitives (Button, Card, Badge, Input, etc.)
│   ├── lib/
│   │   ├── triage.ts                # Triage logic: risk scoring, urgency, routing
│   │   ├── constants.ts             # Contract types, risk factors, routing maps, roles
│   │   ├── types.ts                 # TypeScript interfaces
│   │   └── supabase/
│   │       ├── client.ts            # Browser Supabase client
│   │       └── server.ts            # Server Supabase client
│   └── middleware.ts                 # Root middleware — refreshes Supabase auth tokens
├── supabase/
│   └── schema.sql                    # Database schema (run in Supabase SQL Editor)
├── public/
├── netlify.toml
├── .env.local                        # Secrets (never commit)
├── .env.example
├── CLAUDE.md                         # This file
└── package.json
```

---

## Supabase Setup

### Packages

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
GEMINI_API_KEY=your_gemini_key
```

> **Note:** Supabase is transitioning from `anon` keys to `publishable` keys. Use whichever your project dashboard shows. Both work with the same env var name. Find these in your Supabase project's Connect dialog or API Settings.

### Database Schema (`supabase/schema.sql`)

Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query):

```sql
-- ============================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'requestor' CHECK (role IN ('requestor', 'reviewer', 'admin')),
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'requestor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CONTRACTS TABLE
-- ============================================
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id TEXT NOT NULL UNIQUE,
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  contract_type TEXT NOT NULL,
  type_label TEXT NOT NULL,
  counterparty TEXT NOT NULL,
  department TEXT,
  estimated_value TEXT,
  deadline DATE,
  is_renewal TEXT,
  risk_factors TEXT[] DEFAULT '{}',
  notes TEXT,
  contract_text TEXT,
  file_name TEXT,
  urgency TEXT NOT NULL CHECK (urgency IN ('Low', 'Medium', 'High', 'Critical')),
  risk_score INTEGER NOT NULL DEFAULT 0,
  route TEXT NOT NULL,
  clause_results JSONB DEFAULT '[]',
  checklist JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read own, admins can read all
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Contracts: requestors see own, reviewers/admins see all
CREATE POLICY "Requestors can insert contracts"
  ON public.contracts FOR INSERT WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Requestors see own contracts"
  ON public.contracts FOR SELECT USING (auth.uid() = submitted_by);

CREATE POLICY "Reviewers and admins see all contracts"
  ON public.contracts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('reviewer', 'admin')));

CREATE POLICY "Reviewers and admins can update contracts"
  ON public.contracts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('reviewer', 'admin')));
```

### Roles

| Role | Can Submit | Sees Own | Sees All | Can Update Checklist |
|------|-----------|----------|----------|---------------------|
| `requestor` | ✅ | ✅ | ❌ | ❌ |
| `reviewer` | ✅ | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ | ✅ |

Role is passed during signup via `raw_user_meta_data` and stored in `profiles` by the DB trigger.

---

### Supabase Client Utilities

#### Browser client (`src/lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

#### Server client (`src/lib/supabase/server.ts`)

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore — called from Server Component
          }
        },
      },
    }
  );
}
```

#### Middleware (`src/middleware.ts`)

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/signup") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### Auth Callback (`src/app/auth/callback/route.ts`)

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

### Key Auth Patterns

**Sign Up (with role):**
```typescript
await supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: name, role: selectedRole } },
});
```

**Sign In:**
```typescript
await supabase.auth.signInWithPassword({ email, password });
```

**Sign Out:**
```typescript
await supabase.auth.signOut();
```

**Get User + Profile:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from("profiles").select("*").eq("id", user.id).single();
```

**Save Contract:**
```typescript
await supabase.from("contracts").insert({
  case_id: triage.caseId,
  submitted_by: user.id,
  contract_type: formData.contractType,
  type_label: formData.typeName,
  counterparty: formData.counterparty,
  department: formData.department || null,
  estimated_value: formData.value || null,
  deadline: formData.deadline || null,
  is_renewal: formData.isRenewal || null,
  risk_factors: formData.riskFactors,
  notes: formData.notes || null,
  contract_text: formData.contractText || null,
  file_name: formData.fileName || null,
  urgency: triage.urgency,
  risk_score: triage.riskScore,
  route: triage.route,
  clause_results: formData.clauseResults || [],
  checklist: triage.checklist,
}).select().single();
```

**Fetch Contracts (RLS handles visibility):**
```typescript
const { data } = await supabase
  .from("contracts").select("*").order("created_at", { ascending: false });
```

---

## Gemini API Integration

### Setup

```bash
npm install @google/genai
```

### API Route (`src/app/api/analyze/route.ts`)

```typescript
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { contractText } = await req.json();
    if (!contractText || contractText.trim().length < 20) {
      return NextResponse.json({ error: "Contract text too short" }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a legal contract analysis assistant. Analyze the following contract text and extract key clauses. For each clause found, provide:
- clause: name of the clause (e.g., "Liability", "Indemnification", "Termination")
- risk: "low", "medium", or "high"
- detail: one sentence explaining what to check

Respond ONLY with a JSON array, no markdown, no backticks, no preamble.
Example: [{"clause":"Liability","risk":"high","detail":"Contains uncapped liability — verify caps and exclusions."}]

Contract text:
${contractText}`,
    });

    const text = response.text?.replace(/```json|```/g, "").trim();
    const clauses = JSON.parse(text || "[]");
    return NextResponse.json({ clauses });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
```

### Gemini Notes

- **Model:** `gemini-2.5-flash` (stable)
- **SDK:** `@google/genai` (latest, replaces older `@google/generative-ai`)
- **EU access:** Requires billing enabled on Google Cloud (€0.01 budget alert)
- **Key must stay server-side** — only call from `src/app/api/` routes

---

## Core Business Logic

### Contract Types

`nda`, `saas`, `service`, `employment`, `dpa`, `procurement`, `partnership`, `other` — no icons or emojis.

### Urgency Calculation

```
riskScore = sum of weights: value_high(2), personal_data(2), cross_border(1),
            gov_entity(2), ip_transfer(1), auto_renew(1), exclusivity(2), liability_uncapped(3)
deadlineBonus = +3 if < 5 days, +1 if < 14 days
total = riskScore + deadlineBonus
Low < 3, Medium 3-4, High 5-7, Critical >= 8
```

### Routing

Default by contract type → overridden by risk factors (personal_data → DPO, gov_entity → Public Sector, ip_transfer → IP Legal). Critical → append Senior Counsel Escalation.

---

## App Pages & Auth Flow

| Route | Auth | Who | Purpose |
|-------|------|-----|---------|
| `/login` | No | Everyone | Email/password login |
| `/signup` | No | Everyone | Register with role selection |
| `/dashboard` | Yes | All roles | Main app: intake, results, list |
| `/auth/callback` | No | System | Auth code exchange |
| `/api/analyze` | Yes | All roles | Gemini clause analysis |

---

## Design Direction

- **Theme:** Monochrome light — white/light-gray background, dark text. No color accents.
- **Palette:**
  - Page background: `#f5f5f5`
  - Surface / card: `#ffffff`
  - Border: `neutral-200` (`#e5e5e5`)
  - Text primary: `neutral-900` (`#171717`)
  - Text secondary: `neutral-500` (`#737373`)
  - Text muted: `neutral-400` (`#a3a3a3`)
  - Input background: `#ffffff`
  - Input border: `neutral-200`, focus: `neutral-400`
  - Button primary: `neutral-900` background, white text
  - Button hover: `neutral-700`
- **Font:** IBM Plex Sans + IBM Plex Mono
- **Urgency:** Expressed through typography weight and border intensity only — no color. Critical uses inverted (white bg / black text).
- **Navigation:** Sticky top bar with user name, role badge (gray pill), logout
- **No emojis anywhere in the application** — no icons in contract type lists, no decorative emoji in UI copy, no emoji in labels or badges. Use plain text only.
- **Aesthetic:** Professional, enterprise legal tool. Minimal. No rounded-2xl bubbles — prefer `rounded-lg` or `rounded`. No gradients. No shadows heavier than `shadow-sm`.

---

## Netlify Config

### `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Set env vars on Netlify: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GEMINI_API_KEY`.

---

## Key Rules

1. **Gemini key stays server-side.** Supabase publishable key is safe client-side (RLS protects data).
2. **All data goes through Supabase RLS.** Never bypass row-level security.
3. **Graceful AI failures.** Show "Analysis unavailable" if Gemini fails.
4. **TypeScript everywhere.** Interfaces in `lib/types.ts`.
5. **Dark theme only.**
6. **No localStorage** — Supabase handles sessions via cookies.
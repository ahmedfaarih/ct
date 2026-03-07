-- ============================================================
-- CONTRACT TRIAGE — DATABASE SCHEMA
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- CONTRACTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contracts (
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

-- ============================================================
-- SECURITY DEFINER HELPER — avoids recursive RLS on profiles
-- ============================================================
-- This function reads the role WITHOUT triggering RLS policies,
-- which prevents infinite recursion in policies that reference
-- the profiles table from within the profiles table.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (safe to re-run)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Requestors can insert contracts" ON public.contracts;
DROP POLICY IF EXISTS "Requestors see own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Reviewers and admins see all contracts" ON public.contracts;
DROP POLICY IF EXISTS "Reviewers and admins can update contracts" ON public.contracts;

-- PROFILES policies
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Uses get_my_role() to avoid querying profiles inside a profiles policy
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- CONTRACTS policies
CREATE POLICY "Requestors can insert contracts"
  ON public.contracts FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Requestors see own contracts"
  ON public.contracts FOR SELECT
  USING (auth.uid() = submitted_by);

CREATE POLICY "Reviewers and admins see all contracts"
  ON public.contracts FOR SELECT
  USING (public.get_my_role() IN ('reviewer', 'admin'));

CREATE POLICY "Reviewers and admins can update contracts"
  ON public.contracts FOR UPDATE
  USING (public.get_my_role() IN ('reviewer', 'admin'));

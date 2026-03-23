"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-neutral-900 text-white",
  reviewer: "border border-neutral-400 text-neutral-600",
  requestor: "border border-neutral-300 text-neutral-500",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  reviewer: "Reviewer",
  requestor: "Requestor",
};

export default function Navbar({ contractCount }: { contractCount?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data && !error) {
      setProfile(data as Profile);
      return;
    }

    // Fallback: build a profile from auth metadata when the DB query fails
    // (e.g. profiles table not yet seeded, or RLS misconfiguration)
    setProfile({
      id: user.id,
      email: user.email ?? "",
      full_name: (user.user_metadata?.full_name as string) ?? null,
      role: (user.user_metadata?.role as Profile["role"]) ?? "requestor",
      department: null,
      created_at: user.created_at,
    });
  }, [supabase]);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Global auth state listener — handles sign-out and session expiry
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        if (event === "SIGNED_OUT") {
          setProfile(null);
          router.push("/login");
          router.refresh();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    // onAuthStateChange SIGNED_OUT will handle the redirect
  }

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`text-sm px-3 py-1.5 rounded transition ${
          active
            ? "text-neutral-900 bg-neutral-100 font-medium"
            : "text-neutral-500 hover:text-neutral-900"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-7 h-7 bg-neutral-900 flex items-center justify-center rounded-sm">
            <span className="text-white text-xs font-bold font-mono leading-none">CT</span>
          </div>
          <span className="text-sm font-semibold text-neutral-900 tracking-tight">
            Contract Triage
          </span>
          <span className="text-xs font-mono text-neutral-400 border border-neutral-200 px-1.5 py-0.5 rounded">
            PoC v1.0
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLink("/dashboard", "New Intake")}
          {navLink(
            "/dashboard/contracts",
            contractCount !== undefined
              ? `Contracts (${contractCount})`
              : "Contracts"
          )}
          {profile?.role === "admin" && navLink("/admin", "Admin")}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-4">
          {profile ? (
            <>
              <div className="flex items-center gap-2.5">
                <span className="text-sm text-neutral-700 font-medium">
                  {profile.full_name || profile.email}
                </span>
                <span
                  className={`text-xs font-medium font-mono px-2 py-0.5 rounded ${
                    ROLE_BADGE[profile.role] ?? ROLE_BADGE.requestor
                  }`}
                >
                  {ROLE_LABEL[profile.role] ?? profile.role}
                </span>
              </div>

              <div className="w-px h-4 bg-neutral-200" />

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-sm text-neutral-400 hover:text-neutral-900 disabled:opacity-40 transition"
              >
                {loggingOut ? "Signing out..." : "Sign out"}
              </button>
            </>
          ) : (
            <div className="h-4 w-32 bg-neutral-100 rounded animate-pulse" />
          )}
        </div>
      </div>
    </header>
  );
}

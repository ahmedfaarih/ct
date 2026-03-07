"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

interface AuthFormProps {
  mode: Mode;
}

const ROLES = [
  { id: "requestor", label: "Requestor", description: "Submit contracts for review" },
  { id: "reviewer", label: "Reviewer", description: "Review and manage all contracts" },
  { id: "admin", label: "Admin", description: "Full access and administration" },
];

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("requestor");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role },
          },
        });
        if (error) throw error;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase tracking-widest mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Jane Smith"
            className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded text-neutral-900 placeholder-neutral-400 text-sm focus:outline-none focus:border-neutral-400 transition"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-widest mb-1.5">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded text-neutral-900 placeholder-neutral-400 text-sm focus:outline-none focus:border-neutral-400 transition"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-widest mb-1.5">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Minimum 6 characters"
          minLength={6}
          className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded text-neutral-900 placeholder-neutral-400 text-sm focus:outline-none focus:border-neutral-400 transition"
        />
      </div>

      {mode === "signup" && (
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase tracking-widest mb-2">
            Role
          </label>
          <div className="space-y-1.5">
            {ROLES.map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded border cursor-pointer transition ${
                  role === r.id
                    ? "border-neutral-400 bg-neutral-50"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r.id}
                  checked={role === r.id}
                  onChange={() => setRole(r.id)}
                  className="accent-neutral-900"
                />
                <div>
                  <p className="text-sm font-medium text-neutral-900">{r.label}</p>
                  <p className="text-xs text-neutral-400">{r.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 py-2.5 rounded border border-neutral-200 bg-neutral-50 text-neutral-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded transition"
      >
        {loading
          ? mode === "login"
            ? "Signing in..."
            : "Creating account..."
          : mode === "login"
          ? "Sign In"
          : "Create Account"}
      </button>
    </form>
  );
}

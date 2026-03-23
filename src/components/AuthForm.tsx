"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

interface AuthFormProps {
  mode: Mode;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
            data: { full_name: fullName, role: "requestor" },
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

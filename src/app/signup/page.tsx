import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-3">
            Contract Triage
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900">Create account</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Join your organisation&apos;s contract review workspace
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
          <AuthForm mode="signup" />

          <div className="mt-5 pt-5 border-t border-neutral-100 text-center">
            <p className="text-sm text-neutral-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-neutral-900 hover:text-neutral-600 font-medium transition"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          IT Law PoC — Corvinus University of Budapest
        </p>
      </div>
    </main>
  );
}

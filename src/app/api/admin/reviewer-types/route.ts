import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

function serviceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getCallerRole(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* ignore */ }
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  return profile?.role ?? null;
}

// GET — returns all reviewer_contract_types rows
// Response: { assignments: { reviewer_id: string; contract_type: string }[] }
export async function GET() {
  const role = await getCallerRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = serviceClient();
  const { data, error } = await admin
    .from("reviewer_contract_types")
    .select("reviewer_id, contract_type");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data });
}

// PUT — replaces all contract types for a given user
// Body: { userId: string; contractTypes: string[] }
export async function PUT(req: NextRequest) {
  const role = await getCallerRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, contractTypes } = await req.json() as {
    userId: string;
    contractTypes: string[];
  };

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const admin = serviceClient();

  // Delete existing, then insert new
  const { error: deleteError } = await admin
    .from("reviewer_contract_types")
    .delete()
    .eq("reviewer_id", userId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  if (contractTypes.length > 0) {
    const rows = contractTypes.map((ct) => ({ reviewer_id: userId, contract_type: ct }));
    const { error: insertError } = await admin
      .from("reviewer_contract_types")
      .insert(rows);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

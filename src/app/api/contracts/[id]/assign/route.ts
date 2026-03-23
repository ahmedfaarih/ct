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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params;

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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only reviewer/admin can assign
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["reviewer", "admin"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { assignedTo: string | null };
  const admin = serviceClient();

  // Validate assignee is a reviewer/admin (if not null/unassigned)
  if (body.assignedTo) {
    const { data: assignee } = await admin
      .from("profiles")
      .select("role")
      .eq("id", body.assignedTo)
      .single();

    if (!assignee || !["reviewer", "admin"].includes(assignee.role)) {
      return NextResponse.json({ error: "Assignee must be a reviewer or admin" }, { status: 400 });
    }
  }

  const { data: contract, error } = await admin
    .from("contracts")
    .update({ assigned_to: body.assignedTo ?? null, updated_at: new Date().toISOString() })
    .eq("id", contractId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve the assigned officer's display name
  let assignedOfficerName: string | null = null;
  if (body.assignedTo) {
    const { data: officer } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", body.assignedTo)
      .single();
    assignedOfficerName = officer?.full_name || officer?.email || null;
  }

  return NextResponse.json({ contract, assignedOfficerName });
}

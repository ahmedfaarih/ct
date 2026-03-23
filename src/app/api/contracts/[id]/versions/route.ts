import { createClient as createAdminClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { ClauseResult } from "@/lib/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function serviceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function runGeminiAnalysis(contractText: string): Promise<ClauseResult[]> {
  try {
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
    return JSON.parse(text || "[]");
  } catch {
    return [];
  }
}

async function runGeminiPdfAnalysis(pdfBase64: string): Promise<{ contractText: string; clauseResults: ClauseResult[] }> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            {
              text: `You are a legal contract analysis assistant. Extract the full contract text from this PDF, then identify key clauses.

Respond ONLY with a JSON object, no markdown, no backticks, no preamble:
{"extractedText":"<full contract text>","clauses":[{"clause":"...","risk":"low|medium|high","detail":"..."}]}`,
            },
          ],
        },
      ],
    });
    const raw = response.text?.replace(/```json|```/g, "").trim() ?? "{}";
    const parsed = JSON.parse(raw);
    return {
      contractText: parsed.extractedText ?? "",
      clauseResults: Array.isArray(parsed.clauses) ? parsed.clauses : [],
    };
  } catch {
    return { contractText: "", clauseResults: [] };
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params;

  // Verify auth
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
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = serviceClient();

  // Fetch existing contract
  const { data: contract, error: fetchError } = await admin
    .from("contracts")
    .select("id, submitted_by, current_version")
    .eq("id", contractId)
    .single();

  if (fetchError || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  // Only the original submitter or a reviewer/admin can add versions
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isPrivileged = profile?.role === "reviewer" || profile?.role === "admin";
  if (contract.submitted_by !== user.id && !isPrivileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fd = await req.formData();

  const pdfFile = fd.get("file") as File | null;

  if (pdfFile && pdfFile.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 400 });
  }

  let contractText = (fd.get("contractText") as string | null) ?? "";
  const notes = (fd.get("notes") as string | null) ?? null;
  let clauseResults: ClauseResult[] = [];

  if (pdfFile && pdfFile.size > 0) {
    const buffer = Buffer.from(await pdfFile.arrayBuffer());
    const result = await runGeminiPdfAnalysis(buffer.toString("base64"));
    contractText = result.contractText;
    clauseResults = result.clauseResults;
  } else if (contractText.trim().length >= 20) {
    clauseResults = await runGeminiAnalysis(contractText);
  }

  const fileName = (fd.get("fileName") as string | null) ?? pdfFile?.name ?? null;

  const newVersion = (contract.current_version ?? 1) + 1;

  // Update the main contract record
  const { data: updated, error: updateError } = await admin
    .from("contracts")
    .update({
      contract_text: contractText || null,
      file_name: fileName,
      clause_results: clauseResults,
      current_version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Insert version record
  await admin.from("contract_versions").insert({
    contract_id: contractId,
    version_number: newVersion,
    contract_text: contractText || null,
    file_name: fileName,
    notes: notes || null,
    submitted_by: user.id,
    clause_results: clauseResults,
  });

  return NextResponse.json({ contract: updated });
}

export async function GET(
  _req: NextRequest,
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
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS handles visibility — use user client here
  const { data: versions, error } = await supabase
    .from("contract_versions")
    .select("*")
    .eq("contract_id", contractId)
    .order("version_number", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ versions });
}

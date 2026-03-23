import { createClient as createAdminClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { computeTriage } from "@/lib/triage";
import { CONTRACT_TYPES } from "@/lib/constants";
import type { ContractForm, ClauseResult } from "@/lib/types";

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

interface PdfExtraction {
  contractType: string;
  counterparty: string;
  estimatedValue: string;
  deadline: string;
  riskFactors: string[];
  contractText: string;
  clauseResults: ClauseResult[];
}

async function runGeminiPdfAnalysis(pdfBase64: string): Promise<PdfExtraction> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            {
              text: `You are a legal contract analysis assistant. Read this PDF contract and extract all of the following.

Respond ONLY with a JSON object, no markdown, no backticks, no preamble:
{
  "contractType": "one of: nda | saas | service | employment | dpa | procurement | partnership | other",
  "counterparty": "the other party's name",
  "estimatedValue": "monetary value if stated, else empty string",
  "deadline": "YYYY-MM-DD if a review or expiry deadline is stated, else empty string",
  "riskFactors": ["array of applicable ids from: value_high, personal_data, cross_border, gov_entity, ip_transfer, auto_renew, exclusivity, liability_uncapped"],
  "extractedText": "full contract text verbatim",
  "clauses": [{"clause":"...","risk":"low|medium|high","detail":"one sentence explaining what to check"}]
}`,
            },
          ],
        },
      ],
    });
    const raw = response.text?.replace(/```json|```/g, "").trim() ?? "{}";
    const parsed = JSON.parse(raw);
    return {
      contractType: parsed.contractType ?? "other",
      counterparty: parsed.counterparty ?? "Unknown",
      estimatedValue: parsed.estimatedValue ?? "",
      deadline: parsed.deadline ?? "",
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
      contractText: parsed.extractedText ?? "",
      clauseResults: Array.isArray(parsed.clauses) ? parsed.clauses : [],
    };
  } catch {
    return { contractType: "other", counterparty: "Unknown", estimatedValue: "", deadline: "", riskFactors: [], contractText: "", clauseResults: [] };
  }
}

export async function POST(req: NextRequest) {
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
          } catch { /* ignore in route handler */ }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fd = await req.formData();

  const pdfFile = fd.get("file") as File | null;

  // Server-side 5 MB guard
  if (pdfFile && pdfFile.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 400 });
  }

  let contractType: string;
  let counterparty: string;
  let contractText: string;
  let clauseResults: ClauseResult[];
  let extractedValue: string | undefined;
  let extractedDeadline: string | undefined;
  let extractedRiskFactors: string[];
  const fileName = pdfFile?.name ?? (fd.get("fileName") as string | null) ?? null;

  if (pdfFile && pdfFile.size > 0) {
    // PDF path — Gemini extracts everything
    const buffer = Buffer.from(await pdfFile.arrayBuffer());
    const extracted = await runGeminiPdfAnalysis(buffer.toString("base64"));
    contractType = extracted.contractType;
    counterparty = extracted.counterparty;
    contractText = extracted.contractText;
    clauseResults = extracted.clauseResults;
    extractedValue = extracted.estimatedValue || undefined;
    extractedDeadline = extracted.deadline || undefined;
    extractedRiskFactors = extracted.riskFactors;
  } else {
    // Manual path — use form fields
    contractType = (fd.get("contractType") as string | null) ?? "";
    counterparty = (fd.get("counterparty") as string | null) ?? "";
    if (!contractType || !counterparty.trim()) {
      return NextResponse.json({ error: "contractType and counterparty are required" }, { status: 400 });
    }
    contractText = (fd.get("contractText") as string | null) ?? "";
    clauseResults = contractText.trim().length >= 20 ? await runGeminiAnalysis(contractText) : [];
    extractedValue = (fd.get("value") as string | null) || undefined;
    extractedDeadline = (fd.get("deadline") as string | null) || undefined;
    extractedRiskFactors = fd.getAll("riskFactors") as string[];
  }

  // Resolve type label
  const selectedType = CONTRACT_TYPES.find((t) => t.id === contractType);
  const formData: ContractForm = {
    contractType,
    typeName: selectedType?.label ?? contractType,
    counterparty: counterparty.trim(),
    department: (fd.get("department") as string | null) || undefined,
    value: extractedValue,
    deadline: extractedDeadline,
    isRenewal: (fd.get("isRenewal") as string | null) || undefined,
    riskFactors: extractedRiskFactors,
    notes: (fd.get("notes") as string | null) || undefined,
    contractText: contractText || undefined,
    fileName: fileName || undefined,
  };

  // Compute triage
  const triage = computeTriage(formData);

  // Auto-assign: find reviewer/admin whose assigned case types include this contract type
  const admin = serviceClient();
  let assignedTo: string | null = null;

  const { data: typeAssignments } = await admin
    .from("reviewer_contract_types")
    .select("reviewer_id")
    .eq("contract_type", formData.contractType)
    .limit(1);

  if (typeAssignments && typeAssignments.length > 0) {
    assignedTo = typeAssignments[0].reviewer_id;
  }

  // Insert contract
  const { data: contract, error: contractError } = await admin
    .from("contracts")
    .insert({
      case_id: triage.caseId,
      submitted_by: user.id,
      assigned_to: assignedTo,
      current_version: 1,
      contract_type: formData.contractType,
      type_label: formData.typeName,
      counterparty: formData.counterparty,
      department: formData.department ?? null,
      estimated_value: formData.value ?? null,
      deadline: formData.deadline ?? null,
      is_renewal: formData.isRenewal ?? null,
      risk_factors: formData.riskFactors,
      notes: formData.notes ?? null,
      contract_text: formData.contractText ?? null,
      file_name: formData.fileName ?? null,
      urgency: triage.urgency,
      risk_score: triage.riskScore,
      route: triage.route,
      clause_results: clauseResults,
      checklist: triage.checklist,
    })
    .select()
    .single();

  if (contractError) {
    return NextResponse.json({ error: contractError.message }, { status: 500 });
  }

  // Insert version 1
  await admin.from("contract_versions").insert({
    contract_id: contract.id,
    version_number: 1,
    contract_text: formData.contractText ?? null,
    file_name: formData.fileName ?? null,
    notes: formData.notes ?? null,
    submitted_by: user.id,
    clause_results: clauseResults,
  });

  // Fetch assigned officer name if assigned
  let assignedOfficerName: string | null = null;
  if (assignedTo) {
    const { data: officer } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", assignedTo)
      .single();
    assignedOfficerName = officer?.full_name || officer?.email || null;
  }

  return NextResponse.json({ contract, assignedOfficerName });
}

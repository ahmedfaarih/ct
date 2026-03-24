export const maxDuration = 120;

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

function extractJSONArray(text: string | undefined): string {
  if (!text) return "[]";
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  return match ? match[0] : cleaned;
}

function extractJSONObject(text: string | undefined): string {
  if (!text) return "{}";
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

async function runGeminiAnalysis(contractText: string): Promise<ClauseResult[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a legal contract review assistant. Analyze the following contract text and identify the key named legal clauses or provisions.

For each clause, provide:
- clause: short name of the clause (2-5 words, e.g. "Payment Terms", "Liability Cap", "Termination Rights", "Confidentiality", "Governing Law")
- risk: "low", "medium", or "high" based on legal risk to the reviewing party
- detail: one sentence explaining the key concern or what to verify

Rules:
- Only return named legal provisions, NOT raw paragraph text or sentence fragments
- Identify 5-15 key clauses only
- Each "clause" value must be a concise named provision, not a full sentence

Respond ONLY with a JSON array, no markdown, no backticks, no preamble.
Example: [{"clause":"Liability Cap","risk":"high","detail":"Liability is capped at contract value only — verify this is sufficient."}]

Contract text:
${contractText}`,
    });
    const parsed = JSON.parse(extractJSONArray(response.text));
    return Array.isArray(parsed) ? parsed : [];
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
  const pdfPart = { inlineData: { mimeType: "application/pdf" as const, data: pdfBase64 } };

  // Run both calls in parallel to cut total latency roughly in half
  const [metaResult, clauseResult] = await Promise.allSettled([
    ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            pdfPart,
            {
              text: `You are a legal contract analysis assistant. Read this PDF contract and extract the following fields.

Respond ONLY with a JSON object, no markdown, no backticks, no preamble:
{
  "contractType": "one of: nda | saas | service | employment | dpa | procurement | partnership | other",
  "counterparty": "full legal name of the counterparty (the other party in this agreement, not the party who submitted it)",
  "estimatedValue": "total contract value if stated (e.g. 'USD 50,000'), else empty string",
  "deadline": "contract expiry or review deadline in YYYY-MM-DD format, else empty string",
  "riskFactors": ["use only these exact ids where applicable: value_high, personal_data, cross_border, gov_entity, ip_transfer, auto_renew, exclusivity, liability_uncapped"],
  "contractText": "first 2000 characters of the contract body text"
}

Risk factor definitions:
- value_high: contract value exceeds $100,000 USD equivalent
- personal_data: involves processing of personal or private data
- cross_border: parties or services span multiple countries
- gov_entity: a government agency or public sector body is a party
- ip_transfer: involves transfer or licensing of intellectual property
- auto_renew: contract automatically renews unless notice is given
- exclusivity: contains exclusivity or non-compete provisions
- liability_uncapped: liability is unlimited or not capped at a fixed amount`,
            },
          ],
        },
      ],
    }),
    ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            pdfPart,
            {
              text: `You are a legal contract review assistant. Read this contract and identify its key named legal clauses or provisions.

For each clause provide:
- clause: short name (2-5 words, e.g. "Payment Terms", "Liability Cap", "Termination Rights", "Confidentiality", "Governing Law", "Dispute Resolution", "Indemnification", "Warranty", "Force Majeure")
- risk: "low", "medium", or "high" based on legal risk to the reviewing party
- detail: one sentence explaining the key concern or what to verify

Rules:
- Only return named legal provisions, NOT raw paragraph text, party names, or sentence fragments
- Identify 5-15 key clauses
- Each "clause" value must be a concise 2-5 word name, never a full sentence

Respond ONLY with a JSON array, no markdown, no backticks, no preamble.
Example: [{"clause":"Liability Cap","risk":"high","detail":"Liability is capped at contract value only — verify adequacy."}]`,
            },
          ],
        },
      ],
    }),
  ]);

  let meta = { contractType: "other", counterparty: "", estimatedValue: "", deadline: "", riskFactors: [] as string[], contractText: "" };
  if (metaResult.status === "fulfilled") {
    try {
      const parsed = JSON.parse(extractJSONObject(metaResult.value.text));
      meta = {
        contractType: parsed.contractType ?? "other",
        counterparty: parsed.counterparty ?? "",
        estimatedValue: parsed.estimatedValue ?? "",
        deadline: parsed.deadline ?? "",
        riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
        contractText: parsed.contractText ?? "",
      };
    } catch { /* meta stays at defaults */ }
  }

  let clauseResults: ClauseResult[] = [];
  if (clauseResult.status === "fulfilled") {
    try {
      const parsed = JSON.parse(extractJSONArray(clauseResult.value.text));
      clauseResults = Array.isArray(parsed) ? parsed : [];
    } catch { /* clauseResults stays empty */ }
  }

  return { ...meta, clauseResults };
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

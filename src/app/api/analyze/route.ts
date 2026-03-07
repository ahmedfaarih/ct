import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  // Require authenticated session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { contractText } = await req.json();

    if (!contractText || contractText.trim().length < 20) {
      return NextResponse.json(
        { error: "Contract text too short" },
        { status: 400 }
      );
    }

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
    const clauses = JSON.parse(text || "[]");
    return NextResponse.json({ clauses });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}

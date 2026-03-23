"use client";

import { useState } from "react";
import type { Contract } from "@/lib/types";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";

interface Props {
  contractId: string;
  onSuccess: (updated: Contract) => void;
  onCancel: () => void;
}

export default function NewVersionForm({ contractId, onSuccess, onCancel }: Props) {
  const [contractText, setContractText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const fd = new FormData();
      if (pdfFile) {
        fd.append("file", pdfFile);
      } else if (contractText.trim()) {
        fd.append("contractText", contractText.trim());
      }
      if (notes.trim()) fd.append("notes", notes.trim());

      const res = await fetch(`/api/contracts/${contractId}/versions`, {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit version");
      onSuccess(json.contract as Contract);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {/* Mode toggle */}
      <div className="flex border-b border-neutral-200">
        {(["upload", "paste"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setInputMode(mode);
              if (mode === "upload") setContractText("");
              if (mode === "paste") { setPdfFile(null); setFileError(null); }
            }}
            className={`px-4 py-2 text-xs font-medium uppercase tracking-widest transition border-b-2 -mb-px ${
              inputMode === mode
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            {mode === "upload" ? "Upload PDF" : "Paste Text"}
          </button>
        ))}
      </div>

      {inputMode === "upload" ? (
        <div className="space-y-2">
          {pdfFile ? (
            <div className="flex items-center gap-2 px-3 py-2.5 border border-neutral-200 rounded bg-neutral-50 text-sm text-neutral-700">
              <span className="flex-1 truncate font-mono text-xs">{pdfFile.name}</span>
              <button
                type="button"
                onClick={() => { setPdfFile(null); setFileError(null); }}
                className="text-neutral-400 hover:text-neutral-700 transition text-xs shrink-0"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-neutral-200 rounded-lg py-6 cursor-pointer hover:border-neutral-400 transition">
              <span className="text-sm text-neutral-500">Click to select a PDF</span>
              <span className="text-xs text-neutral-400 mt-1">Maximum 5 MB</span>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    setFileError("File exceeds 5 MB limit");
                    setPdfFile(null);
                  } else {
                    setFileError(null);
                    setPdfFile(file);
                  }
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {fileError && <p className="text-xs text-red-600">{fileError}</p>}
        </div>
      ) : (
        <Textarea
          label="Updated Contract Text"
          value={contractText}
          onChange={(e) => setContractText(e.target.value)}
          placeholder="Paste the updated contract text for AI re-analysis..."
          hint="Optional — AI will re-analyse clauses automatically."
          rows={5}
        />
      )}

      <Textarea
        label="Version Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What changed in this version?"
        hint="Optional"
        rows={2}
      />

      {error && (
        <p className="text-sm text-neutral-700 px-3 py-2.5 border border-neutral-200 bg-neutral-50 rounded">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="sm" disabled={loading}>
          {loading ? (pdfFile ? "Extracting PDF..." : "Submitting...") : "Submit New Version"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
      {loading && (
        <p className="text-xs text-neutral-400">Running AI clause analysis...</p>
      )}
    </form>
  );
}

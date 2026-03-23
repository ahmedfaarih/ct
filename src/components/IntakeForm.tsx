"use client";

import { useState } from "react";
import { CONTRACT_TYPES, RISK_FACTORS } from "@/lib/constants";
import type { Contract } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import CheckboxGroup from "@/components/ui/CheckboxGroup";

interface IntakeFormProps {
  onSuccess: (contract: Contract, assignedOfficerName: string | null) => void;
}

const RENEWAL_OPTIONS = [
  { value: "new", label: "New contract" },
  { value: "renewal", label: "Renewal" },
  { value: "amendment", label: "Amendment" },
];

const CONTRACT_TYPE_OPTIONS = CONTRACT_TYPES.map((t) => ({
  value: t.id,
  label: t.label,
}));

const RISK_FACTOR_OPTIONS = RISK_FACTORS.map((f) => ({
  id: f.id,
  label: f.label,
}));

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-4">
      {children}
    </p>
  );
}

export default function IntakeForm({ onSuccess }: IntakeFormProps) {
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");

  // Upload mode state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Paste mode state
  const [contractType, setContractType] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [department, setDepartment] = useState("");
  const [value, setValue] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isRenewal, setIsRenewal] = useState("new");
  const [riskFactors, setRiskFactors] = useState<string[]>([]);
  const [contractText, setContractText] = useState("");

  // Shared
  const [notes, setNotes] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ contractType?: string; counterparty?: string }>({});

  function handleModeSwitch(mode: "upload" | "paste") {
    setInputMode(mode);
    setSubmitError(null);
    setErrors({});
    if (mode === "upload") {
      setContractText("");
    } else {
      setPdfFile(null);
      setFileError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (inputMode === "paste") {
      const newErrors: typeof errors = {};
      if (!contractType) newErrors.contractType = "Select a contract type";
      if (!counterparty.trim()) newErrors.counterparty = "Counterparty is required";
      if (Object.keys(newErrors).length) {
        setErrors(newErrors);
        return;
      }
    }

    setErrors({});
    setSubmitLoading(true);

    try {
      const fd = new FormData();

      if (inputMode === "upload") {
        if (pdfFile) fd.append("file", pdfFile);
      } else {
        fd.append("contractType", contractType);
        fd.append("counterparty", counterparty.trim());
        if (department.trim()) fd.append("department", department.trim());
        if (value.trim()) fd.append("value", value.trim());
        if (deadline) fd.append("deadline", deadline);
        fd.append("isRenewal", isRenewal);
        riskFactors.forEach((rf) => fd.append("riskFactors", rf));
        if (contractText.trim()) fd.append("contractText", contractText.trim());
      }

      if (notes.trim()) fd.append("notes", notes.trim());

      const res = await fetch("/api/contracts/submit", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      onSuccess(json.contract as Contract, json.assignedOfficerName ?? null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit contract");
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">New Contract Intake</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Upload a PDF or fill in the details manually.
        </p>

        {/* Mode toggle */}
        <div className="flex border-b border-neutral-200 mt-5">
          {(["upload", "paste"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleModeSwitch(mode)}
              className={`px-5 py-2.5 text-xs font-medium uppercase tracking-widest transition border-b-2 -mb-px ${
                inputMode === mode
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              }`}
            >
              {mode === "upload" ? "Upload PDF" : "Fill Manually"}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-0">
        {inputMode === "upload" ? (
          /* ── Upload path: file + notes only ── */
          <>
            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6">
              <SectionHeading>Contract Document</SectionHeading>
              {pdfFile ? (
                <div className="flex items-center gap-2 px-3 py-2.5 border border-neutral-200 rounded bg-neutral-50">
                  <span className="flex-1 truncate font-mono text-xs text-neutral-700">{pdfFile.name}</span>
                  <button
                    type="button"
                    onClick={() => { setPdfFile(null); setFileError(null); }}
                    className="text-neutral-400 hover:text-neutral-700 transition text-xs shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-neutral-200 rounded-lg py-10 cursor-pointer hover:border-neutral-400 transition">
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
              {fileError && <p className="text-xs text-red-600 mt-2">{fileError}</p>}
              <p className="text-xs text-neutral-400 mt-3">
                Gemini will extract the contract details, assess risk, and identify key clauses automatically.
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6 mt-3">
              <SectionHeading>Notes</SectionHeading>
              <Textarea
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional context for the reviewing legal team..."
                hint="Optional"
                rows={3}
              />
            </div>
          </>
        ) : (
          /* ── Paste / manual path: all fields ── */
          <>
            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6">
              <SectionHeading>Contract Basics</SectionHeading>
              <div className="space-y-4">
                <Select
                  label="Contract Type"
                  value={contractType}
                  onChange={(e) => {
                    setContractType(e.target.value);
                    if (errors.contractType) setErrors((p) => ({ ...p, contractType: undefined }));
                  }}
                  options={CONTRACT_TYPE_OPTIONS}
                  placeholder="Select a type..."
                  error={errors.contractType}
                />
                <Input
                  label="Counterparty"
                  value={counterparty}
                  onChange={(e) => {
                    setCounterparty(e.target.value);
                    if (errors.counterparty) setErrors((p) => ({ ...p, counterparty: undefined }));
                  }}
                  placeholder="Company or individual name"
                  error={errors.counterparty}
                />
                <Input
                  label="Requesting Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Procurement, Sales, HR"
                  hint="Optional"
                />
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6 mt-3">
              <SectionHeading>Timeline &amp; Value</SectionHeading>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Estimated Value"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="e.g. €50,000"
                    hint="Optional"
                  />
                  <Input
                    label="Review Deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    hint="Optional"
                  />
                </div>
                <div>
                  <p className="block text-xs font-medium text-neutral-500 uppercase tracking-widest mb-2">
                    Contract Status
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {RENEWAL_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition text-sm ${
                          isRenewal === opt.value
                            ? "border-neutral-400 bg-neutral-50 text-neutral-900 font-medium"
                            : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="isRenewal"
                          value={opt.value}
                          checked={isRenewal === opt.value}
                          onChange={() => setIsRenewal(opt.value)}
                          className="accent-neutral-900"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6 mt-3">
              <SectionHeading>Risk Factors</SectionHeading>
              <CheckboxGroup
                options={RISK_FACTOR_OPTIONS}
                value={riskFactors}
                onChange={setRiskFactors}
                hint="Select all that apply. These determine urgency and routing."
              />
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6 mt-3">
              <SectionHeading>Contract Text</SectionHeading>
              <Textarea
                label="Contract Text"
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                placeholder="Paste the contract text here for automatic AI clause analysis..."
                hint="Optional — AI will automatically extract and assess key clauses on submission."
                rows={6}
              />
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6 mt-3">
              <SectionHeading>Additional Information</SectionHeading>
              <Textarea
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional context for the reviewing legal team..."
                hint="Optional"
                rows={3}
              />
            </div>
          </>
        )}

        {/* Submit */}
        <div className="pt-4">
          {submitError && (
            <div className="mb-3 px-4 py-3 rounded border border-neutral-200 bg-neutral-50 text-neutral-700 text-sm">
              {submitError}
            </div>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={submitLoading || (inputMode === "upload" && !pdfFile)}
            className="w-full py-3"
          >
            {submitLoading
              ? inputMode === "upload"
                ? "Extracting PDF and analysing..."
                : "Analysing and submitting..."
              : "Submit for Review"}
          </Button>
          {submitLoading && (
            <p className="text-center text-xs text-neutral-400 mt-2">
              {inputMode === "upload"
                ? "Gemini is reading your PDF and computing triage..."
                : "Running AI clause analysis and computing triage..."}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

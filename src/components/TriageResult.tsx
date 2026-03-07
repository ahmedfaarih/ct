"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Contract, ChecklistItem } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardSection } from "@/components/ui/Card";
import ClauseAnalysis from "@/components/ClauseAnalysis";

interface Props {
  contract: Contract;
  onNewIntake: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-neutral-900">{value}</dd>
    </div>
  );
}

export default function TriageResult({ contract, onNewIntake }: Props) {
  const supabase = createClient();
  const [checklist, setChecklist] = useState<ChecklistItem[]>(contract.checklist);
  const [saving, setSaving] = useState(false);

  async function toggleItem(id: string) {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updated);
    setSaving(true);
    await supabase
      .from("contracts")
      .update({ checklist: updated })
      .eq("id", contract.id);
    setSaving(false);
  }

  const completedCount = checklist.filter((i) => i.checked).length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2">
            Triage complete
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-neutral-900 font-mono tracking-tight">
              {contract.case_id}
            </h1>
            <Badge variant={contract.urgency}>{contract.urgency} Priority</Badge>
          </div>
          <p className="text-sm text-neutral-500 mt-1.5">
            Routed to{" "}
            <span className="font-medium text-neutral-700">{contract.route}</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onNewIntake} className="shrink-0">
          New Intake
        </Button>
      </div>

      {/* Contract details */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
          <DetailRow label="Type" value={contract.type_label} />
          <DetailRow label="Counterparty" value={contract.counterparty} />
          {contract.department && (
            <DetailRow label="Department" value={contract.department} />
          )}
          {contract.estimated_value && (
            <DetailRow label="Estimated Value" value={contract.estimated_value} />
          )}
          {contract.deadline && (
            <DetailRow label="Deadline" value={formatDate(contract.deadline)} />
          )}
          {contract.is_renewal && (
            <DetailRow label="Renewal" value={contract.is_renewal} />
          )}
          <DetailRow label="Risk Score" value={String(contract.risk_score)} />
          <DetailRow label="Submitted" value={formatDate(contract.created_at)} />
        </dl>

        {contract.risk_factors.length > 0 && (
          <CardSection>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2">
              Risk Factors
            </p>
            <div className="flex flex-wrap gap-1.5">
              {contract.risk_factors.map((f) => (
                <Badge key={f} variant="default">
                  {f.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </CardSection>
        )}

        {contract.notes && (
          <CardSection>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-1.5">
              Notes
            </p>
            <p className="text-sm text-neutral-700 leading-relaxed">{contract.notes}</p>
          </CardSection>
        )}
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Review Checklist</CardTitle>
            <span className="text-xs text-neutral-400 font-mono">
              {completedCount}/{checklist.length} complete
              {saving && (
                <span className="ml-2 text-neutral-300"> · saving</span>
              )}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-900 rounded-full transition-all duration-300"
              style={{
                width: checklist.length
                  ? `${(completedCount / checklist.length) * 100}%`
                  : "0%",
              }}
            />
          </div>
        </CardHeader>

        <div className="divide-y divide-neutral-100">
          {checklist.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-3 py-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleItem(item.id)}
                className="mt-0.5 accent-neutral-900 shrink-0"
              />
              <span
                className={`text-sm leading-snug transition ${
                  item.checked
                    ? "line-through text-neutral-300"
                    : "text-neutral-700 group-hover:text-neutral-900"
                }`}
              >
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* AI Clause Analysis */}
      {contract.clause_results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Clause Analysis</CardTitle>
          </CardHeader>
          <ClauseAnalysis
            clauses={contract.clause_results}
            loading={false}
            error={false}
          />
        </Card>
      )}
    </div>
  );
}

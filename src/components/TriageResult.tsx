"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Contract, ChecklistItem, ContractVersion, Profile } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardSection } from "@/components/ui/Card";
import ClauseAnalysis from "@/components/ClauseAnalysis";
import VersionHistory from "@/components/VersionHistory";
import NewVersionForm from "@/components/NewVersionForm";
import AssignDropdown from "@/components/AssignDropdown";

interface Props {
  contract: Contract;
  assignedOfficerName?: string | null;
  onNewIntake: () => void;
  backLabel?: string;
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

export default function TriageResult({ contract: initialContract, assignedOfficerName: initialOfficerName, onNewIntake, backLabel = "New Intake" }: Props) {
  const supabase = createClient();
  const [contract, setContract] = useState<Contract>(initialContract);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialContract.checklist);
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [officerName, setOfficerName] = useState<string | null>(initialOfficerName ?? null);

  const completedCount = checklist.filter((i) => i.checked).length;

  useEffect(() => {
    async function init() {
      // Fetch current user profile to determine if they can assign
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (p) setCurrentProfile(p as Profile);
      }

      // Fetch version history
      setVersionsLoading(true);
      try {
        const res = await fetch(`/api/contracts/${contract.id}/versions`);
        const json = await res.json();
        if (res.ok) setVersions(json.versions ?? []);
      } finally {
        setVersionsLoading(false);
      }
    }
    init();
  }, [contract.id, supabase]);

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

  function handleNewVersionSuccess(updated: Contract) {
    setContract(updated);
    setShowNewVersion(false);
    // Refresh version history
    fetch(`/api/contracts/${updated.id}/versions`)
      .then((r) => r.json())
      .then((json) => setVersions(json.versions ?? []));
  }

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
            {contract.current_version > 1 && (
              <span className="text-xs font-mono text-neutral-400 border border-neutral-200 px-1.5 py-0.5 rounded">
                v{contract.current_version}
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 mt-1.5">
            Routed to{" "}
            <span className="font-medium text-neutral-700">{contract.route}</span>
          </p>
          {(officerName || contract.assigned_to) && (
            <p className="text-sm text-neutral-500 mt-0.5">
              Assigned to{" "}
              <span className="font-medium text-neutral-700">
                {officerName ?? "Legal Officer"}
              </span>
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onNewIntake} className="shrink-0">
          {backLabel}
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
            <DetailRow label="Status" value={contract.is_renewal} />
          )}
          <DetailRow label="Risk Score" value={String(contract.risk_score)} />
          <DetailRow label="Submitted" value={formatDate(contract.created_at)} />
          {contract.file_name && (
            <DetailRow label="File" value={contract.file_name} />
          )}
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

      {/* Assignment — visible to reviewer/admin only */}
      {currentProfile && ["reviewer", "admin"].includes(currentProfile.role) && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <p className="text-xs text-neutral-500 mb-3">
            Assign this contract to the legal officer responsible for review.
          </p>
          <AssignDropdown
            contractId={contract.id}
            currentAssignedTo={contract.assigned_to}
            currentAssigneeName={officerName}
            onAssigned={(assignedTo, name) => {
              setContract((c) => ({ ...c, assigned_to: assignedTo }));
              setOfficerName(name);
            }}
          />
        </Card>
      )}

      {/* Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Review Checklist</CardTitle>
            <span className="text-xs text-neutral-400 font-mono">
              {completedCount}/{checklist.length} complete
              {saving && <span className="ml-2 text-neutral-300"> · saving</span>}
            </span>
          </div>
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

      {/* Version History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Version History</CardTitle>
            <span className="text-xs font-mono text-neutral-400">
              v{contract.current_version}
            </span>
          </div>
        </CardHeader>
        {versionsLoading ? (
          <p className="text-sm text-neutral-400 pb-2">Loading...</p>
        ) : (
          <VersionHistory versions={versions} currentVersion={contract.current_version} />
        )}

        {/* New Version Form */}
        {!showNewVersion ? (
          <div className="pt-3 border-t border-neutral-100 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewVersion(true)}
            >
              Submit New Version
            </Button>
          </div>
        ) : (
          <div className="pt-3 border-t border-neutral-100 mt-3">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
              New Version
            </p>
            <NewVersionForm
              contractId={contract.id}
              onSuccess={handleNewVersionSuccess}
              onCancel={() => setShowNewVersion(false)}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

interface Officer {
  id: string;
  full_name: string | null;
  email: string;
  department: string | null;
  role: string;
}

interface Props {
  contractId: string;
  currentAssignedTo: string | null;
  currentAssigneeName?: string | null;
  onAssigned?: (assignedTo: string | null, name: string | null) => void;
  compact?: boolean;
}

export default function AssignDropdown({
  contractId,
  currentAssignedTo,
  currentAssigneeName,
  onAssigned,
  compact = false,
}: Props) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(currentAssignedTo ?? "");

  const fetchOfficers = useCallback(async () => {
    try {
      const res = await fetch("/api/officers");
      if (!res.ok) throw new Error("Failed to load officers");
      const json = await res.json();
      setOfficers(json.officers ?? []);
    } catch {
      // Silently fail — component won't render the dropdown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOfficers(); }, [fetchOfficers]);

  async function handleChange(newValue: string) {
    setSelected(newValue);
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${contractId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: newValue || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Assignment failed");
      onAssigned?.(newValue || null, json.assignedOfficerName ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setSelected(currentAssignedTo ?? ""); // revert
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <span className="text-xs text-neutral-400">
        {currentAssigneeName ?? (currentAssignedTo ? "Officer" : "Unassigned")}
      </span>
    );
  }

  const displayName = (id: string) => {
    const o = officers.find((x) => x.id === id);
    if (!o) return currentAssigneeName ?? "Officer";
    return o.full_name || o.email;
  };

  if (compact) {
    // Compact version for table cells
    return (
      <div className="flex flex-col gap-1">
        <select
          value={selected}
          disabled={saving}
          onChange={(e) => handleChange(e.target.value)}
          className="text-xs border border-neutral-200 rounded px-2 py-1.5 bg-white text-neutral-900 focus:outline-none focus:border-neutral-400 disabled:opacity-50 transition max-w-[180px]"
        >
          <option value="">— Unassigned —</option>
          {officers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.full_name || o.email}
              {o.department ? ` (${o.department})` : ""}
            </option>
          ))}
        </select>
        {saving && <span className="text-xs text-neutral-400">Saving...</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  // Full version for TriageResult card
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <select
            value={selected}
            disabled={saving}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full text-sm border border-neutral-200 rounded px-3 py-2.5 bg-white text-neutral-900 focus:outline-none focus:border-neutral-400 disabled:opacity-50 transition"
          >
            <option value="">— Unassigned —</option>
            {officers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.full_name || o.email}
                {o.department ? ` — ${o.department}` : ""}
              </option>
            ))}
          </select>
        </div>
        {saving && <span className="text-sm text-neutral-400 shrink-0 pt-2">Saving...</span>}
      </div>

      {selected && (
        <div className="flex items-start gap-2">
          <div>
            <p className="text-sm font-medium text-neutral-900">{displayName(selected)}</p>
            {officers.find((o) => o.id === selected)?.department && (
              <p className="text-xs text-neutral-500 mt-0.5">
                {officers.find((o) => o.id === selected)?.department}
              </p>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

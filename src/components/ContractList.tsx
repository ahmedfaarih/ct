"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Contract, Profile } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import AssignDropdown from "@/components/AssignDropdown";
import TriageResult from "@/components/TriageResult";

type UrgencyKey = "Critical" | "High" | "Medium" | "Low";
type Filter = "all" | "mine";

const URGENCY_ORDER: UrgencyKey[] = ["Critical", "High", "Medium", "Low"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatPill({ label, count, urgency }: { label: UrgencyKey; count: number; urgency: UrgencyKey }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={urgency}>{label}</Badge>
      <span className="text-sm font-medium text-neutral-700 font-mono">{count}</span>
    </div>
  );
}

export default function ContractList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [officerMap, setOfficerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Contract | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (p) setProfile(p as Profile);
      }

      // Fetch contracts
      const { data } = await supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false });
      const list = (data as Contract[]) ?? [];
      setContracts(list);

      // Build officer name map from assigned_to UUIDs
      const assignedIds = [...new Set(list.map((c) => c.assigned_to).filter(Boolean))] as string[];
      if (assignedIds.length > 0) {
        const { data: officers } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", assignedIds);
        if (officers) {
          const map: Record<string, string> = {};
          officers.forEach((o: { id: string; full_name: string | null; email: string }) => {
            map[o.id] = o.full_name || o.email;
          });
          setOfficerMap(map);
        }
      }

      setLoading(false);
    }
    load();
  }, []);

  const isPrivileged = profile?.role === "reviewer" || profile?.role === "admin";

  const displayed = filter === "mine" && profile
    ? contracts.filter((c) => c.assigned_to === profile.id)
    : contracts;

  const stats = URGENCY_ORDER.reduce(
    (acc, u) => {
      acc[u] = displayed.filter((c) => c.urgency === u).length;
      return acc;
    },
    {} as Record<UrgencyKey, number>
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-white border border-neutral-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (selected) {
    return (
      <TriageResult
        contract={selected}
        assignedOfficerName={selected.assigned_to ? (officerMap[selected.assigned_to] ?? null) : null}
        onNewIntake={() => setSelected(null)}
        backLabel="Back to contracts"
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Heading + filter + stats */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">
            {filter === "mine" ? "Assigned to Me" : "All Contracts"}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {displayed.length} submission{displayed.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Filter toggle — only for reviewers/admins */}
          {isPrivileged && (
            <div className="flex rounded border border-neutral-200 overflow-hidden text-xs">
              {(["all", "mine"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 transition ${
                    filter === f
                      ? "bg-neutral-900 text-white font-medium"
                      : "bg-white text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  {f === "all" ? "All" : "Assigned to me"}
                </button>
              ))}
            </div>
          )}

          {displayed.length > 0 && (
            <div className="flex items-center gap-5">
              {URGENCY_ORDER.filter((u) => stats[u] > 0).map((u) => (
                <StatPill key={u} label={u} count={stats[u]} urgency={u} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {displayed.length === 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg py-16 text-center">
          <p className="text-sm font-medium text-neutral-500">
            {filter === "mine" ? "No contracts assigned to you" : "No contracts submitted yet"}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {filter === "mine"
              ? "Switch to All to see all contracts."
              : "Use New Intake to submit your first contract for review."}
          </p>
        </div>
      )}

      {/* Table */}
      {displayed.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-widest">
                  Case ID
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-widest">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-widest">
                  Counterparty
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-widest">
                  Urgency
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-widest hidden lg:table-cell">
                  Assigned To
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-widest hidden xl:table-cell">
                  Ver.
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-widest hidden md:table-cell">
                  Submitted
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {displayed.map((contract) => (
                <tr key={contract.id} className="hover:bg-neutral-50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-neutral-600 whitespace-nowrap">
                    {contract.case_id}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 whitespace-nowrap">
                    {contract.type_label}
                  </td>
                  <td className="px-4 py-3 text-neutral-900 font-medium max-w-[180px] truncate">
                    {contract.counterparty}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={contract.urgency}>{contract.urgency}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {isPrivileged ? (
                      <AssignDropdown
                        contractId={contract.id}
                        currentAssignedTo={contract.assigned_to}
                        currentAssigneeName={
                          contract.assigned_to ? (officerMap[contract.assigned_to] ?? null) : null
                        }
                        onAssigned={(assignedTo, name) => {
                          setOfficerMap((prev) =>
                            assignedTo && name ? { ...prev, [assignedTo]: name } : prev
                          );
                          setContracts((prev) =>
                            prev.map((c) =>
                              c.id === contract.id ? { ...c, assigned_to: assignedTo } : c
                            )
                          );
                        }}
                        compact
                      />
                    ) : (
                      <span className="text-sm text-neutral-500">
                        {contract.assigned_to
                          ? officerMap[contract.assigned_to] ?? "Legal Officer"
                          : <span className="text-neutral-300">Unassigned</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-400 hidden xl:table-cell">
                    v{contract.current_version ?? 1}
                  </td>
                  <td className="px-4 py-3 text-neutral-400 whitespace-nowrap hidden md:table-cell">
                    {formatDate(contract.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(contract)}
                      className="text-xs px-2.5 py-1.5 border border-neutral-200 rounded text-neutral-600 font-medium hover:border-neutral-400 hover:text-neutral-900 transition"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

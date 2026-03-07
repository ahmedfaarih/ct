"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Contract } from "@/lib/types";
import Badge from "@/components/ui/Badge";

type UrgencyKey = "Critical" | "High" | "Medium" | "Low";

const URGENCY_ORDER: UrgencyKey[] = ["Critical", "High", "Medium", "Low"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatPill({
  label,
  count,
  urgency,
}: {
  label: UrgencyKey;
  count: number;
  urgency: UrgencyKey;
}) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={urgency}>{label}</Badge>
      <span className="text-sm font-medium text-neutral-700 font-mono">{count}</span>
    </div>
  );
}

export default function ContractList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContracts() {
      const supabase = createClient();
      const { data } = await supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false });
      setContracts((data as Contract[]) ?? []);
      setLoading(false);
    }
    fetchContracts();
  }, []);

  const stats = URGENCY_ORDER.reduce(
    (acc, u) => {
      acc[u] = contracts.filter((c) => c.urgency === u).length;
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

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Page heading + stats */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">All Contracts</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {contracts.length} submission{contracts.length !== 1 ? "s" : ""} total
          </p>
        </div>

        {contracts.length > 0 && (
          <div className="flex items-center gap-5">
            {URGENCY_ORDER.filter((u) => stats[u] > 0).map((u) => (
              <StatPill key={u} label={u} count={stats[u]} urgency={u} />
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {contracts.length === 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg py-16 text-center">
          <p className="text-sm font-medium text-neutral-500">No contracts submitted yet</p>
          <p className="text-xs text-neutral-400 mt-1">
            Use New Intake to submit your first contract for review.
          </p>
        </div>
      )}

      {/* Table */}
      {contracts.length > 0 && (
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
                  Routed To
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-widest hidden md:table-cell">
                  Submitted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {contracts.map((contract) => (
                <tr
                  key={contract.id}
                  className="hover:bg-neutral-50 transition"
                >
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
                  <td className="px-4 py-3 text-neutral-500 hidden lg:table-cell max-w-[200px] truncate">
                    {contract.route}
                  </td>
                  <td className="px-4 py-3 text-neutral-400 whitespace-nowrap hidden md:table-cell">
                    {formatDate(contract.created_at)}
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

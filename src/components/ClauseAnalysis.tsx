import type { ClauseResult } from "@/lib/types";
import Badge from "@/components/ui/Badge";

interface ClauseAnalysisProps {
  clauses: ClauseResult[];
  loading: boolean;
  error: boolean;
}

const RISK_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

// Map clause risk to Badge urgency variants for consistent styling
const RISK_TO_BADGE: Record<string, "Low" | "Medium" | "High"> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-neutral-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function ClauseAnalysis({ clauses, loading, error }: ClauseAnalysisProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2.5 py-6 text-sm text-neutral-500">
        <Spinner />
        <span>Analysing contract clauses...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-5 px-4 rounded border border-neutral-200 bg-neutral-50 text-sm text-neutral-500">
        Analysis unavailable — the AI service could not process this document.
        You can proceed without clause analysis.
      </div>
    );
  }

  if (clauses.length === 0) {
    return (
      <p className="py-4 text-sm text-neutral-400">
        No clauses extracted. Paste or upload contract text to run AI analysis.
      </p>
    );
  }

  const highCount = clauses.filter((c) => c.risk === "high").length;
  const medCount = clauses.filter((c) => c.risk === "medium").length;

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
        <span className="text-xs text-neutral-500">
          {clauses.length} clause{clauses.length !== 1 ? "s" : ""} identified
        </span>
        {highCount > 0 && (
          <span className="text-xs font-medium text-neutral-700">
            {highCount} high risk
          </span>
        )}
        {medCount > 0 && (
          <span className="text-xs text-neutral-500">
            {medCount} medium risk
          </span>
        )}
      </div>

      {/* Clause rows */}
      <div className="divide-y divide-neutral-100">
        {clauses.map((clause, i) => (
          <div key={i} className="flex items-start gap-3 py-3">
            <div className="shrink-0 pt-0.5">
              <Badge variant={RISK_TO_BADGE[clause.risk] ?? "Low"}>
                {RISK_LABEL[clause.risk] ?? clause.risk}
              </Badge>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900">{clause.clause}</p>
              <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                {clause.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

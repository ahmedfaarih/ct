import type { ContractVersion } from "@/lib/types";

interface Props {
  versions: ContractVersion[];
  currentVersion: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function VersionHistory({ versions, currentVersion }: Props) {
  if (versions.length === 0) {
    return (
      <p className="text-sm text-neutral-400 py-2">No version history available.</p>
    );
  }

  return (
    <div className="space-y-0">
      {versions.map((v, idx) => {
        const isCurrent = v.version_number === currentVersion;
        const isLast = idx === versions.length - 1;
        return (
          <div key={v.id} className="flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                  isCurrent ? "bg-neutral-900" : "bg-neutral-300"
                }`}
              />
              {!isLast && <div className="w-px flex-1 bg-neutral-200 mt-1" />}
            </div>

            <div className={`pb-4 ${isLast ? "" : ""}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-medium text-neutral-900">
                  v{v.version_number}
                </span>
                {isCurrent && (
                  <span className="text-xs font-medium text-neutral-500 border border-neutral-200 px-1.5 py-0.5 rounded">
                    current
                  </span>
                )}
                {v.file_name && (
                  <span className="text-xs text-neutral-500 truncate max-w-[200px]">
                    {v.file_name}
                  </span>
                )}
                <span className="text-xs text-neutral-400">{formatDate(v.created_at)}</span>
              </div>
              {v.notes && (
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{v.notes}</p>
              )}
              {v.clause_results && v.clause_results.length > 0 && (
                <p className="text-xs text-neutral-400 mt-0.5">
                  {v.clause_results.length} clause{v.clause_results.length !== 1 ? "s" : ""} analysed
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

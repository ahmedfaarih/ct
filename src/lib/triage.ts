import {
  URGENCY_WEIGHTS,
  ROUTING_MAP,
  ROUTING_OVERRIDES,
  CONTRACT_CHECKLISTS,
  RISK_FACTOR_CHECKLISTS,
} from "./constants";
import type { ContractForm, TriageResult, ChecklistItem, Urgency } from "./types";

function generateCaseId(): string {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CT-${year}-${suffix}`;
}

function computeRiskScore(riskFactors: string[]): number {
  return riskFactors.reduce((total, factor) => {
    return total + (URGENCY_WEIGHTS[factor] ?? 0);
  }, 0);
}

function computeDeadlineBonus(deadline?: string): number {
  if (!deadline) return 0;
  const daysUntil = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntil < 5) return 3;
  if (daysUntil < 14) return 1;
  return 0;
}

function computeUrgency(total: number): Urgency {
  if (total >= 8) return "Critical";
  if (total >= 5) return "High";
  if (total >= 3) return "Medium";
  return "Low";
}

function computeRoute(
  contractType: string,
  riskFactors: string[],
  urgency: Urgency
): string {
  // Start with default route for contract type
  let route = ROUTING_MAP[contractType] ?? "General Legal";

  // Apply first matching risk factor override
  for (const factor of riskFactors) {
    if (ROUTING_OVERRIDES[factor]) {
      route = ROUTING_OVERRIDES[factor];
      break;
    }
  }

  // Critical contracts always escalate
  if (urgency === "Critical") {
    route = `${route} + Senior Counsel Escalation`;
  }

  return route;
}

function buildChecklist(
  contractType: string,
  riskFactors: string[]
): ChecklistItem[] {
  const labels: string[] = [
    ...(CONTRACT_CHECKLISTS[contractType] ?? CONTRACT_CHECKLISTS["other"]),
  ];

  for (const factor of riskFactors) {
    const extra = RISK_FACTOR_CHECKLISTS[factor];
    if (extra) labels.push(...extra);
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  return labels
    .filter((label) => {
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    })
    .map((label, i) => ({
      id: `item-${i}`,
      label,
      checked: false,
    }));
}

export function computeTriage(formData: ContractForm): TriageResult {
  const riskScore = computeRiskScore(formData.riskFactors);
  const deadlineBonus = computeDeadlineBonus(formData.deadline);
  const total = riskScore + deadlineBonus;

  const urgency = computeUrgency(total);
  const route = computeRoute(formData.contractType, formData.riskFactors, urgency);
  const checklist = buildChecklist(formData.contractType, formData.riskFactors);

  return {
    caseId: generateCaseId(),
    urgency,
    riskScore: total,
    route,
    checklist,
  };
}

export type Role = "requestor" | "reviewer" | "admin";
export type Urgency = "Low" | "Medium" | "High" | "Critical";
export type ClauseRisk = "low" | "medium" | "high";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  department: string | null;
  created_at: string;
}

export interface ClauseResult {
  clause: string;
  risk: ClauseRisk;
  detail: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface ContractForm {
  contractType: string;
  typeName: string;
  counterparty: string;
  department?: string;
  value?: string;
  deadline?: string;
  isRenewal?: string;
  riskFactors: string[];
  notes?: string;
  contractText?: string;
  fileName?: string;
  clauseResults?: ClauseResult[];
}

export interface TriageResult {
  caseId: string;
  urgency: Urgency;
  riskScore: number;
  route: string;
  checklist: ChecklistItem[];
}

export interface Contract {
  id: string;
  case_id: string;
  submitted_by: string | null;
  contract_type: string;
  type_label: string;
  counterparty: string;
  department: string | null;
  estimated_value: string | null;
  deadline: string | null;
  is_renewal: string | null;
  risk_factors: string[];
  notes: string | null;
  contract_text: string | null;
  file_name: string | null;
  urgency: Urgency;
  risk_score: number;
  route: string;
  clause_results: ClauseResult[];
  checklist: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface ContractType {
  id: string;
  label: string;
  defaultRoute: string;
}

export interface RiskFactor {
  id: string;
  label: string;
  weight: number;
}

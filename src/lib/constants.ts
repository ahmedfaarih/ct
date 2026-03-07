import type { ContractType, RiskFactor } from "./types";

export const CONTRACT_TYPES: ContractType[] = [
  { id: "nda", label: "Non-Disclosure Agreement", defaultRoute: "Legal Counsel" },
  { id: "saas", label: "SaaS / Software License", defaultRoute: "IT Legal / Commercial" },
  { id: "service", label: "Service Agreement", defaultRoute: "Commercial Legal" },
  { id: "employment", label: "Employment Contract", defaultRoute: "HR Legal" },
  { id: "dpa", label: "Data Processing Agreement", defaultRoute: "Data Protection Officer" },
  { id: "procurement", label: "Procurement / Supply", defaultRoute: "Procurement Legal" },
  { id: "partnership", label: "Partnership Agreement", defaultRoute: "Commercial Legal" },
  { id: "other", label: "Other", defaultRoute: "General Legal" },
];

export const RISK_FACTORS: RiskFactor[] = [
  { id: "value_high", label: "High Contract Value (>€100K)", weight: 2 },
  { id: "personal_data", label: "Involves Personal Data / GDPR", weight: 2 },
  { id: "cross_border", label: "Cross-Border / International", weight: 1 },
  { id: "gov_entity", label: "Government Entity Involved", weight: 2 },
  { id: "ip_transfer", label: "IP Transfer or Assignment", weight: 1 },
  { id: "auto_renew", label: "Auto-Renewal Clause", weight: 1 },
  { id: "exclusivity", label: "Exclusivity Clause", weight: 2 },
  { id: "liability_uncapped", label: "Uncapped Liability", weight: 3 },
];

// Weights keyed by risk factor id for quick lookup
export const URGENCY_WEIGHTS: Record<string, number> = Object.fromEntries(
  RISK_FACTORS.map((f) => [f.id, f.weight])
);

// Default route per contract type id
export const ROUTING_MAP: Record<string, string> = Object.fromEntries(
  CONTRACT_TYPES.map((t) => [t.id, t.defaultRoute])
);

// Risk factor overrides — first matching factor wins (applied in order of RISK_FACTORS)
export const ROUTING_OVERRIDES: Record<string, string> = {
  personal_data: "Data Protection Officer",
  gov_entity: "Public Sector Legal",
  ip_transfer: "IP Legal",
};

// Checklist items per contract type
export const CONTRACT_CHECKLISTS: Record<string, string[]> = {
  nda: [
    "Verify scope of confidentiality obligations",
    "Check definition of confidential information",
    "Review exclusions from confidentiality",
    "Confirm duration of obligations",
    "Check permitted disclosures",
    "Review return / destruction of information clause",
  ],
  saas: [
    "Review SLA and uptime guarantees",
    "Check data ownership and portability rights",
    "Verify security and compliance certifications",
    "Review termination and exit provisions",
    "Check auto-renewal terms and pricing adjustments",
    "Review liability caps and indemnification",
  ],
  service: [
    "Confirm scope of services and deliverables",
    "Review payment terms and milestones",
    "Check termination for convenience clause",
    "Verify limitation of liability",
    "Review dispute resolution mechanism",
    "Check IP ownership of work product",
  ],
  employment: [
    "Verify compensation and benefits",
    "Review non-compete and non-solicitation clauses",
    "Check confidentiality obligations",
    "Confirm termination notice periods",
    "Review IP assignment provisions",
    "Verify compliance with local labour law",
  ],
  dpa: [
    "Confirm data controller / processor roles",
    "Review data subject rights obligations",
    "Check international data transfer mechanisms",
    "Verify security measures and breach notification",
    "Review sub-processor approval process",
    "Confirm data retention and deletion terms",
  ],
  procurement: [
    "Review delivery terms and acceptance criteria",
    "Check warranty and indemnification provisions",
    "Verify supplier compliance obligations",
    "Review change order and pricing mechanisms",
    "Check force majeure and business continuity",
    "Confirm IP ownership of custom deliverables",
  ],
  partnership: [
    "Clarify each party's rights and obligations",
    "Review revenue sharing or cost allocation",
    "Check exclusivity and non-compete terms",
    "Verify IP ownership and licensing",
    "Review governance and decision-making process",
    "Confirm exit and wind-down provisions",
  ],
  other: [
    "Identify and confirm key obligations",
    "Review termination and exit rights",
    "Check limitation of liability",
    "Verify dispute resolution clause",
    "Confirm governing law and jurisdiction",
  ],
};

// Additional checklist items triggered by risk factors
export const RISK_FACTOR_CHECKLISTS: Record<string, string[]> = {
  personal_data: [
    "Confirm GDPR lawful basis for processing",
    "Verify data processing agreement is in place",
    "Check international transfer safeguards (SCCs / adequacy)",
  ],
  cross_border: [
    "Identify governing law and jurisdiction",
    "Check export control and sanctions compliance",
  ],
  gov_entity: [
    "Verify public procurement compliance",
    "Review state aid and transparency obligations",
  ],
  ip_transfer: [
    "Confirm scope of IP rights being transferred",
    "Check for moral rights waivers",
    "Review representations and warranties on IP ownership",
  ],
  auto_renew: [
    "Note auto-renewal date and opt-out window",
    "Set calendar reminder before renewal deadline",
  ],
  exclusivity: [
    "Assess business impact of exclusivity restrictions",
    "Confirm geographic and product scope of exclusivity",
  ],
  liability_uncapped: [
    "Negotiate liability cap — target 12 months of fees",
    "Identify excluded damages (consequential, indirect)",
  ],
  value_high: [
    "Ensure contract is approved by finance / senior management",
    "Verify contract insurance requirements are met",
  ],
};

-- ============================================================
-- CONTRACT TRIAGE — SEED DATA
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- This inserts dummy contracts attributed to your first user.
-- ============================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN

  -- Use the first registered user in the system
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Sign up first, then run this seed.';
  END IF;

  -- --------------------------------------------------------
  -- CRITICAL — Data Processing Agreement, deadline imminent
  -- --------------------------------------------------------
  INSERT INTO public.contracts (
    case_id, submitted_by, contract_type, type_label, counterparty,
    department, estimated_value, deadline, is_renewal,
    risk_factors, notes, urgency, risk_score, route,
    clause_results, checklist
  ) VALUES (
    'CT-2025-A1B2C', v_user_id,
    'dpa', 'Data Processing Agreement', 'HealthBridge Solutions GmbH',
    'Legal & Compliance', '€240,000', CURRENT_DATE + 3, 'No',
    ARRAY['personal_data','gov_entity','liability_uncapped'],
    'EU-funded hospital consortium. GDPR sub-processor agreement. DPO sign-off required before go-live.',
    'Critical', 9, 'Data Protection Officer + Senior Counsel Escalation',
    '[
      {"clause":"Data Retention","risk":"high","detail":"Retention period of 10 years — verify alignment with GDPR minimum necessity principle."},
      {"clause":"Liability","risk":"high","detail":"No liability cap defined — negotiate a cap pegged to annual contract value."},
      {"clause":"Sub-processor Approval","risk":"medium","detail":"Blanket consent given to sub-processors — require specific list and approval rights."},
      {"clause":"Data Subject Rights","risk":"medium","detail":"Response window set to 45 days — GDPR mandates 30 days."},
      {"clause":"Termination","risk":"low","detail":"90-day notice period with data deletion obligation — standard."}
    ]'::JSONB,
    '[
      {"id":"item-0","label":"Confirm data controller / processor roles","checked":true},
      {"id":"item-1","label":"Review data subject rights obligations","checked":true},
      {"id":"item-2","label":"Check international data transfer mechanisms","checked":false},
      {"id":"item-3","label":"Verify security measures and breach notification","checked":false},
      {"id":"item-4","label":"Review sub-processor approval process","checked":false},
      {"id":"item-5","label":"Confirm data retention and deletion terms","checked":false},
      {"id":"item-6","label":"Confirm GDPR lawful basis for processing","checked":false},
      {"id":"item-7","label":"Verify data processing agreement is in place","checked":false},
      {"id":"item-8","label":"Check international transfer safeguards (SCCs / adequacy)","checked":false},
      {"id":"item-9","label":"Verify public procurement compliance","checked":false},
      {"id":"item-10","label":"Review state aid and transparency obligations","checked":false},
      {"id":"item-11","label":"Negotiate liability cap — target 12 months of fees","checked":false},
      {"id":"item-12","label":"Identify excluded damages (consequential, indirect)","checked":false}
    ]'::JSONB
  );

  -- --------------------------------------------------------
  -- CRITICAL — NDA with IP transfer, exclusivity, uncapped liability
  -- --------------------------------------------------------
  INSERT INTO public.contracts (
    case_id, submitted_by, contract_type, type_label, counterparty,
    department, estimated_value, deadline, is_renewal,
    risk_factors, notes, urgency, risk_score, route,
    clause_results, checklist
  ) VALUES (
    'CT-2025-D3E4F', v_user_id,
    'nda', 'Non-Disclosure Agreement', 'Meridian Capital Partners',
    'Finance', '€1,500,000', CURRENT_DATE + 7, 'No',
    ARRAY['ip_transfer','exclusivity','liability_uncapped','value_high'],
    'Joint venture NDA covering proprietary fintech IP. Exclusivity clause restricts parallel negotiations.',
    'Critical', 8, 'IP Legal + Senior Counsel Escalation',
    '[
      {"clause":"Intellectual Property","risk":"high","detail":"Broad IP assignment — all improvements made during NDA period transfer to counterparty."},
      {"clause":"Exclusivity","risk":"high","detail":"18-month exclusivity window — assess commercial impact before signing."},
      {"clause":"Liability","risk":"high","detail":"Uncapped liability on both sides — standard carve-outs are missing."},
      {"clause":"Confidentiality Scope","risk":"medium","detail":"Definition of confidential information is overly broad — seek standard carve-outs."},
      {"clause":"Governing Law","risk":"low","detail":"English law — acceptable for cross-border fintech deal."}
    ]'::JSONB,
    '[
      {"id":"item-0","label":"Verify scope of confidentiality obligations","checked":true},
      {"id":"item-1","label":"Check definition of confidential information","checked":true},
      {"id":"item-2","label":"Review exclusions from confidentiality","checked":false},
      {"id":"item-3","label":"Confirm duration of obligations","checked":false},
      {"id":"item-4","label":"Check permitted disclosures","checked":false},
      {"id":"item-5","label":"Review return / destruction of information clause","checked":false},
      {"id":"item-6","label":"Confirm scope of IP rights being transferred","checked":false},
      {"id":"item-7","label":"Check for moral rights waivers","checked":false},
      {"id":"item-8","label":"Review representations and warranties on IP ownership","checked":false},
      {"id":"item-9","label":"Assess business impact of exclusivity restrictions","checked":false},
      {"id":"item-10","label":"Confirm geographic and product scope of exclusivity","checked":false},
      {"id":"item-11","label":"Negotiate liability cap — target 12 months of fees","checked":false},
      {"id":"item-12","label":"Ensure contract is approved by finance / senior management","checked":false}
    ]'::JSONB
  );

  -- --------------------------------------------------------
  -- HIGH — SaaS agreement with personal data + uncapped liability
  -- --------------------------------------------------------
  INSERT INTO public.contracts (
    case_id, submitted_by, contract_type, type_label, counterparty,
    department, estimated_value, deadline, is_renewal,
    risk_factors, notes, urgency, risk_score, route,
    clause_results, checklist
  ) VALUES (
    'CT-2025-G5H6I', v_user_id,
    'saas', 'SaaS / Software License', 'Nexlayer Technologies Ltd',
    'IT Operations', '€85,000', CURRENT_DATE + 21, 'No',
    ARRAY['personal_data','liability_uncapped'],
    'Cloud HR platform. Processes employee personal data including payroll and health records.',
    'High', 5, 'Data Protection Officer',
    '[
      {"clause":"Data Processing","risk":"high","detail":"Vendor claims data ownership over anonymised datasets derived from customer data."},
      {"clause":"Liability","risk":"high","detail":"Vendor liability capped at one month of fees — far below risk exposure."},
      {"clause":"SLA","risk":"medium","detail":"99.5% uptime SLA with no financial remedy — add service credits."},
      {"clause":"Termination","risk":"medium","detail":"Vendor can terminate with 30 days notice — seek 90 days minimum."},
      {"clause":"Auto-Renewal","risk":"low","detail":"Annual auto-renewal with 60-day opt-out — calendar reminder required."}
    ]'::JSONB,
    '[
      {"id":"item-0","label":"Review SLA and uptime guarantees","checked":true},
      {"id":"item-1","label":"Check data ownership and portability rights","checked":true},
      {"id":"item-2","label":"Verify security and compliance certifications","checked":true},
      {"id":"item-3","label":"Review termination and exit provisions","checked":false},
      {"id":"item-4","label":"Check auto-renewal terms and pricing adjustments","checked":false},
      {"id":"item-5","label":"Review liability caps and indemnification","checked":false},
      {"id":"item-6","label":"Confirm GDPR lawful basis for processing","checked":false},
      {"id":"item-7","label":"Verify data processing agreement is in place","checked":false},
      {"id":"item-8","label":"Negotiate liability cap — target 12 months of fees","checked":false}
    ]'::JSONB
  );

  -- --------------------------------------------------------
  -- HIGH — Employment contract with IP transfer + exclusivity
  -- --------------------------------------------------------
  INSERT INTO public.contracts (
    case_id, submitted_by, contract_type, type_label, counterparty,
    department, estimated_value, deadline, is_renewal,
    risk_factors, notes, urgency, risk_score, route,
    clause_results, checklist
  ) VALUES (
    'CT-2025-J7K8L', v_user_id,
    'employment', 'Employment Contract', 'Dr. Katalin Varga (Senior Engineer)',
    'Human Resources', '€120,000 p.a.', CURRENT_DATE + 14, 'No',
    ARRAY['ip_transfer','exclusivity','value_high'],
    'Senior R&D hire. Contract includes broad IP assignment and 12-month non-compete.',
    'High', 5, 'IP Legal',
    '[
      {"clause":"IP Assignment","risk":"high","detail":"All inventions created outside working hours assigned to employer — may be unenforceable."},
      {"clause":"Non-Compete","risk":"high","detail":"12-month non-compete in same industry — verify enforceability under local law."},
      {"clause":"Confidentiality","risk":"medium","detail":"Post-termination confidentiality has no time limit — consider 3-year cap."},
      {"clause":"Garden Leave","risk":"low","detail":"6-month garden leave provision — standard for senior R&D roles."}
    ]'::JSONB,
    '[
      {"id":"item-0","label":"Verify compensation and benefits","checked":true},
      {"id":"item-1","label":"Review non-compete and non-solicitation clauses","checked":false},
      {"id":"item-2","label":"Check confidentiality obligations","checked":false},
      {"id":"item-3","label":"Confirm termination notice periods","checked":false},
      {"id":"item-4","label":"Review IP assignment provisions","checked":false},
      {"id":"item-5","label":"Verify compliance with local labour law","checked":false},
      {"id":"item-6","label":"Confirm scope of IP rights being transferred","checked":false},
      {"id":"item-7","label":"Assess business impact of exclusivity restrictions","checked":false},
      {"id":"item-8","label":"Ensure contract is approved by finance / senior management","checked":false}
    ]'::JSONB
  );

  -- --------------------------------------------------------
  -- MEDIUM — Service agreement, cross-border, auto-renewal
  -- --------------------------------------------------------
  INSERT INTO public.contracts (
    case_id, submitted_by, contract_type, type_label, counterparty,
    department, estimated_value, deadline, is_renewal,
    risk_factors, notes, urgency, risk_score, route,
    clause_results, checklist
  ) VALUES (
    'CT-2025-M9N0O', v_user_id,
    'service', 'Service Agreement', 'Arcova Consulting S.A.',
    'Strategy', '€55,000', CURRENT_DATE + 30, 'No',
    ARRAY['cross_border','auto_renew'],
    'Management consulting engagement. French firm, services delivered in Hungary. Auto-renews annually.',
    'Medium', 3, 'Commercial Legal',
    '[
      {"clause":"Governing Law","risk":"medium","detail":"French law specified — consider neutral jurisdiction or Hungarian law."},
      {"clause":"Auto-Renewal","risk":"medium","detail":"30-day opt-out window before annual renewal — tight timeline."},
      {"clause":"Scope of Services","risk":"low","detail":"Deliverables reasonably well defined — minor clarification recommended."},
      {"clause":"Payment Terms","risk":"low","detail":"30-day payment terms — standard."}
    ]'::JSONB,
    '[
      {"id":"item-0","label":"Confirm scope of services and deliverables","checked":true},
      {"id":"item-1","label":"Review payment terms and milestones","checked":true},
      {"id":"item-2","label":"Check termination for convenience clause","checked":false},
      {"id":"item-3","label":"Verify limitation of liability","checked":false},
      {"id":"item-4","label":"Review dispute resolution mechanism","checked":false},
      {"id":"item-5","label":"Check IP ownership of work product","checked":false},
      {"id":"item-6","label":"Identify governing law and jurisdiction","checked":false},
      {"id":"item-7","label":"Check export control and sanctions compliance","checked":false},
      {"id":"item-8","label":"Note auto-renewal date and opt-out window","checked":false}
    ]'::JSONB
  );

  -- --------------------------------------------------------
  -- MEDIUM — Procurement, high value
  -- --------------------------------------------------------
  INSERT INTO public.contracts (
    case_id, submitted_by, contract_type, type_label, counterparty,
    department, estimated_value, deadline, is_renewal,
    risk_factors, notes, urgency, risk_score, route,
    clause_results, checklist
  ) VALUES (
    'CT-2025-P1Q2R', v_user_id,
    'procurement', 'Procurement / Supply', 'Magyar Elektronika Zrt.',
    'Operations', '€310,000', CURRENT_DATE + 45, 'Yes',
    ARRAY['value_high'],
    'Annual hardware refresh contract. Renewal of existing supplier relationship. Price increased 12%.',
    'Medium', 3, 'Procurement Legal',
    '[]'::JSONB,
    '[
      {"id":"item-0","label":"Review delivery terms and acceptance criteria","checked":true},
      {"id":"item-1","label":"Check warranty and indemnification provisions","checked":true},
      {"id":"item-2","label":"Verify supplier compliance obligations","checked":false},
      {"id":"item-3","label":"Review change order and pricing mechanisms","checked":false},
      {"id":"item-4","label":"Check force majeure and business continuity","checked":false},
      {"id":"item-5","label":"Confirm IP ownership of custom deliverables","checked":false},
      {"id":"item-6","label":"Ensure contract is approved by finance / senior management","checked":false}
    ]'::JSONB
  );

  -- --------------------------------------------------------
  -- MEDIUM — Partnership, cross-border
  -- --------------------------------------------------------
  INSERT INTO public.contracts (
    case_id, submitted_by, contract_type, type_label, counterparty,
    department, estimated_value, deadline, is_renewal,
    risk_factors, notes, urgency, risk_score, route,
    clause_results, checklist
  ) VALUES (
    'CT-2025-S3T4U', v_user_id,
    'partnership', 'Partnership Agreement', 'Balticsoft OÜ',
    'Business Development', '€95,000', CURRENT_DATE + 28, 'No',
    ARRAY['cross_border','auto_renew'],
    'Co-development partnership for Eastern European market expansion. Revenue sharing 60/40.',
    'Medium', 3, 'Commercial Legal',
    '[]'::JSONB,
    '[
      {"id":"item-0","label":"Clarify each party rights and obligations","checked":false},
      {"id":"item-1","label":"Review revenue sharing or cost allocation","checked":false},
      {"id":"item-2","label":"Check exclusivity and non-compete terms","checked":false},
      {"id":"item-3","label":"Verify IP ownership and licensing","checked":false},
      {"id":"item-4","label":"Review governance and decision-making process","checked":false},
      {"id":"item-5","label":"Confirm exit and wind-down provisions","checked":false},
      {"id":"item-6","label":"Identify governing law and jurisdiction","checked":false},
      {"id":"item-7","label":"Note auto-renewal date and opt-out window","checked":false}
    ]'::JSONB
  );

  -- --------------------------------------------------------
  -- LOW — Standard NDA, no risk factors
  -- --------------------------------------------------------
  INSERT INTO public.contracts (
    case_id, submitted_by, contract_type, type_label, counterparty,
    department, estimated_value, deadline, is_renewal,
    risk_factors, notes, urgency, risk_score, route,
    clause_results, checklist
  ) VALUES (
    'CT-2025-V5W6X', v_user_id,
    'nda', 'Non-Disclosure Agreement', 'Innova Research Kft.',
    'R&D', NULL, NULL, 'No',
    ARRAY[]::TEXT[],
    'Mutual NDA for exploratory discussions. Standard 2-year term. No IP transfer.',
    'Low', 0, 'Legal Counsel',
    '[]'::JSONB,
    '[
      {"id":"item-0","label":"Verify scope of confidentiality obligations","checked":true},
      {"id":"item-1","label":"Check definition of confidential information","checked":true},
      {"id":"item-2","label":"Review exclusions from confidentiality","checked":true},
      {"id":"item-3","label":"Confirm duration of obligations","checked":true},
      {"id":"item-4","label":"Check permitted disclosures","checked":false},
      {"id":"item-5","label":"Review return / destruction of information clause","checked":false}
    ]'::JSONB
  );

  -- --------------------------------------------------------
  -- LOW — SaaS renewal, auto-renew only
  -- --------------------------------------------------------
  INSERT INTO public.contracts (
    case_id, submitted_by, contract_type, type_label, counterparty,
    department, estimated_value, deadline, is_renewal,
    risk_factors, notes, urgency, risk_score, route,
    clause_results, checklist
  ) VALUES (
    'CT-2025-Y7Z8A', v_user_id,
    'saas', 'SaaS / Software License', 'Zoho Corporation',
    'IT Operations', '€4,800', CURRENT_DATE + 60, 'Yes',
    ARRAY['auto_renew'],
    'CRM tool renewal. Low usage — procurement team reviewing whether to continue.',
    'Low', 1, 'IT Legal / Commercial',
    '[]'::JSONB,
    '[
      {"id":"item-0","label":"Review SLA and uptime guarantees","checked":true},
      {"id":"item-1","label":"Check data ownership and portability rights","checked":true},
      {"id":"item-2","label":"Verify security and compliance certifications","checked":true},
      {"id":"item-3","label":"Review termination and exit provisions","checked":true},
      {"id":"item-4","label":"Check auto-renewal terms and pricing adjustments","checked":false},
      {"id":"item-5","label":"Review liability caps and indemnification","checked":false},
      {"id":"item-6","label":"Note auto-renewal date and opt-out window","checked":false}
    ]'::JSONB
  );

  -- --------------------------------------------------------
  -- LOW — Simple service agreement
  -- --------------------------------------------------------
  INSERT INTO public.contracts (
    case_id, submitted_by, contract_type, type_label, counterparty,
    department, estimated_value, deadline, is_renewal,
    risk_factors, notes, urgency, risk_score, route,
    clause_results, checklist
  ) VALUES (
    'CT-2025-B9C0D', v_user_id,
    'service', 'Service Agreement', 'DesignStudio Bt.',
    'Marketing', '€7,500', NULL, 'No',
    ARRAY[]::TEXT[],
    'Brand refresh and visual identity design. Fixed-fee engagement. 6-week timeline.',
    'Low', 0, 'Commercial Legal',
    '[]'::JSONB,
    '[
      {"id":"item-0","label":"Confirm scope of services and deliverables","checked":true},
      {"id":"item-1","label":"Review payment terms and milestones","checked":true},
      {"id":"item-2","label":"Check termination for convenience clause","checked":false},
      {"id":"item-3","label":"Verify limitation of liability","checked":false},
      {"id":"item-4","label":"Review dispute resolution mechanism","checked":false},
      {"id":"item-5","label":"Check IP ownership of work product","checked":false}
    ]'::JSONB
  );

END $$;

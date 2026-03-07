
Contract Triage
Contract Review Intake & Triage System
Proof of Concept — Project Concept Document
IT & Law • 2026 Spring • Corvinus University of Budapest
By: Ahmed Faarih & Hbaieb Nour


What the project is -  Executive Summary
It is an internal digital tool that helps an organization handle incoming contracts in a consistent, structured, and efficient way.
In many companies, contracts arrive through unstructured channels (email, shared drives, forwarded messages)

The problem is that these contracts are often:
Submitted without key details (value, deadline, type)
Sent to the wrong reviewer or team
Not assessed for urgency or risk before entering the queue

Our PoC solves that by creating a guided intake and triage layer.
The tool would not replace legal review or negotiate contract terms. It would do the front-end compliance work:
Collect the right facts about the contract
Standardize the intake
Classify the contract type
Assess urgency and risk
Route it to the correct legal team
Generate a usable case intake summary


What the PoC actually does
A user (contract requestor, business unit, procurement officer, or legal coordinator) submits a contract review request through a guided workflow. The system then processes the submission and produces a structured case intake output.
1) Structured contract capture
The tool asks the requestor clear, guided questions instead of letting them submit a vague email with an attachment.
For example:
What type of contract is this?
Who is the counterparty?
What is the estimated contract value?
What is the review deadline?
Is this a new contract, renewal, or amendment?


2) Contract type classification
Once the request is submitted, the tool classifies the contract into a type.
For example:
Non-Disclosure Agreement (NDA)
SaaS / Licensing Agreement
Service Agreement
Data Processing Agreement (DPA)
Procurement / Supply Contract
Other

This is critical because different contract types go to different reviewers.


3) Urgency and risk flagging
The system applies rules (or AI-assisted logic) to detect whether the contract may require urgent or elevated review.
Risk factors include:
Contract value exceeds a defined threshold (e.g. €100,000)
Personal data processing is involved
Cross-border obligations exist
Uncapped liability exposure

It is a triage flag (Low, Medium, High, Critical)


4) Routing recommendation
Based on the contract type and risk profile, the system recommends where the request should go.
Examples:
General Legal
Commercial / Sales Legal
Data Protection / Privacy
IP Legal
Procurement Legal
HR Legal
Corporate / M&A Legal
Public Sector / Regulatory
Senior Counsel Escalation


5) Case intake summary generation
The tool creates a clean, internal-facing summary:
Case ID
Date received
Contract type
Counterparty
Requesting department
Estimated value
Review deadline and days remaining
Risk factors flagged
Urgency level
Recommended reviewer / team
Immediate next steps

This makes the request usable right away by the receiving legal team.


6) Review checklist
A smart addition is to generate a checklist for the reviewing lawyer:
Liability cap reviewed?
Indemnity clauses flagged?
Data processing terms present (if applicable)?
Termination provisions reviewed?
Governing law and jurisdiction noted?
Auto-renewal / notice period checked?
IP ownership / licensing terms checked?
Confidentiality obligations reviewed?

This makes the PoC feel much more like a legal operations tool and less like just a form.


AI-powered clause extraction
A key differentiator of this PoC is the ability to paste contract text directly into the intake form and run automated clause analysis (heuristics-based).
When contract text is provided, the system scans for key legal provisions and assigns triage indicators (low/medium/high) based on predefined triggers (e.g., uncapped liability, cross-border, personal data), subject to human confirmation:

Clause
Risk
What to check
Liability
High
Verify caps and exclusions
Indemnification
High
Review scope — mutual vs. one-sided
Data Protection
High
Ensure DPA is in place if personal data is processed
IP Rights
High
Clarify ownership and licensing terms
Exclusivity
High
Assess business impact of non-compete terms
Penalties
High
Assess financial exposure from liquidated damages
Termination
Medium
Check notice periods and grounds for termination
Auto-Renewal
Medium
Confirm notice period to opt out
Warranties
Medium
Review representations and disclaimers
Dispute Resolution
Medium
Review arbitration or mediation process
Assignment
Medium
Check restrictions on transfer of obligations
Confidentiality
Low
Review duration and scope of obligations
Governing Law
Low
Confirm alignment with company policy
Force Majeure
Low
Review triggering events and remedies


This feature transforms the tool from a simple form into an intelligent pre-screening assistant.


Who the users are
The system serves two types of users:

Primary user
The person submitting the contract for review:
Business unit manager
Procurement officer
Sales / commercial team member
HR manager
Project lead

Secondary user
The internal legal reviewer or coordinator:
In-house counsel
Legal operations manager
Data protection officer
IP counsel
Compliance officer


What the live demo would look like
Scenario
A procurement officer needs to submit a new vendor service agreement for legal review. The contract involves personal data processing, has a tight deadline, and includes uncapped liability terms.

Demo steps
Open the intake form
Select contract type: Service Agreement
Enter counterparty, department, value, and deadline
Flag risk factors: personal data processing, uncapped liability
Paste contract text into the AI analysis field
Run clause extraction — system flags liability, indemnification, data protection clauses
Submit the request
System classifies urgency as High
System routes to Data Protection / Privacy team with senior counsel escalation
System generates full intake summary and review checklist

That is a strong demo because the output is visible, structured, and clearly useful. The AI clause analysis adds an extra layer of intelligence.



How it is built technically
This is very buildable. You do not need to create a full enterprise contract management system.
The PoC is built as a React web application with three views:

Front end
Guided intake form with dropdowns, radio buttons, checkboxes, and text fields
Contract text input area with AI clause extraction
Mock file attachment placeholder
Triage result view with summary, routing, and checklist
Dashboard of all submitted contracts with statistics

Logic layer
Rule-based classification for contract type routing
Weighted risk scoring for urgency calculation
Deadline proximity analysis
Pattern-based clause extraction from contract text
Routing override logic for special risk factors

Output
Case intake summary with all key fields
Routing recommendation with escalation logic
Urgency flag (Low / Medium / High / Critical)
Interactive review checklist
AI clause analysis results with risk levels

Tools
Built with:
React or Vue (functional components with hooks)
GrokAI or Gemini artifact environment for rapid prototyping
Deployable on Vercel, Netlify, or self hosted server








What the value proposition is
This is the part the professor will care about.

The PoC improves the first stage of internal contract review management by transforming unstructured contract requests into standardized, triaged cases that can be routed quickly and reviewed more consistently.


In simpler business language:
Faster intake and routing
Better documentation from day one
Reduced misrouting and delays
Risk-aware prioritization
Clearer accountability
More consistent legal review process


Risks and limitations to acknowledge
To make the concept sound mature, it is important to mention what the PoC does not do.

It does not provide legal advice or review contracts
It does not replace the judgment of a qualified lawyer
It only supports intake and triage — not negotiation or execution
The clause extraction is pattern-based, not a full NLP analysis
Final review decisions remain with human legal professionals
The routing logic is configurable but not organization-specific out of the box

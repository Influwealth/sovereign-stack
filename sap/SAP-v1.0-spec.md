# SAP v1.0 — Sovereign Agent Protocol (Draft Spec)

SAP is the message contract for agents, capsules, DeepFlex, ICP, and IFA.

Required fields:
- sap_version
- message_id
- from
- to
- capability_id
- intent
- signature

Validation rules:
- MUST have supported sap_version
- MUST have unique message_id
- MUST verify signature
- MUST map capability_id to IFA capability
- MUST reject invalid messages

Intent types (Phase 1):
- execute_capsule
- query_state
- update_state
- negotiate

Financial Intent (optional):
- budget
- currency
- max_spend
- sponsor
- settlement_model

If cost > max_spend ? MUST halt.

SAP + IFA flow:
SAP wraps ? IFA authorizes ? Execution runs ? SAP returns result.

Phase 1 scope:
- Local DeepFlex execution
- One ICP canister call
- Logging for RFC-0002 refinement

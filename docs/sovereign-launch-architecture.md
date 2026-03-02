# Sovereign-Launch Architecture (Design, No Script)

Status: Draft v1  
Scope: Runtime architecture only. This document intentionally does not include an executable launch script.

## Objectives
1. Boot DeepFlex Runtime Core as the single subsystem authority.
2. Register all subsystems through Runtime Core before any orchestration work is accepted.
3. Enforce SAP signatures, identity verification, and FinancialIntent reservation gates from first message.
4. Establish mesh registration and health posture before workload execution.

## Registration Order
1. `runtime-core`
2. `identity`
3. `event-bus` (logical subsystem mapped to runtime event stream)
4. `mesh-registry`
5. `capsule-sandbox`
6. `capsule-runtime`
7. `financial-intent`
8. `policy-engine`
9. `scheduler`
10. `agent-runtime`
11. `agent-orchestrator`
12. `wallet-bridge`
13. `tax-automation`
14. `quickbooks-connector`
15. `document-ingestion`
16. `ledger-reconciliation`
17. `observability`

Notes:
- Any subsystem not registered in Runtime Core is considered unavailable.
- Agent identities are registered dynamically when first used, but only after `identity` is online.

## Failure Conditions
1. Runtime Core startup failure.
- Launch aborts immediately.
2. Identity subsystem not registered.
- SAP dispatch is hard blocked (`identity verification required`).
3. Signature scheme unavailable or invalid signing key.
- All SAP dispatch rejected.
4. Mesh registration failure for required subsystems (`identity`, `capsule-runtime`, `financial-intent`).
- Launch enters degraded mode and blocks orchestration.
5. Capsule sandbox missing.
- Capsule execution blocked (no direct route execution fallback).
6. FinancialIntent settlement stub unavailable.
- Financial intents rejected for payout-capable intents.
7. Health check failures above threshold.
- If any critical subsystem is `offline`, launch fails.
- If non-critical subsystem is `degraded`, launch can continue in degraded mode with route restrictions.
8. Replay protection store unavailable.
- SAP dispatch blocked to prevent duplicate execution risk.

## Health Checks
Each subsystem must expose:
- `status`: `healthy | degraded | offline`
- `last_check`: ISO timestamp
- `dependencies`: list of required upstream systems
- `details`: machine-readable object for diagnostics

Required checks:
1. `runtime-core`
- Subsystem registry loaded.
- Signature scheme initialized.
2. `identity`
- Resolve + verify endpoints responding.
3. `mesh-registry`
- Node list available, no duplicate IDs.
4. `capsule-sandbox`
- Timeout + payload threshold config valid.
5. `capsule-runtime`
- Can resolve capsule store and load routes.
6. `financial-intent`
- Reservation and settle operations return valid records.
7. `wallet-bridge`
- Payout client preflight check.
8. `tax-automation`
- Tax routes and form transformers loaded.
9. `quickbooks-connector`
- API auth + ledger endpoint reachability.
10. `document-ingestion`
- OCR/parsing pipeline available.
11. `ledger-reconciliation`
- Reconcile strategy loaded.
12. `observability`
- Event ingest and metrics sinks available.

## Mesh Boot Sequence
Phase A: Runtime foundation
1. Start Runtime Core.
2. Start Event Bus and bind to Runtime Core.
3. Initialize Signature Scheme and replay guard.

Phase B: Trust + control plane
1. Register Identity subsystem.
2. Register Mesh Registry subsystem.
3. Run first trust-plane health sweep.

Phase C: Execution plane
1. Register Capsule Sandbox.
2. Register Capsule Runtime.
3. Register FinancialIntent subsystem.
4. Run execution-plane health sweep.

Phase D: Orchestration plane
1. Register Policy Engine + Scheduler.
2. Register Agent Runtime + Agent Orchestrator.
3. Register wallet and finance integrations.

Phase E: Business workflows
1. Register tax-automation.
2. Register quickbooks-connector.
3. Register document-ingestion.
4. Register ledger-reconciliation.

Phase F: Observability and readiness
1. Register observability subsystem.
2. Run full mesh health check.
3. Set launch state:
- `ready` when all critical subsystems are healthy.
- `degraded` when only non-critical subsystems are degraded.
- `failed` when any critical subsystem is offline.

## Critical vs Non-Critical
Critical:
- runtime-core
- identity
- signature scheme
- mesh-registry
- capsule-sandbox
- capsule-runtime
- financial-intent

Non-critical (degraded allowed):
- quickbooks-connector
- document-ingestion
- ledger-reconciliation
- observability exporters

## Readiness Gate
Sovereign-launch is considered complete only when:
1. All critical subsystems are `healthy`.
2. Mesh registry contains all required subsystem IDs.
3. SAP dispatch test succeeds for:
- `identity.verify_signature`
- `execute_capsule`
- `financial_intent.execute_payout` (stub mode)

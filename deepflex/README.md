# DeepFlex Agent OS

**Role**: Capsule runtime, SAP integration, local orchestration.

**Phase 1 goals**
- Local runtime
- MCP-UI integration
- WebGPU simulation hooks

## Runtime Core (Phase 1)
- `runtime-core.ts`: canonical subsystem registry + SAP enforcement.
- `identity-subsystem.ts`: identity resolution + signature verification for SAP envelopes.
- `FinancialIntent` is enforced as a runtime stub (`max_spend` gate) before execution.
- Subsystem communication is routed through `DeepFlexRuntimeCore.dispatch(...)` using SAP messages only.

## Runtime Components
- `capsule-sandbox.ts`: payload + timeout guardrails for capsule handler execution.
- `event-bus.ts`: internal runtime event stream (`sap.dispatch.*`, mesh registration, subsystem lifecycle).
- `signature-scheme.ts`: HMAC SHA-256 signing and verification for SAP envelopes.
- `mesh-registration.ts`: runtime subsystem mesh node registration + health status tracking.
- `financial-settlement.ts`: FinancialIntent reservation/settlement stub for controlled payout execution.

## R&D Sign-Up Capsule Flow
- SAP intent: `RDSignupIntent`
- Sender capability required: `rd.signup.process`
- Runtime target subsystem: `rd-signup-intent`
- Financial control: `createRDSignupFinancialIntentStub(...)` is attached to every RD signup dispatch.
- Identity and signature checks: enforced by Runtime Core before dispatch, same as all SAP traffic.
- Argus auditing:
  - `rd-signup-audit-bridge` listens to `sap.dispatch.received|completed|failed` events where `intent=RDSignupIntent`.
  - Audit envelopes are forwarded to `argus-audit` using `argus.audit.record`.
  - Records are persisted in `wealthbridge-os/data/argus-rd-signup-audit.json`.

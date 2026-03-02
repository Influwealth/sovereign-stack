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

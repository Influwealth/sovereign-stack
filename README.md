# Sovereign‑Stack Monorepo
### WealthBridge OS • DeepFlex Runtime • Capsule Engine • Quantum Adapter Layer

## 🚀 Overview
Sovereign‑Stack is the unified monorepo powering the Influwealth Quantum Automation Platform.
It consolidates 14 previously independent repositories into a single, coherent, capsule‑driven operating system.

This monorepo contains:

- **DeepFlex Runtime** — local sovereign compute gateway
- **WealthBridge OS** — capsule scheduler + orchestrator
- **Capsule Runtime** — modular automation units
- **Quantum Adapter Layer** — Qiskit‑ready quantum compute bridge
- **SoMesh Telecom Layer** — telecom adapters (billing, eSIM, PSTN, SIP, RAN‑OAI)
- **SAP + ICP Integrations** — enterprise + decentralized compute
- **OpenWhispr + MCP‑UI** — human interface + agent control panel

## R&D Sign-Up Capsule (WealthBridge Integrated)
- SAP intent: `RDSignupIntent`
- Capsule handler: `wealthbridge-os/capsules/rd-signup-capsule.ts`
- Runtime dispatch: DeepFlex Runtime Core (`rd-signup-intent` subsystem)
- Audit visibility: Argus audit subsystem receives all `RDSignupIntent` lifecycle events
- Outputs:
  - R&D activity logs in `docs/tax/rd-logs` and `data/tax/rd-logs`
  - Draft R&D tax package in `docs/tax/rd-packages` and `data/tax/rd-packages`
  - WealthBridge member and tax capsule records in `wealthbridge-os/data/rd-signup-records.json`

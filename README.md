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

## Developer Workflow

### Install & Build
```bash
npm install
npm run build
```

### Run (dev)
```bash
npm run dev
# or with custom paths
RD_DATA_ROOT=.tmp-rd-test/data RD_DOCS_ROOT=.tmp-rd-test/docs npm run dev
```

### Run (prod)
```bash
npm start
```

### Tests
```bash
npm test       # vitest + supertest
npm run test:watch
```

### Docker
Build and run the containerized service (multi-stage Node 20-alpine):
```bash
docker build -t rd-signup .
docker run -p 8088:8088 \
  -e RD_SIGNUP_HOST=0.0.0.0 -e RD_SIGNUP_PORT=8088 \
  -v $PWD/data:/app/data -v $PWD/docs:/app/docs rd-signup
```

Or use compose:
```bash
cd deployments/rd-signup
docker compose up --build
```

### Environment
- `RD_SIGNUP_HOST` (default `0.0.0.0`)
- `RD_SIGNUP_PORT` (default `8088`)
- `RD_SIGNUP_AGENT_ID` (default `agent_001`)
- `RD_DATA_ROOT` (default `./data`)
- `RD_DOCS_ROOT` (default `./docs`)
- `RD_RATE_LIMIT_MAX` / `RD_RATE_LIMIT_WINDOW_MS`
- `RD_PAYLOAD_LIMIT_BYTES`

### Health & Readiness
- `/healthz` — liveness
- `/readyz` — checks filesystem writeability and runtime subsystem registration

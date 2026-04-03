# sovereign-stack — Production Readiness Audit
**Version:** 1.0.0
**Audit Date:** 2026-03-27
**Auditor:** Claude (Chief Architect, AGI Council)
**Status:** ⚠️ NOT PRODUCTION READY — 5 Critical, 7 High, 9 Medium issues

---

## Executive Summary

The sovereign-stack base is architecturally sound. The DeepFlex Runtime Core (SAP dispatch, HMAC signing, event bus, capsule sandbox, replay protection) is well-structured and typed. The WealthBridge Orchestrator + AgentRuntime + AgentOrchestrator pipeline is coherent. The rd-signup Fastify server has proper validation and health endpoints.

However, the stack cannot be deployed to production in its current state due to security gaps, missing secrets management, an incorrect capability profile lookup, a placeholder tax engine, no pinned dependencies, and no automated test coverage. This document catalogs every issue by severity with exact file locations and the fix required.

---

## P0 — CRITICAL (Block deployment)

### C-01 · Hardcoded HMAC Signing Key Fallback
**File:** `deepflex/signature-scheme.ts` · Line 52
```ts
this.key = options.key ?? process.env.DEEPFLEX_SAP_SIGNING_KEY ?? "deepflex-local-dev-key";
```
**Risk:** If `DEEPFLEX_SAP_SIGNING_KEY` is not set in the environment, every SAP message is signed with a well-known literal string. An attacker who knows the stack can forge valid SAP messages and bypass identity enforcement.
**Fix:** Remove the fallback string. Throw on startup if the env var is missing:
```ts
const key = options.key ?? process.env.DEEPFLEX_SAP_SIGNING_KEY;
if (!key) throw new Error("DEEPFLEX_SAP_SIGNING_KEY must be set in environment.");
this.key = key;
```

---

### C-02 · `capabilityProfiles` lookup bug — always throws
**File:** `wealthbridge-os/agent-federation/agent-runtime.ts` · Line 47
**Registry:** `wealthbridge-os/agent-federation/agent-registry.json`

The registry stores profiles with `"id"` and `"label"` fields:
```json
{ "id": "profile_admin", "label": "Sovereign Admin", "capabilities": [...] }
```
The runtime queries by `entry.name`:
```ts
const profile = this.getRegistry().capabilityProfiles.find(entry => entry.name === profileName);
```
There is no `name` field. `getCapabilityProfile()` will **always** throw "not found" for any profile.
**Fix:** Either rename `id` → `name` in the registry JSON, or update the finder to use `entry.id ?? entry.name`.

---

### C-03 · In-Memory Replay Protection — Resets on Restart
**File:** `deepflex/runtime-core.ts` · Line 121
```ts
private readonly processedMessageIds = new Set<string>();
```
The replay protection set is in process memory only. On any restart, crash, or horizontal scale-out, all previously processed message IDs are forgotten. An attacker can replay any captured SAP message after a restart.
**Fix:** For production, `processedMessageIds` must be backed by a persistent store (Redis with TTL, or a DB table). For now, add a startup warning if no external store is configured.

---

### C-04 · `user_map.json` Fallback Maps Unknown Users to Real Wallet
**File:** `wealthbridge-os/src/wallet-bridge/user_map.json`
```json
{ "agent_001": "wallet_001", "001": "wallet_001", "unknown": "wallet_001" }
```
The key `"unknown"` maps to `wallet_001`. Any request that fails wallet resolution falls through to a real wallet, potentially triggering unintended payouts.
**Fix:** Remove the `"unknown"` entry. `resolveWalletIdForUser` already returns `null` for missing keys — let callers handle the null case explicitly.

---

### C-05 · Hardcoded Credentials in `docker-compose.yml`
**File:** `capsules/wealthbridge-tax-stack/docker-compose.yml`
```yaml
POSTGRES_PASSWORD: postgres
OPENWISPR_SECRET: changeme
```
These are committed to git. Even as dev defaults, they train operators to use weak credentials.
**Fix:** Replace with env var references:
```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
OPENWISPR_SECRET: ${OPENWISPR_SECRET}
```
Add a `.env.example` beside the compose file with placeholder values.

---

## P1 — HIGH (Fix before first external-facing deployment)

### H-01 · TypeScript Strict Mode Disabled
**File:** `tsconfig.json` · Line 10
```json
"strict": false
```
`strict: false` disables null checks, implicit any, strictFunctionTypes, etc. This hides entire classes of runtime errors that only surface in production.
**Fix:** Set `"strict": true`. Run `tsc --noEmit` and fix the resulting errors before shipping.

---

### H-02 · Python Requirements Unpinned
**File:** `capsules/wealthbridge-tax-stack/requirements.txt`
```
fastapi
uvicorn
pydantic
pyyaml
python-dotenv
requests
sqlalchemy
psycopg2-binary
```
No versions pinned. Any `pip install` will pull latest, which can break at any time.
**Fix:** Pin all versions. Run `pip freeze > requirements.txt` from the working `.venv`. Example:
```
fastapi==0.115.0
uvicorn==0.29.0
pydantic==2.6.3
```

---

### H-03 · Dockerfile Uses Unpinned Base Image
**File:** `capsules/wealthbridge-tax-stack/Dockerfile`
```dockerfile
FROM python:3.11
```
Not reproducible — `python:3.11` updates in place. Also the full image is ~900MB.
**Fix:**
```dockerfile
FROM python:3.11.9-slim
```

---

### H-04 · No Authentication on API Endpoints
**File:** `scripts/rd-signup-server.ts`
The `/api/rd-signup` endpoint accepts any `x-agent-id` header. There is no token validation, API key check, or JWT verification. Anyone who can reach the port can submit payloads.
**Fix:** Add a pre-handler that validates a bearer token or signed request before routing to the intent executor.

---

### H-05 · No Rate Limiting
**File:** `scripts/rd-signup-server.ts`
No rate limiting on any endpoint. A burst of requests will hammer the Circle payout API and burn idempotency keys.
**Fix:** Add `@fastify/rate-limit` plugin. Suggested: 10 requests/minute per IP for `/api/rd-signup`.

---

### H-06 · `tax_engine.py` Is a Placeholder, Not a Tax Engine
**File:** `capsules/wealthbridge-tax-stack/tax_capsule/tax_engine.py`
```python
tax_rate = 0.21
tax_due = taxable_income * tax_rate
```
A flat 21% rate with no entity type, jurisdiction, tax year, deductions, or bracket logic. The IRS forms (`form_1065.py`, `form_1120.py`, `form_941.py`) are also stubs. This cannot be used for actual tax filing.
**Fix:** Implement proper rate tables or integrate with a tax calculation library. At minimum, gate the endpoint with a disclaimer and block it from any production billing flow until fully implemented.

---

### H-07 · `moduleResolution: "node"` Is Deprecated
**File:** `tsconfig.json` · Line 7
```json
"moduleResolution": "node"
```
`"node"` resolution is deprecated for ESM projects (`"type": "module"` in package.json). It doesn't resolve `exports` fields in packages, causing silent resolution failures.
**Fix:** Change to `"moduleResolution": "NodeNext"` and update `"module": "NodeNext"`. Then verify all imports.

---

## P2 — MEDIUM (Fix within first sprint post-launch)

### M-01 · No Automated Test Coverage
**Files:** `wealthbridge-os/tests/agent-payout-harness.ts`, `wealthbridge-os/tests/rd-signup-harness.ts`
These are manual invocation scripts, not test suites. There is no test runner (Jest, Vitest), no assertions, no CI pipeline, and no coverage tracking.
**Fix:** Add Vitest or Jest. Write unit tests for: `DeepFlexRuntimeCore.dispatch()`, `HmacSignatureScheme`, `CapsuleSandbox`, `AgentOrchestrator.executeRDSignupIntent()`, and the Fastify route validators.

---

### M-02 · `CapsuleSandbox` Has No Real Isolation
**File:** `deepflex/capsule-sandbox.ts`
The sandbox enforces payload size limits and execution timeouts, but runs handlers in the same V8 context with the same memory space. A misbehaving capsule handler can access globals, throw uncaught async errors, or affect shared state.
**Fix:** For v1.x, document this limitation clearly. For v2, evaluate Node.js Worker Threads or `vm.runInContext()` for actual isolation.

---

### M-03 · `sub-package package.json` Files Are Empty Stubs
**Files:** `deepflex/package.json`, `wealthbridge-os/package.json`, `openwhispr/package.json`, `sap/package.json`, etc.
These have no `dependencies`, `devDependencies`, `scripts`, `types`, or `exports` fields. They are placeholder files that don't describe the actual module.
**Fix:** Populate each sub-package properly, or consolidate into a monorepo with workspaces defined in root `package.json`.

---

### M-04 · Root-Level One-Off Scripts Polluting the Repo
**Files at root:**
`fix-all-dirname.cjs`, `fix-batch.cjs`, `fix-circle.cjs`, `fix-esm-all.cjs`, `fix-final.cjs`, `fix-payout.cjs`, `fix-registry.cjs`, `fix-registry2.cjs`, `fix-runtime.cjs`, `fix-usermap.cjs`, `fix-usermap2.cjs`, `create-wallets.cjs`, `create-wallets2.cjs`, `show-registry.cjs`, `show-runtime.cjs`, `show-validator.cjs`, `show-validator2.cjs`, `write-circle.cjs`
18 one-off scripts at root. These make the repo unnavigable and suggest ongoing ad-hoc debugging rather than structured development.
**Fix:** Move any still-needed scripts to `scripts/utils/`. Delete the rest. Each kept script should have a comment block explaining its purpose.

---

### M-05 · No Graceful Shutdown in Fastify Server
**File:** `scripts/rd-signup-server.ts`
No `SIGTERM`/`SIGINT` handlers. In a container, the process will be killed hard, potentially mid-request.
**Fix:**
```ts
process.on("SIGTERM", async () => {
  await server.close();
  process.exit(0);
});
```

---

### M-06 · `EventBus.safeInvoke` Drops Errors Silently
**File:** `deepflex/event-bus.ts` · Line 95–100
```ts
private safeInvoke(handler, event): void {
  try { handler(event); } catch (_error) { /* silently ignored */ }
}
```
Handler exceptions are dropped with no log. The Argus audit bridge relies on this bus — silent failures mean audit records can vanish without warning.
**Fix:** Log dropped errors at minimum:
```ts
} catch (error) {
  console.error("[EventBus] Handler threw for event:", event.type, error);
}
```

---

### M-07 · No `.env.example` at Root
**File:** Root directory
`wealthbridge-os/src/wallet-bridge/.env.example` exists. Root has no `.env.example`. New developers have no reference for required env vars (`DEEPFLEX_SAP_SIGNING_KEY`, `CIRCLE_API_KEY`, `RD_SIGNUP_HOST`, `RD_SIGNUP_PORT`, `RD_SIGNUP_AGENT_ID`).
**Fix:** Create `/sovereign-stack/.env.example`:
```env
DEEPFLEX_SAP_SIGNING_KEY=change-me-32-char-min
CIRCLE_API_KEY=
RD_SIGNUP_HOST=0.0.0.0
RD_SIGNUP_PORT=8088
RD_SIGNUP_AGENT_ID=agent_001
```

---

### M-08 · `loadCapsuleArtifacts` Silently Returns Empty Routes
**File:** `wealthbridge-os/runtime-loader.ts` · Lines 26–29
```ts
} catch (err) {
  // continue to next candidate
}
```
If a capsule module fails to load, the error is swallowed and an empty `{ routes: {} }` is returned. Route calls on this capsule will fail later at dispatch time with an obscure "Route not found" error instead of a clear load error.
**Fix:** Log the load failure at minimum. In strict mode, throw.

---

### M-09 · `capabilityProfiles` Missing `name` Field in Registry
(See C-02 above) — affects runtime correctness. The field name mismatch is documented under Critical but the registry JSON also needs a schema definition to prevent this class of bug from recurring.
**Fix:** Add a JSON Schema for `agent-registry.json` and validate on startup via `AgentRuntime.validate()`.

---

## P3 — LOW (Tech debt, clean up within 30 days)

| ID | File | Issue |
|----|------|-------|
| L-01 | `wealthbridge-os/agent-federation/agent-runtime.ts` | `loadRegistry()` uses sync `fs.readFileSync` — blocks event loop. Switch to `fs.promises.readFile`. |
| L-02 | `capsules/wealthbridge-tax-stack/.venv/` | Python venv in workspace. Should live outside the repo or be .gitignored more aggressively. |
| L-03 | `deepflex/package.json` | `"main": "index.js"` but the file is `index.ts`. Must compile first. Add `"types": "index.d.ts"`. |
| L-04 | `deployments/`, `icp-integration/`, `infra-federated-access/` | Mostly `.gitkeep` + stub README. Remove or populate. |
| L-05 | `somesh/.gitmodules` | References a submodule but no submodule is configured in `.git/config`. Either initialize or remove. |
| L-06 | `capsule-registry.json` | Lists 5 capsules; `capsules/` directory has 10. Registry is out of sync. |
| L-07 | `wealthbridge-os/src/wallet-bridge/circleClient.ts` | `console.log` prints API key prefix. Ensure log level gates this in production. |
| L-08 | `mcp-ui/node_modules/` | Not git-tracked (good) but present in workspace. Should not be in `mnt/`. |
| L-09 | `tax/rd-log-generator.ts` | Orphaned file — not imported anywhere. |
| L-10 | `WB_Archive_Split.7z.*` | Large binary archives in workspace. Move to external storage (S3, GDrive). |

---

## Production Checklist — Minimum Gates

Before any production traffic, all P0 and P1 items must be resolved. Use this as a launch gate:

- [ ] **C-01** — `DEEPFLEX_SAP_SIGNING_KEY` required, no fallback
- [ ] **C-02** — `capabilityProfiles` name field fixed
- [ ] **C-03** — Replay protection externalized (Redis/DB)
- [ ] **C-04** — `"unknown"` entry removed from `user_map.json`
- [ ] **C-05** — `docker-compose.yml` uses env var refs, not hardcoded passwords
- [ ] **H-01** — `tsconfig.json` strict mode enabled, all errors resolved
- [ ] **H-02** — `requirements.txt` fully pinned
- [ ] **H-03** — Dockerfile uses `python:3.11.x-slim`
- [ ] **H-04** — API endpoints have auth middleware
- [ ] **H-05** — Rate limiting added to Fastify
- [ ] **H-06** — `tax_engine.py` gated or replaced with real logic
- [ ] **H-07** — `moduleResolution` updated to `NodeNext`
- [ ] Root `.env.example` created
- [ ] Graceful shutdown handlers added
- [ ] At least smoke-test coverage on dispatch pipeline and rd-signup route

---

## What's Working Well ✓

- **DeepFlex Runtime Core** — clean dispatch pipeline, SAP enforcement, financial intent evaluation, event bus, identity verification flow. Production-quality architecture.
- **HMAC signature scheme** — uses `timingSafeEqual`, canonical JSON serialization, prefixed scheme ID. Solid.
- **CapsuleSandbox** — timeout enforcement and payload size limits are correctly implemented.
- **Fastify RD-Signup Server** — proper input validation, health endpoint, structured logging via Fastify logger.
- **AgentOrchestrator** — correctly separates capability check → SAP message build → dispatch flow.
- **`.gitignore`** — correctly excludes `.env`, `.venv`, `node_modules`, keys, and archives.
- **Argus audit bridge** — event bus subscription with fire-and-forget pattern is correctly designed for non-blocking audit.

---

*Generated by AGI Council Chief Architect. Next review target: post-remediation of all P0/P1 items.*

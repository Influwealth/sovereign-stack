# 12-Layer Operational Matrix

Status: Draft v1  
Scope: End-to-end operational layering for Sovereign-Stack with DeepFlex Runtime Core as control plane.

## Matrix
| Layer | Domain | Agents / Subsystems | Responsibilities | Dependencies |
|---|---|---|---|---|
| 1 | Human Interface | `openwhispr`, `mcp-ui` | Collect intents, display state, operator control | Layer 2 SAP ingress |
| 2 | SAP Ingress | `sap-gateway`, `intent-router` | Validate SAP envelope shape, route intents into Runtime Core | Layer 3 identity, Layer 4 runtime-core |
| 3 | Identity + Trust | `identity`, `ifa-trust-fabric` | DID resolution, signature verification, authorization assertions | Layer 4 signature scheme |
| 4 | Runtime Control Plane | `runtime-core` | Subsystem registration authority, dispatch enforcement, replay protection | Layer 3 identity, Layer 5 event-bus/mesh |
| 5 | Runtime Fabric | `event-bus`, `mesh-registry` | Runtime event propagation, mesh node registration, health state fanout | Layer 4 runtime-core |
| 6 | Capsule Execution | `capsule-sandbox`, `capsule-runtime` | Sandboxed capsule handler execution via SAP intents only | Layer 4 runtime-core, capsule manifests/routes |
| 7 | Agent Federation | `agent-runtime`, `agent-orchestrator`, `agent_001` | Agent identity loading, policy checks, SAP message composition | Layer 3 identity, Layer 4 runtime-core, Layer 6 capsule-runtime |
| 8 | Financial Control | `financial-intent`, `wallet-bridge` | FinancialIntent reservation/settlement stub, payout execution path | Layer 4 runtime-core, external payout rail |
| 9 | Tax Operations | `tax.calculate`, `tax.generate_1120`, `tax.generate_1065`, `tax.generate_941` | Tax computation, form generation, filing preparation | Layer 6 capsule-runtime, Layer 10 accounting connectors |
| 10 | Accounting Connectors | `quickbooks-connector`, `manager-sync-agent` | Chart-of-accounts sync, journal posting, vendor/customer mapping | Layer 8 financial control, Layer 11 reconciliation |
| 11 | Reconciliation + Compliance | `ledger-reconciliation`, `compliance-capsule` | Cross-ledger reconciliation, variance detection, compliance attestations | Layer 8 settlements, Layer 10 accounting data, Layer 12 observability |
| 12 | Observability + Governance | `observability-capsule`, `audit-log`, `policy-engine` | Metrics, tracing, audit events, governance evidence and rollback decisions | All lower layers |

## Agent Inventory
| Agent / Subsystem | Layer | Primary Responsibility | Hard Dependencies |
|---|---|---|---|
| `runtime-core` | 4 | Register subsystems and enforce SAP dispatch | `identity`, signature scheme |
| `identity` | 3 | Verify SAP signatures and identity claims | runtime signer config |
| `event-bus` | 5 | Publish lifecycle and dispatch events | `runtime-core` |
| `mesh-registry` | 5 | Track node registration and health state | `event-bus`, `runtime-core` |
| `capsule-sandbox` | 6 | Enforce payload/timeout limits for capsule calls | `runtime-core` |
| `capsule-runtime` | 6 | Load capsule handlers and execute sandboxed routes | `capsule-store`, `runtime-loader`, `capsule-sandbox` |
| `financial-intent` | 8 | Reserve/settle intent budget in stub mode | `runtime-core`, settlement stub |
| `agent-runtime` | 7 | Resolve agents/capabilities/wallet bindings | `agent-registry.json` |
| `agent-orchestrator` | 7 | Execute policy-approved SAP calls | `agent-runtime`, `runtime-core` |
| `agent_001` | 7 | Administrative orchestration and payout actions | role/capability grants |
| `tax.calculate` | 9 | Tax estimate calculations | tax capsule engine |
| `tax.generate_1120` | 9 | Form 1120 generation | tax capsule forms + ingestion data |
| `tax.generate_1065` | 9 | Form 1065 generation | tax capsule forms + ingestion data |
| `tax.generate_941` | 9 | Form 941 generation | payroll data ingestion |
| `quickbooks-connector` | 10 | Sync journals and balances with QuickBooks | QuickBooks API auth |
| `manager-sync-agent` | 10 | Manager.io integration and mirror sync | manager connector config |
| `ledger-reconciliation` | 11 | Compare internal, payout, and accounting ledgers | ledger feeds and settlement events |
| `policy-engine` | 12 | Capability and governance control decisions | runtime + identity state |
| `observability-capsule` | 12 | Export logs/metrics/traces for all layers | event-bus + audit sinks |

## Dependency Rules
1. Upward-only orchestration: lower layers never directly call higher layers.
2. Lateral communication requires SAP envelope and Runtime Core dispatch.
3. Any missing critical dependency marks the affected layer as `blocked`.
4. Financial side effects require both policy approval and FinancialIntent reservation.

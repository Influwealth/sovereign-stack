# Infra-Federated-Access (IFA) — Sovereign Trust Fabric

IFA is the sovereign trust fabric. It does NOT run compute, agents, or business logic.
It ONLY enforces identity, capabilities, policy, and audit.

Core responsibilities:
- DID identity
- Capability binding
- Capsule execution rights
- Device trust
- Node admission
- Policy enforcement
- Audit logging

Design rule:
If IFA is offline, DeepFlex MUST still run locally in restricted mode.

Flow:
DeepFlex decides ? SAP packages ? IFA authorizes ? Execution layer runs ? IFA logs ? SAP returns result.

Phase 1 scope:
- Basic DID model
- Simple allow/deny capability model
- Node admission for LAN mesh
- Minimal audit log format

# Sovereign Agent Protocol — HTTP Contracts

OpenAPI 3.1 contracts for all inter-service communication in the Sovereign Automation System.

## Services & Ports

| Service | Port | Contract |
|---------|------|----------|
| DeepFlex Supervisor | 8000 | (server) |
| WealthBridge OS Orchestrator | 8001 | deepflex-wealthbridge-api.yaml |
| Token Gateway | 8002 | token-gateway-api.yaml |
| Argus Prime | 7700 | deepflex-argus-api.yaml |
| Tradeline MCP | 7710 | argus-wealthbridge-api.yaml |
| Tax Stack | 7720 | argus-wealthbridge-api.yaml |
| Trade Settlement | 7730 | argus-wealthbridge-api.yaml |

## SAP Headers

All inter-service calls MUST include these headers:

```
x-sap-node-id: <service-name>
x-sap-trace-id: <uuid>
x-sap-version: 1.0
x-sap-capsule: <capsule-name>  (optional)
```

## Contracts

- `deepflex-argus-api.yaml` — DeepFlex → Argus (task dispatch, capsule routing)
- `argus-wealthbridge-api.yaml` — Argus → WealthBridge sub-services
- `deepflex-wealthbridge-api.yaml` — DeepFlex → WealthBridge OS orchestrator
- `token-gateway-api.yaml` — Three-tier token system (in-game, GVC, service tokens)

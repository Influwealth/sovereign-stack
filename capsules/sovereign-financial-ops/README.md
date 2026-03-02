# Sovereign Financial Ops Capsule
**Classification:** SOVEREIGN | CONFIDENTIAL | AGENT-ACCESSIBLE  
**Position:** One level below Codex — peer to wealthbridge-tax-stack  
**Owner:** Victor Morales | InfluWealth Consult LLC  
**Created:** 2026-03-01  

## What This Capsule Does
Manages all sovereign financial operations including:
- Tax filing automation (amend 2022/2023, file 2024/2025)
- Company structure management (InfluWealth Consult LLC + Mista-Weed LLC)
- DAO / Trust / Life Insurance / Business Branch tree
- Agent-assisted IRS form generation
- Manager.io sync (cloud or self-hosted)
- Agoda expense ingestion
- ARGUS compliance monitoring
- Federal API Vault integration (IRS, SAM, SBA, DOL)
- OpenWispr relay for all agent communication

## Capsule Position in Sovereign Stack
```
sovereign-stack/
  codex/                    ? PARENT (orchestrates all capsules)
  capsules/
    wealthbridge-tax-stack/ ? SIBLING (tax engine)
    sovereign-financial-ops/ ? THIS CAPSULE
      company-structures/
      tax-filing/
      dao-trust-tree/
      agents/
      openwhispr-bridge/
      workflows/
      mcp-routes/
      data/
```

## Access Policy
| Actor | Permission |
|-------|-----------|
| Codex | read-write |
| DeepFlex | read-write |
| Outside Agents (SAP-authenticated) | read-execute |
| MCP-UI | read-execute |
| Public | NONE |

## Manager.io Setup
**Recommendation: START WITH CLOUD TRIAL**
1. Go to https://www.manager.io and click "Cloud Edition - Free Trial"
2. Set up InfluWealth Consult LLC as first business
3. Import/enter 2022-2025 transaction data
4. The manager_sync_agent will pull from cloud API

Self-hosted option is available after cloud trial for full sovereignty.

## Quick Start
```bash
cd workflows
python orchestrator.py
```

## Agent Routes
All agents accessible via OpenWispr relay at:
`openwhispr://sovereign-financial-ops/{agent-id}`

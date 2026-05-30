# WBOS Unified Sovereign Workspace
**Document ID:** `WBOS-WORKSPACE-001`
**Version:** `1.0.0`
**Classification:** INTERNAL

---

## What This Is

The **Unified Sovereign Workspace (USW)** is the coordination layer that connects all WealthBridge OS agents — DeepFlex, ChatGPT, Gemini, and Perplexity — through a single shared data plane backed by Supabase Storage and Supabase Postgres.

Every agent reads tasks from this workspace. Every agent writes outputs here. Nothing happens outside the workspace without being logged.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│           UNIFIED SOVEREIGN WORKSPACE (USW)                     │
│                                                                 │
│  Supabase Storage: agent-shared                                 │
│  ├── events/          ← Agent-specific inboxes                  │
│  │   ├── deepflex/    ← DeepFlex reads here                     │
│  │   ├── chatgpt/     ← ChatGPT reads here                      │
│  │   ├── gemini/      ← Gemini reads here                       │
│  │   └── perplexity/  ← Perplexity reads here                   │
│  │                                                              │
│  ├── tasks/           ← Global task queue (all agents watch)    │
│  │   ├── build/       → ChatGPT                                 │
│  │   ├── research/    → Perplexity                              │
│  │   ├── deploy/      → Gemini                                  │
│  │   └── sync/        → Gemini / DeepFlex                       │
│  │                                                              │
│  └── outputs/         ← Agent-produced artifacts                │
│      ├── reports/     ← Perplexity + Gemini                     │
│      ├── code/        ← ChatGPT                                 │
│      ├── summaries/   ← Gemini                                  │
│      └── migrations/  ← ChatGPT                                 │
│                                                                 │
│  Supabase Postgres: wealthbridge-core                           │
│  ├── workspace           Master workspace record                │
│  ├── workspace_events    USTF event stream                      │
│  ├── workspace_tasks     Task assignments                       │
│  └── workspace_outputs   Output artifact registry              │
└─────────────────────────────────────────────────────────────────┘
         ↕ Sync (every 30s)
┌─────────────────────────────────────────────────────────────────┐
│           CAFFEINE AGENT (Local Mirror)                         │
│  caffeine-workspace/ mirrors all bucket folders above           │
│  workspace.json is the live index                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Roles

| Agent | ID | Role | Watches | Writes |
|---|---|---|---|---|
| **DeepFlex** | AGT-DEEPFLEX-001 | Supervisor | All events + tasks | Task assignments, ABL |
| **ChatGPT** | AGT-CHATGPT-001 | Build Engineer | events/chatgpt, tasks/build | outputs/code, outputs/migrations |
| **Gemini** | AGT-GEMINI-001 | Automator | events/gemini, tasks/deploy, tasks/sync | outputs/reports, outputs/summaries |
| **Perplexity** | AGT-PERPLEXITY-001 | Recon | events/perplexity, tasks/research | outputs/reports |

---

## Event Flow

```
1. Human or system creates an event in workspace_events
2. DeepFlex watcher picks it up from events/deepflex/ or DB
3. DeepFlex routes it → creates a workspace_tasks record assigned to correct agent
4. Target agent watcher polls workspace_tasks for assigned tasks
5. Agent accepts task → marks IN_PROGRESS → executes
6. Agent writes output to outputs/ folder in Supabase Storage
7. Agent creates workspace_outputs record
8. Agent emits "completed" event back to DeepFlex
9. DeepFlex logs ABL entry → marks task COMPLETED
10. Supabase Realtime broadcasts update to any live dashboards
```

---

## Event Schema

Every event in the system follows this structure:

```json
{
  "event_id": "EVT-2026-1748567890001",
  "type": "research",
  "source": "deepflex",
  "target": "perplexity",
  "timestamp": "2026-05-30T06:00:00Z",
  "priority": "HIGH",
  "status": "PENDING",
  "cap_ref": "CAP-014",
  "payload": {
    "instruction": "Research CDFI landscape in Greenville NC",
    "output_path": "outputs/reports/gvl-cdfi-2026.json"
  }
}
```

Full schema: `sovereign-workspace/schemas/event_schema.json`

---

## Running the Workspace

### Start all watchers
```bash
# DeepFlex (supervisor) — start first
tsx sovereign-workspace/scripts/watchers/deepflex-watcher.ts

# Agent watchers — start in parallel
tsx sovereign-workspace/scripts/watchers/chatgpt-watcher.ts
tsx sovereign-workspace/scripts/watchers/gemini-watcher.ts
tsx sovereign-workspace/scripts/watchers/perplexity-watcher.ts
```

### Start Caffeine sync
```bash
tsx sovereign-workspace/scripts/sync/supabase-caffeine-sync.ts
```

### Environment setup
```bash
cp sovereign-workspace/agent-env/env.template .env
# Fill in your actual keys from Supabase Dashboard + vault_manifest
```

---

## Supabase Tables

| Table | Purpose |
|---|---|
| `workspace` | Master workspace registry |
| `workspace_events` | Full USTF event stream |
| `workspace_tasks` | Task assignments with status tracking |
| `workspace_outputs` | Output artifact registry with storage paths |

Migrations: `sovereign-workspace/migrations/`

---

## Key Rules for Agents

1. **Read from DB first** — always check `workspace_tasks` before reading from storage
2. **Mark IN_PROGRESS immediately** — prevents double-pickup by parallel agents
3. **Write to storage, then DB** — upload file first, then create `workspace_outputs` record
4. **Always emit completion event** — `type: "completed"`, `target: "deepflex"`
5. **Always write ABL entry** — every action must be logged in `agi_behavior_log`
6. **Never write to another agent's events/ folder** — only DeepFlex dispatches events

---

## Connecting Caffeine Agent

1. Set `CAFFEINE_WORKSPACE_PATH` in `agent-env/caffeine.env`
2. Run `supabase-caffeine-sync.ts` — it will create the local folder structure automatically
3. `workspace.json` in your Caffeine root will update every sync cycle with live task status

---

*WealthBridge OS · InfluWealth Quantum Labs · 2026*

# MONAD v3.7 — Pentagon Sovereign Mesh

This directory contains the runtime configuration and sync protocol for the
MONAD Pentagon 5-node mesh as defined in the MONAD Agent Drive Update Package v3.7.

## Files

| File | Purpose |
|------|---------|
| `global_state.json` | Full mesh topology, node configs, token economy, anchor sites |
| `agent_directives.json` | Per-agent operational directives for all 7 MONAD agents |
| `sync_protocol.py` | 10-step sync sequence driver (Python) |

## Pentagon Node Map

```
       NODE_ALPHA
      (DeepFlex · 8000)
           |
    ┌──────┼──────┐
    │      │      │
NODE_BETA  │  NODE_GAMMA
(Quantum·9400) (ICP·4943)
    │      │      │
    └──────┼──────┘
    NODE_DELTA   NODE_EPSILON
   (NVIDIA·7760) (VR·7791)
```

## Running Sync

```bash
# Dry-run the full 10-step sync for all nodes
python monad/sync_protocol.py

# Run sync for a specific node
python -c "
from monad.sync_protocol import MONADSyncProtocol, NodeID
proto = MONADSyncProtocol(NodeID.ALPHA)
print(proto.run_full_sync())
"
```

## Security Mandates (MONAD v3.7)

- Ed25519 + ICP sealing on every capsule (stubbed in dev — wire real crypto in prod)
- No plaintext secrets in any sync payload or state file
- Replay protection via nonce + timestamp
- Capsule TTL: Critical 500ms · Standard 5s · Background 60s
- SovereignQuant Level 4: INT4 per-channel, 16x embedding compression, 8GB VRAM min

## Network Slices

| Slice | Name | Agents |
|-------|------|--------|
| 001 | INFERENCE | DeepFlex, Codex, SynapZ |
| 002 | MESH_ROUTING | Mesh Alpha, Mesh Beta |
| 003 | VR_INTERFACE | VR Cockpit Primary, VR Cockpit Secondary |

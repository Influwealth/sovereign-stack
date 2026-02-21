# SoMesh Sovereign Connectivity Mesh

**Role**: Network transport, edge discovery, backhaul adapters.

**Phase 1 goals**
- Local peer mesh over WiFi/LAN
- Edge node discovery prototype

**Integration layer**
- Adapter registry (`telecom-registry.json`)
- Telecom router (`src/telecom-router.ts`)
- Event normalization (`src/event-normalizer.ts`)
- Telecom orchestration (`src/telecom-orchestrator.ts`)

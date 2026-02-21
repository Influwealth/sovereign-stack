# SoMesh Telecom Integration Architecture

This layer provides telecom adapter routing and orchestration for Sovereign-Stack.

## Modules

- `src/adapter-registry.ts`: loads enabled adapter config from `telecom-registry.json`
- `src/telecom-router.ts`: maps domain/action requests into adapter commands
- `src/event-normalizer.ts`: normalizes adapter responses into a common event format
- `src/telecom-orchestrator.ts`: orchestrates route -> invoke -> normalize flow
- `src/index.ts`: integration layer entrypoint

## Adapter Coverage

- billing
- esim
- open5gs
- pstn
- ran-oai
- sip

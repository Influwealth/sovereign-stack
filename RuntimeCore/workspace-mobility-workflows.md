# Workspace Mobility Workflows

## Scope
Workspace mobility covers controlled movement of services, agents, and state across Runtime Core domains while preserving security, lineage, and continuity.

## Mobility States
1. Planned
2. Validated
3. In-Transit
4. Rehydrated
5. Active
6. Retired

Each mobility action must persist state transitions with actor identity and policy hash.

## Workflow 1: Planned Relocation
Trigger:
- Capacity rebalance, sovereignty policy update, or maintenance window.

Actors:
- Runtime Core operator
- Synapz mobility coordinator
- Mesh Layer policy gateway

Flow:
1. Define source workspace, destination workspace, and move scope.
2. Evaluate policy compatibility (residency, identity, retention).
3. Reserve destination capacity and assign mobility window.
4. Generate relocation plan ID and freeze mutable config baseline.

Outputs:
- Approved relocation plan
- Signed configuration baseline

Failure handling:
- Policy mismatch blocks plan creation and requests rule exception.

## Workflow 2: Pre-Move Validation
Trigger:
- Approved relocation plan.

Actors:
- Argus attestation service
- Synapz dependency scanner

Flow:
1. Verify source and destination trust posture.
2. Resolve service dependencies and required secrets.
3. Snapshot workflow checkpoints and queue offsets.
4. Confirm rollback target and recovery objective values.

Outputs:
- Validation report
- Mobility readiness certificate

Failure handling:
- Failed attestation marks plan as blocked.
- Missing checkpoint forces dry-run repair before proceeding.

## Workflow 3: State Transfer and Rehydration
Trigger:
- Positive pre-move validation.

Actors:
- Mesh Layer replication service
- Synapz runtime restorer

Flow:
1. Start encrypted state replication with lineage markers.
2. Replay event stream from last checkpoint to cutover boundary.
3. Rehydrate services in destination workspace.
4. Execute contract tests and health probes.
5. Mark destination as ready for cutover.

Outputs:
- Rehydrated runtime services
- Transfer completion proof

Failure handling:
- Replication drift above threshold triggers retry and cutover hold.

## Workflow 4: Live Cutover
Trigger:
- Destination readiness confirmed.

Actors:
- Runtime Core control plane
- Mesh Layer router
- WealthBridge OS and Synapz service owners

Flow:
1. Set source workspace to drain mode.
2. Shift ingress routing to destination in controlled batches.
3. Monitor latency, error budget, and transaction consistency.
4. Promote destination to active state.
5. Archive source runtime state for rollback window.

Outputs:
- Active destination workspace
- Cutover telemetry report

Failure handling:
- SLO breach causes automatic rollback to source workspace.

## Workflow 5: Post-Move Assurance
Trigger:
- Successful live cutover.

Actors:
- Argus monitoring
- WealthBridge OS reconciliation
- Synapz continuity agents

Flow:
1. Run security and policy conformance checks.
2. Reconcile ledgers and pending workflow tasks.
3. Validate no orphaned jobs or duplicated settlements.
4. Close relocation plan with final lineage snapshot.

Outputs:
- Post-move assurance report
- Closed mobility incident log (if any)

Failure handling:
- Any integrity failure reopens relocation plan for controlled rollback.

## Standard Mobility Playbooks
- Scale-out Mobility: Duplicate service sets for temporary demand spikes.
- Sovereignty Migration: Move specific datasets and services into compliant region.
- Incident Isolation: Relocate healthy workloads away from compromised boundary.
- Workspace Consolidation: Merge redundant domains with preservation of lineage.

## Controls
- No mobility action without attestations and rollback target.
- Tax-impacting workloads require ledger reconciliation before retirement of source.
- All workflows must emit `mobility.operation.v1` events for observability.

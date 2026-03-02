# Tax Automation Workflows (SAP + FinancialIntent)

Status: Draft v1  
Scope: Operational workflow definitions for tax automation, accounting sync, ingestion, and reconciliation.

## Workflow A: SAP FinancialIntent Envelope for Tax Execution
Goal: Run tax tasks only when budget and settlement constraints are explicitly approved.

### Envelope Template
```json
{
  "sap_version": "1.0",
  "message_id": "sap-<timestamp>-<seq>",
  "from": "tax.calculate",
  "to": "financial-intent",
  "capability_id": "tax.calculate",
  "intent": "financial_intent.evaluate",
  "signature": "<runtime-signature>",
  "payload": {
    "tax_year": 2025,
    "entity_id": "influwealth-consult-llc",
    "task": "tax.calculate"
  },
  "financial_intent": {
    "budget": 150.0,
    "currency": "USD",
    "max_spend": 150.0,
    "sponsor": "agent_001",
    "settlement_model": "tax-ops-stub",
    "estimated_cost": 125.0
  }
}
```

### Execution Steps
1. Agent submits SAP envelope to Runtime Core.
2. Runtime Core validates signature, identity, capability, replay, and FinancialIntent.
3. Financial intent subsystem creates reservation.
4. Tax route is dispatched to capsule runtime.
5. On completion, reservation is marked settled and persisted in settlement log.

### Failure Rules
1. If `estimated_cost > max_spend`, block immediately.
2. If signature or identity verification fails, reject envelope.
3. If route capability is missing, reject with policy denial.

## Workflow B: QuickBooks Integration
Goal: Sync tax-derived accounting entries into QuickBooks with deterministic mapping.

### Integration Contract
1. Source events:
- Tax due calculations
- Form generation completion
- Payment scheduling decisions
2. Target records:
- Journal Entries
- Bills / Expenses
- Vendor liabilities (federal/state tax authorities)

### Mapping Rules
1. `tax_due` -> liability account `Taxes Payable`.
2. `estimated_payments` -> expense account `Tax Expense`.
3. `refund_expected` -> asset account `Tax Receivable`.
4. Every posting includes `message_id` and `reservation_id` for traceability.

### Sync Sequence
1. Runtime emits `tax.workflow.completed`.
2. QuickBooks connector consumes event from runtime event bus.
3. Connector prepares mapped journal payload.
4. Connector sends write request to QuickBooks API.
5. Connector emits `quickbooks.sync.completed` or `quickbooks.sync.failed`.

### Failure Rules
1. API auth failure -> retry with backoff, then quarantine record.
2. Schema mismatch -> reject posting and mark as `needs_mapping_review`.
3. Duplicate posting key -> idempotent skip.

## Workflow C: Document Ingestion
Goal: Convert source tax documents into structured records for tax agents and accounting sync.

### Accepted Inputs
1. PDFs (W-2, 1099, 1098, K-1, bank statements, receipts)
2. CSV exports from payroll/accounting tools
3. JSON payloads from e-commerce/payment platforms

### Pipeline
1. `document-ingestion` receives file metadata + source checksum.
2. OCR / parser extracts normalized fields.
3. Validator enforces schema and flags missing critical fields.
4. Structured output is saved as `tax_document_record`.
5. Event bus publishes `tax.document.parsed`.

### Required Normalized Fields
1. `document_type`
2. `tax_year`
3. `entity_id`
4. `amounts[]`
5. `counterparty`
6. `source_checksum`
7. `confidence_score`

### Failure Rules
1. Checksum mismatch -> reject as tampered.
2. Confidence below threshold -> mark as `manual_review_required`.
3. Missing tax year or entity -> block downstream tax calculation.

## Workflow D: Ledger Reconciliation
Goal: Ensure tax output, payout settlements, and accounting entries converge without variance.

### Inputs
1. Tax calculation outputs from tax agents.
2. FinancialIntent settlement records from runtime settlement stub.
3. QuickBooks journal exports.
4. Internal economic ledger records.

### Reconciliation Procedure
1. Build key set: `entity_id + tax_year + period + message_id`.
2. Match records across all ledgers.
3. Compute deltas for amount, currency, and status.
4. Emit reconciliation status:
- `reconciled`
- `variance_detected`
- `missing_counterparty_record`
5. Route non-reconciled items to compliance queue.

### Variance Policy
1. Amount variance > 0.01 USD -> flag.
2. Currency mismatch -> block settlement closeout.
3. Missing QuickBooks record after SLA -> retry + escalate.

## Orchestration Dependencies
1. Runtime Core and Identity must be healthy.
2. FinancialIntent subsystem must be online.
3. Capsule runtime must resolve tax routes.
4. QuickBooks connector must have valid credentials.
5. Reconciliation must read from all ledger sources.

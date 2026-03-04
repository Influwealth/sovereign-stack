# WealthBridge OS

## R&D Sign-Up Capsule
`wealthbridge-os/capsules/rd-signup-capsule.ts` exposes:

- `handleRDSignup(input: RDSignupInput): Promise<RDSignupResult>`

It performs:

1. R&D tax-credit eligibility scoring.
2. Chat-history placeholder ingestion into R&D activity logs.
3. WealthBridge member create/link.
4. Tax Capsule record create/link.
5. Draft R&D tax package generation (JSON + Markdown).
6. AI training track enrollment (stub enrollment state).
7. Workforce/benefits loop routing (stub program routing).

## Runtime Flow (DeepFlex -> Argus -> WealthBridge)
1. Agent sends SAP message with `intent=RDSignupIntent`, `capability_id=rd.signup.process`.
2. DeepFlex Runtime Core enforces:
   - SAP signature + identity verification
   - Capability grant check
   - FinancialIntent stub evaluation
3. `rd-signup-intent` subsystem executes `handleRDSignup(...)`.
4. `rd-signup-audit-bridge` forwards RD intent lifecycle events to `argus-audit`.
5. `argus-audit` persists audit records to `wealthbridge-os/data/argus-rd-signup-audit.json`.
6. WealthBridge stores member/tax records in `wealthbridge-os/data/rd-signup-records.json`.

## Generated Artifacts
- R&D logs:
  - `docs/tax/rd-logs/{memberId}.md`
  - `data/tax/rd-logs/{memberId}.json`
- Draft R&D tax package:
  - `docs/tax/rd-packages/{memberId}.md`
  - `data/tax/rd-packages/{memberId}.json`

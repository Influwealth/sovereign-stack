import type { FinancialIntent } from "./runtime-core";

export const RD_SIGNUP_INTENT = "RDSignupIntent" as const;
export const RD_SIGNUP_TARGET_SUBSYSTEM = "rd-signup-intent" as const;
export const RD_SIGNUP_CAPABILITY_ID = "rd.signup.process" as const;
export const ARGUS_AUDIT_INTENT = "argus.audit.record" as const;
export const ARGUS_AUDIT_CAPABILITY_ID = "argus.audit.record" as const;

export function createRDSignupFinancialIntentStub(sponsor: string): FinancialIntent {
  return {
    budget: 0,
    currency: "USD",
    max_spend: 0,
    sponsor,
    settlement_model: "rd-signup-stub",
    estimated_cost: 0
  };
}

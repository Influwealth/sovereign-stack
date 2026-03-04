import type { RDSignupFlags } from "../capsules/rd-signup-types";

export interface BenefitsRouterResult {
  suggestedPrograms: string[];
  nextSteps: string[];
}

export function routeBenefits(flags: RDSignupFlags): BenefitsRouterResult {
  const suggestedPrograms: string[] = [];
  const nextSteps: string[] = [];

  if (flags.likelyTrainingGrant) {
    suggestedPrograms.push("AI Training Reimbursement Grant (placeholder)");
    suggestedPrograms.push("Anthropic MCP Program Intake (placeholder)");
    nextSteps.push("Collect prior AI tooling usage and target role outcomes.");
  }

  if (flags.likelyWorkforceBenefits) {
    suggestedPrograms.push("HRA/Workforce Benefits Program (stub)");
    nextSteps.push("Run workforce eligibility screening and HR status verification.");
  }

  if (flags.likelyRDTaxCredit) {
    suggestedPrograms.push("R&D Tax Credit Documentation Acceleration Track");
    nextSteps.push("Route member into tax technical interview and evidence checklist.");
  }

  if (suggestedPrograms.length === 0) {
    suggestedPrograms.push("General Workforce Readiness Track (fallback)");
    nextSteps.push("Schedule baseline intake review and gather additional evidence.");
  }

  nextSteps.push("Open benefits/workforce follow-up ticket in WealthBridge OS queue.");

  return {
    suggestedPrograms: [...new Set(suggestedPrograms)],
    nextSteps: [...new Set(nextSteps)]
  };
}

export interface RDSignupInput {
  name: string;
  email: string;
  businessType: string;
  country: string;
  state: string;
  hasChatHistory: boolean;
  hasPrototypes: boolean;
  employmentStatus: string;
  incomeBand: string;
  chatHistorySummary?: string;
}

export interface RDSignupFlags {
  likelyRDTaxCredit: boolean;
  likelyWorkforceBenefits: boolean;
  likelyTrainingGrant: boolean;
}

export interface RDSignupResult {
  eligibilityScore: number;
  flags: RDSignupFlags;
  "generatedR&DLogPath": string;
  generatedTaxPackagePath: string;
  wealthbridgeMemberId: string;
  taxCapsuleId: string;
}

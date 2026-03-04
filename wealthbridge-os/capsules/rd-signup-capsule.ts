import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { generateRDLog } from "../../tax/rd-log-generator";
import { routeBenefits } from "../integrations/benefits-router";
import {
  enrollInAITrainingTrack,
  routeIntoWorkforceBenefitsLoop,
  upsertMember,
  upsertTaxCapsule
} from "../integrations/member-tax-registry";
import type { RDSignupFlags, RDSignupInput, RDSignupResult } from "./rd-signup-types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

interface DraftTaxPackageResult {
  jsonPath: string;
  markdownPath: string;
}

export async function handleRDSignup(input: RDSignupInput): Promise<RDSignupResult> {
  const normalized = normalizeInput(input);
  const eligibilityScore = calculateEligibilityScore(normalized);
  const flags = deriveFlags(eligibilityScore, normalized);
  const chatHistorySummary = resolveChatHistorySummary(normalized);

  const memberStub = upsertMember({
    profile: normalized,
    eligibilityScore,
    flags,
    generatedRDLogPath: "",
    generatedTaxPackagePath: "",
    chatHistorySummary
  });

  const rdLog = generateRDLog({
    memberId: memberStub.memberId,
    name: normalized.name,
    businessType: normalized.businessType,
    hasPrototypes: normalized.hasPrototypes,
    chatHistorySummary,
    country: normalized.country,
    state: normalized.state
  });

  const draftTaxPackage = createDraftTaxPackage({
    memberId: memberStub.memberId,
    profile: normalized,
    eligibilityScore,
    flags,
    generatedRDLogPath: rdLog.markdownPath,
    chatHistorySummary
  });

  const member = upsertMember({
    profile: normalized,
    eligibilityScore,
    flags,
    generatedRDLogPath: rdLog.markdownPath,
    generatedTaxPackagePath: draftTaxPackage.jsonPath,
    chatHistorySummary
  });

  const taxCapsule = upsertTaxCapsule({
    memberId: member.memberId,
    eligibilityScore,
    flags,
    generatedRDLogPath: rdLog.markdownPath,
    generatedTaxPackagePath: draftTaxPackage.jsonPath
  });

  const benefitsRoute = routeBenefits(flags);
  enrollInAITrainingTrack(member.memberId);
  routeIntoWorkforceBenefitsLoop(member.memberId, benefitsRoute);

  return {
    eligibilityScore,
    flags,
    "generatedR&DLogPath": rdLog.markdownPath,
    generatedTaxPackagePath: draftTaxPackage.jsonPath,
    wealthbridgeMemberId: member.memberId,
    taxCapsuleId: taxCapsule.taxCapsuleId
  };
}

function calculateEligibilityScore(input: RDSignupInput): number {
  let score = 25;
  if (input.hasChatHistory) {
    score += 20;
  }
  if (input.hasPrototypes) {
    score += 25;
  }

  const businessType = input.businessType.toLowerCase();
  const rdFriendlyBusinessTypes = ["software", "saas", "biotech", "manufacturing", "research", "ai", "technology"];
  if (rdFriendlyBusinessTypes.some((keyword) => businessType.includes(keyword))) {
    score += 15;
  }

  const employmentStatus = input.employmentStatus.toLowerCase();
  if (employmentStatus.includes("founder") || employmentStatus.includes("owner") || employmentStatus.includes("self")) {
    score += 10;
  } else if (employmentStatus.includes("employee")) {
    score += 5;
  }

  const incomeBand = input.incomeBand.toLowerCase();
  if (incomeBand.includes("250k") || incomeBand.includes("500k") || incomeBand.includes("1m")) {
    score += 10;
  } else if (incomeBand.includes("100k")) {
    score += 5;
  }

  return clamp(Math.round(score), 0, 100);
}

function deriveFlags(eligibilityScore: number, input: RDSignupInput): RDSignupFlags {
  return {
    likelyRDTaxCredit: eligibilityScore >= 60 && (input.hasChatHistory || input.hasPrototypes),
    likelyWorkforceBenefits:
      input.employmentStatus.toLowerCase().includes("employee") ||
      input.employmentStatus.toLowerCase().includes("founder") ||
      input.employmentStatus.toLowerCase().includes("self"),
    likelyTrainingGrant: eligibilityScore >= 50 || input.hasChatHistory
  };
}

function normalizeInput(input: RDSignupInput): RDSignupInput {
  const normalized: RDSignupInput = {
    ...input,
    name: String(input.name || "").trim(),
    email: String(input.email || "").trim().toLowerCase(),
    businessType: String(input.businessType || "").trim(),
    country: String(input.country || "").trim(),
    state: String(input.state || "").trim(),
    employmentStatus: String(input.employmentStatus || "").trim(),
    incomeBand: String(input.incomeBand || "").trim(),
    hasChatHistory: Boolean(input.hasChatHistory),
    hasPrototypes: Boolean(input.hasPrototypes),
    chatHistorySummary: typeof input.chatHistorySummary === "string" ? input.chatHistorySummary.trim() : undefined
  };

  const required: Array<keyof RDSignupInput> = [
    "name",
    "email",
    "businessType",
    "country",
    "state",
    "employmentStatus",
    "incomeBand"
  ];

  for (const field of required) {
    if (!String(normalized[field] || "").trim()) {
      throw new Error(`RDSignup input field '${field}' is required.`);
    }
  }

  return normalized;
}

function resolveChatHistorySummary(input: RDSignupInput): string {
  if (!input.hasChatHistory) {
    return "No ChatGPT/Claude history was provided. Placeholder ingestion will activate once history exists.";
  }

  if (input.chatHistorySummary && input.chatHistorySummary.trim().length > 0) {
    return input.chatHistorySummary.trim();
  }

  return `Placeholder summary for ${input.name}: extracted technical discussions from ChatGPT/Claude sessions, mapped into candidate R&D projects, uncertainties, and iterative experiments.`;
}

function createDraftTaxPackage(input: {
  memberId: string;
  profile: RDSignupInput;
  eligibilityScore: number;
  flags: RDSignupFlags;
  generatedRDLogPath: string;
  chatHistorySummary: string;
}): DraftTaxPackageResult {
  const now = new Date().toISOString();
  const jsonPath = normalizePath(path.join("data", "tax", "rd-packages", `${input.memberId}.json`));
  const markdownPath = normalizePath(path.join("docs", "tax", "rd-packages", `${input.memberId}.md`));
  const packagePayload = {
    schema: "wealthbridge.rd-tax-package.v1",
    generatedAt: now,
    status: "draft",
    memberId: input.memberId,
    profile: {
      name: input.profile.name,
      email: input.profile.email,
      businessType: input.profile.businessType,
      country: input.profile.country,
      state: input.profile.state,
      employmentStatus: input.profile.employmentStatus,
      incomeBand: input.profile.incomeBand
    },
    eligibilityScore: input.eligibilityScore,
    flags: input.flags,
    evidence: {
      rdLogPath: input.generatedRDLogPath,
      chatHistorySummary: input.chatHistorySummary
    },
    recommendedForms: ["Form 6765 (draft)", "Entity return attachment (draft)"],
    checklist: [
      "Validate project-level uncertainty statements.",
      "Attach supporting prototype commits or design notes.",
      "Confirm payroll and contractor treatment for qualified research expenses."
    ]
  };

  const markdown = [
    `# Draft R&D Tax Package - ${input.memberId}`,
    "",
    `- Generated: ${now}`,
    `- Status: draft`,
    `- Eligibility Score: ${input.eligibilityScore}`,
    "",
    "## Eligibility Flags",
    `- likelyRDTaxCredit: ${String(input.flags.likelyRDTaxCredit)}`,
    `- likelyWorkforceBenefits: ${String(input.flags.likelyWorkforceBenefits)}`,
    `- likelyTrainingGrant: ${String(input.flags.likelyTrainingGrant)}`,
    "",
    "## Evidence",
    `- R&D Log: ${input.generatedRDLogPath}`,
    `- Chat Summary: ${input.chatHistorySummary}`,
    "",
    "## Draft Checklist",
    "- Validate technical uncertainty narratives.",
    "- Align experiments to qualifying activities.",
    "- Collect financial support for qualified expenses."
  ].join("\n");

  writeFile(jsonPath, JSON.stringify(packagePayload, null, 2));
  writeFile(markdownPath, markdown);

  return { jsonPath, markdownPath };
}

function writeFile(relativePath: string, contents: string): void {
  const absolutePath = path.resolve(REPO_ROOT, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, "utf8");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizePath(input: string): string {
  return input.replace(/\\/g, "/");
}

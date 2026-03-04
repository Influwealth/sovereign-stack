import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import type { RDSignupFlags, RDSignupInput } from "../capsules/rd-signup-types";
import type { BenefitsRouterResult } from "./benefits-router";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, "..", "data", "rd-signup-records.json");

export interface WealthBridgeMemberRecord {
  memberId: string;
  name: string;
  email: string;
  businessType: string;
  country: string;
  state: string;
  employmentStatus: string;
  incomeBand: string;
  createdAt: string;
  updatedAt: string;
  rdProfile: {
    hasChatHistory: boolean;
    hasPrototypes: boolean;
    eligibilityScore: number;
    flags: RDSignupFlags;
    generatedRDLogPath: string;
    generatedTaxPackagePath: string;
    lastSummary: string;
    processedAt: string;
  };
  aiTrainingTrack?: {
    status: "enrolled";
    trackId: string;
    enrolledAt: string;
  };
  workforceBenefitsLoop?: {
    suggestedPrograms: string[];
    nextSteps: string[];
    routedAt: string;
  };
}

export interface TaxCapsuleRecord {
  taxCapsuleId: string;
  memberId: string;
  capsuleType: "rd-tax";
  status: "draft";
  eligibilityScore: number;
  flags: RDSignupFlags;
  generatedRDLogPath: string;
  generatedTaxPackagePath: string;
  updatedAt: string;
  createdAt: string;
}

interface RegistryStore {
  version: string;
  updatedAt: string;
  members: WealthBridgeMemberRecord[];
  taxCapsules: TaxCapsuleRecord[];
}

const EMPTY_STORE: RegistryStore = {
  version: "1.0.0",
  updatedAt: new Date(0).toISOString(),
  members: [],
  taxCapsules: []
};

export interface UpsertMemberInput {
  profile: RDSignupInput;
  eligibilityScore: number;
  flags: RDSignupFlags;
  generatedRDLogPath: string;
  generatedTaxPackagePath: string;
  chatHistorySummary: string;
}

export interface UpsertTaxCapsuleInput {
  memberId: string;
  eligibilityScore: number;
  flags: RDSignupFlags;
  generatedRDLogPath: string;
  generatedTaxPackagePath: string;
}

export function upsertMember(input: UpsertMemberInput): WealthBridgeMemberRecord {
  const store = readStore();
  const now = new Date().toISOString();
  const email = normalizeEmail(input.profile.email);
  const existing = store.members.find((entry) => normalizeEmail(entry.email) === email);

  if (existing) {
    existing.name = input.profile.name;
    existing.businessType = input.profile.businessType;
    existing.country = input.profile.country;
    existing.state = input.profile.state;
    existing.employmentStatus = input.profile.employmentStatus;
    existing.incomeBand = input.profile.incomeBand;
    existing.updatedAt = now;
    existing.rdProfile = {
      hasChatHistory: input.profile.hasChatHistory,
      hasPrototypes: input.profile.hasPrototypes,
      eligibilityScore: input.eligibilityScore,
      flags: input.flags,
      generatedRDLogPath: input.generatedRDLogPath,
      generatedTaxPackagePath: input.generatedTaxPackagePath,
      lastSummary: input.chatHistorySummary,
      processedAt: now
    };
    writeStore(store);
    return existing;
  }

  const memberId = createMemberId(email);
  const created: WealthBridgeMemberRecord = {
    memberId,
    name: input.profile.name,
    email: input.profile.email,
    businessType: input.profile.businessType,
    country: input.profile.country,
    state: input.profile.state,
    employmentStatus: input.profile.employmentStatus,
    incomeBand: input.profile.incomeBand,
    createdAt: now,
    updatedAt: now,
    rdProfile: {
      hasChatHistory: input.profile.hasChatHistory,
      hasPrototypes: input.profile.hasPrototypes,
      eligibilityScore: input.eligibilityScore,
      flags: input.flags,
      generatedRDLogPath: input.generatedRDLogPath,
      generatedTaxPackagePath: input.generatedTaxPackagePath,
      lastSummary: input.chatHistorySummary,
      processedAt: now
    }
  };

  store.members.push(created);
  writeStore(store);
  return created;
}

export function upsertTaxCapsule(input: UpsertTaxCapsuleInput): TaxCapsuleRecord {
  const store = readStore();
  const now = new Date().toISOString();
  const existing = store.taxCapsules.find((entry) => entry.memberId === input.memberId && entry.capsuleType === "rd-tax");

  if (existing) {
    existing.status = "draft";
    existing.eligibilityScore = input.eligibilityScore;
    existing.flags = input.flags;
    existing.generatedRDLogPath = input.generatedRDLogPath;
    existing.generatedTaxPackagePath = input.generatedTaxPackagePath;
    existing.updatedAt = now;
    writeStore(store);
    return existing;
  }

  const created: TaxCapsuleRecord = {
    taxCapsuleId: `taxcap-rd-${stableSuffix(input.memberId)}`,
    memberId: input.memberId,
    capsuleType: "rd-tax",
    status: "draft",
    eligibilityScore: input.eligibilityScore,
    flags: input.flags,
    generatedRDLogPath: input.generatedRDLogPath,
    generatedTaxPackagePath: input.generatedTaxPackagePath,
    createdAt: now,
    updatedAt: now
  };

  store.taxCapsules.push(created);
  writeStore(store);
  return created;
}

export function enrollInAITrainingTrack(memberId: string, trackId = "ai-training-track-v1"): void {
  const store = readStore();
  const member = store.members.find((entry) => entry.memberId === memberId);
  if (!member) {
    return;
  }

  member.aiTrainingTrack = {
    status: "enrolled",
    trackId,
    enrolledAt: new Date().toISOString()
  };
  member.updatedAt = new Date().toISOString();
  writeStore(store);
}

export function routeIntoWorkforceBenefitsLoop(memberId: string, route: BenefitsRouterResult): void {
  const store = readStore();
  const member = store.members.find((entry) => entry.memberId === memberId);
  if (!member) {
    return;
  }

  member.workforceBenefitsLoop = {
    suggestedPrograms: route.suggestedPrograms,
    nextSteps: route.nextSteps,
    routedAt: new Date().toISOString()
  };
  member.updatedAt = new Date().toISOString();
  writeStore(store);
}

function readStore(): RegistryStore {
  if (!fs.existsSync(STORE_PATH)) {
    return { ...EMPTY_STORE, members: [], taxCapsules: [] };
  }

  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as RegistryStore;
    if (!Array.isArray(parsed.members) || !Array.isArray(parsed.taxCapsules)) {
      return { ...EMPTY_STORE, members: [], taxCapsules: [] };
    }
    return parsed;
  } catch (_error) {
    return { ...EMPTY_STORE, members: [], taxCapsules: [] };
  }
}

function writeStore(store: RegistryStore): void {
  const updated: RegistryStore = {
    ...store,
    updatedAt: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(updated, null, 2), "utf8");
}

function createMemberId(email: string): string {
  const localPart = email.split("@")[0] || "member";
  return `wbm-${slugify(localPart)}-${stableSuffix(email)}`;
}

function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

function stableSuffix(value: string): string {
  let hash = 0;
  for (const ch of String(value)) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

function slugify(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "member";
}

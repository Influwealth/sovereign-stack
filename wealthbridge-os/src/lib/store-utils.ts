import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { z, type ZodSchema } from "zod";

export interface SnapshotOptions {
  snapshotsDir?: string;
  retention?: number;
  snapshotLabel?: string;
}

export function writeJsonAtomic<T>(filePath: string, data: T, options: SnapshotOptions = {}): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const payload = JSON.stringify(data, null, 2);
  const tmpPath = path.join(dir, `${path.basename(filePath)}.${randomUUID()}.tmp`);

  fs.writeFileSync(tmpPath, payload, "utf8");
  fs.renameSync(tmpPath, filePath);

  if (options.snapshotsDir) {
    writeSnapshot(filePath, payload, options);
  }
}

export function readJsonValidated<T>(filePath: string, schema: ZodSchema<T>, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return schema.parse(JSON.parse(raw));
  } catch (_error) {
    return fallback;
  }
}

function writeSnapshot(filePath: string, payload: string, options: SnapshotOptions): void {
  const snapshotDir = options.snapshotsDir!;
  fs.mkdirSync(snapshotDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const label = options.snapshotLabel ? `${options.snapshotLabel}-` : "";
  const snapName = `${label}${path.basename(filePath)}.${timestamp}.json`;
  const snapPath = path.join(snapshotDir, snapName);
  fs.writeFileSync(snapPath, payload, "utf8");

  const retention = options.retention ?? 5;
  if (retention > 0) {
    pruneSnapshots(snapshotDir, path.basename(filePath), retention);
  }
}

function pruneSnapshots(dir: string, basename: string, retention: number): void {
  const entries = fs.readdirSync(dir).filter((entry) => entry.includes(basename));
  if (entries.length <= retention) {
    return;
  }

  const sorted = entries
    .map((name) => ({ name, ts: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.ts - a.ts);

  for (const entry of sorted.slice(retention)) {
    try {
      fs.unlinkSync(path.join(dir, entry.name));
    } catch (_error) {
      // best-effort pruning
    }
  }
}

export const rdFlagsSchema = z.object({
  likelyRDTaxCredit: z.boolean(),
  likelyWorkforceBenefits: z.boolean(),
  likelyTrainingGrant: z.boolean()
});

export const rdSignupRecordSchema = z.object({
  version: z.string(),
  updatedAt: z.string(),
  members: z.array(
    z.object({
      memberId: z.string(),
      name: z.string(),
      email: z.string(),
      businessType: z.string(),
      country: z.string(),
      state: z.string(),
      employmentStatus: z.string(),
      incomeBand: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      rdProfile: z.object({
        hasChatHistory: z.boolean(),
        hasPrototypes: z.boolean(),
        eligibilityScore: z.number(),
        flags: rdFlagsSchema,
        generatedRDLogPath: z.string(),
        generatedTaxPackagePath: z.string(),
        lastSummary: z.string(),
        processedAt: z.string()
      }),
      aiTrainingTrack: z
        .object({
          status: z.literal("enrolled"),
          trackId: z.string(),
          enrolledAt: z.string()
        })
        .optional(),
      workforceBenefitsLoop: z
        .object({
          suggestedPrograms: z.array(z.string()),
          nextSteps: z.array(z.string()),
          routedAt: z.string()
        })
        .optional()
    })
  ),
  taxCapsules: z.array(
    z.object({
      taxCapsuleId: z.string(),
      memberId: z.string(),
      capsuleType: z.literal("rd-tax"),
      status: z.literal("draft"),
      eligibilityScore: z.number(),
      flags: rdFlagsSchema,
      generatedRDLogPath: z.string(),
      generatedTaxPackagePath: z.string(),
      updatedAt: z.string(),
      createdAt: z.string()
    })
  )
});

export const argusAuditStoreSchema = z.object({
  version: z.string(),
  updatedAt: z.string(),
  records: z.array(
    z.object({
      id: z.string(),
      ts: z.string(),
      messageId: z.string(),
      eventType: z.string(),
      correlationId: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      intent: z.string().optional(),
      capabilityId: z.string().optional(),
      status: z.enum(["received", "completed", "failed", "recorded"]),
      payload: z.unknown()
    })
  )
});

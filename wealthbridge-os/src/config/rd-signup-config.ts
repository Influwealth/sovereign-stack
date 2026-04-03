import * as path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  RD_SIGNUP_HOST: z.string().trim().default("0.0.0.0"),
  RD_SIGNUP_PORT: z
    .string()
    .trim()
    .regex(/^\d+$/, "must be a number")
    .transform((v) => Number(v))
    .default("8088"),
  RD_SIGNUP_AGENT_ID: z.string().trim().optional(),
  RD_LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  RD_RATE_LIMIT_MAX: z
    .string()
    .trim()
    .regex(/^\d+$/, "must be a number")
    .transform((v) => Number(v))
    .default("60"),
  RD_RATE_LIMIT_WINDOW_MS: z
    .string()
    .trim()
    .regex(/^\d+$/, "must be a number")
    .transform((v) => Number(v))
    .default("60000"),
  RD_PAYLOAD_LIMIT_BYTES: z
    .string()
    .trim()
    .regex(/^\d+$/, "must be a number")
    .transform((v) => Number(v))
    .default("262144"),
  RD_DATA_ROOT: z.string().trim().default(path.resolve(process.cwd(), "data")),
  RD_DOCS_ROOT: z.string().trim().default(path.resolve(process.cwd(), "docs")),
  RD_SNAPSHOT_RETENTION: z
    .string()
    .trim()
    .regex(/^\d+$/, "must be a number")
    .transform((v) => Number(v))
    .default("5")
});

export interface RDSignupConfig {
  host: string;
  port: number;
  agentId: string;
  logLevel: RDLogLevel;
  rateLimit: {
    max: number;
    timeWindowMs: number;
  };
  payloadLimitBytes: number;
  paths: {
    dataRoot: string;
    docsRoot: string;
    rdLogsDir: string;
    rdPackagesDir: string;
    signupRecords: string;
    argusAudit: string;
    snapshotsDir: string;
  };
  snapshotsRetention: number;
}

type RDLogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

export function loadRDSignupConfig(): RDSignupConfig {
  const parsed = envSchema.parse(process.env);

  const dataRoot = path.resolve(parsed.RD_DATA_ROOT);
  const docsRoot = path.resolve(parsed.RD_DOCS_ROOT);
  const rdLogsDir = path.join(docsRoot, "tax", "rd-logs");
  const rdPackagesDir = path.join(docsRoot, "tax", "rd-packages");
  const signupRecords = path.join(dataRoot, "tax", "rd-signup-records.json");
  const argusAudit = path.join(dataRoot, "tax", "argus-rd-signup-audit.json");
  const snapshotsDir = path.join(dataRoot, "tax", ".snapshots");

  return {
    host: parsed.RD_SIGNUP_HOST,
    port: parsed.RD_SIGNUP_PORT,
    agentId: parsed.RD_SIGNUP_AGENT_ID?.trim() || "agent_001",
    logLevel: parsed.RD_LOG_LEVEL,
    rateLimit: {
      max: parsed.RD_RATE_LIMIT_MAX,
      timeWindowMs: parsed.RD_RATE_LIMIT_WINDOW_MS
    },
    payloadLimitBytes: parsed.RD_PAYLOAD_LIMIT_BYTES,
    paths: {
      dataRoot,
      docsRoot,
      rdLogsDir,
      rdPackagesDir,
      signupRecords,
      argusAudit,
      snapshotsDir
    },
    snapshotsRetention: parsed.RD_SNAPSHOT_RETENTION
  };
}

import { loadRDSignupConfig } from "../src/config/rd-signup-config";
import { argusAuditStoreSchema, readJsonValidated, writeJsonAtomic } from "../src/lib/store-utils";

function getStorePath(): string {
  return loadRDSignupConfig().paths.argusAudit;
}

function getSnapshotOptions() {
  const cfg = loadRDSignupConfig();
  return {
    snapshotsDir: cfg.paths.snapshotsDir,
    retention: cfg.snapshotsRetention,
    snapshotLabel: "argus-audit"
  } as const;
}

export interface ArgusAuditRecord {
  id: string;
  ts: string;
  messageId: string;
  eventType: string;
  correlationId?: string;
  from?: string;
  to?: string;
  intent?: string;
  capabilityId?: string;
  status: "received" | "completed" | "failed" | "recorded";
  payload?: unknown;
}

interface ArgusAuditStore {
  version: string;
  updatedAt: string;
  records: ArgusAuditRecord[];
}

const EMPTY_STORE: ArgusAuditStore = {
  version: "1.0.0",
  updatedAt: new Date(0).toISOString(),
  records: []
};

export function appendArgusAuditRecord(input: Omit<ArgusAuditRecord, "id" | "ts">): ArgusAuditRecord {
  const store = readStore();
  const record: ArgusAuditRecord = {
    id: `argus-audit-${Date.now()}-${store.records.length + 1}`,
    ts: new Date().toISOString(),
    ...input
  };

  store.records.push(record);
  writeStore(store);
  return record;
}

function readStore(): ArgusAuditStore {
  return readJsonValidated(getStorePath(), argusAuditStoreSchema, { ...EMPTY_STORE, records: [] });
}

function writeStore(store: ArgusAuditStore): void {
  const updated: ArgusAuditStore = {
    ...store,
    updatedAt: new Date().toISOString()
  };
  writeJsonAtomic(getStorePath(), updated, getSnapshotOptions());
}

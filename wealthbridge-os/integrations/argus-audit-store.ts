import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, "..", "data", "argus-rd-signup-audit.json");

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
  payload: unknown;
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
  if (!fs.existsSync(STORE_PATH)) {
    return { ...EMPTY_STORE, records: [] };
  }

  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as ArgusAuditStore;
    if (!Array.isArray(parsed.records)) {
      return { ...EMPTY_STORE, records: [] };
    }
    return parsed;
  } catch (_error) {
    return { ...EMPTY_STORE, records: [] };
  }
}

function writeStore(store: ArgusAuditStore): void {
  const updated: ArgusAuditStore = {
    ...store,
    updatedAt: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(updated, null, 2), "utf8");
}

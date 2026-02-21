import * as fs from "node:fs";
import * as path from "node:path";
import type { TelecomAdapterName } from "../interfaces/telecom-integration.types";

export interface TelecomRegistryEntry {
  name: TelecomAdapterName;
  path: string;
  enabled: boolean;
}

interface TelecomRegistry {
  version: string;
  adapters: TelecomRegistryEntry[];
}

export class AdapterRegistry {
  private readonly registryPath: string;

  constructor(registryPath = path.resolve(__dirname, "..", "telecom-registry.json")) {
    this.registryPath = registryPath;
  }

  load(): TelecomRegistry {
    const raw = fs.readFileSync(this.registryPath, "utf8");
    return JSON.parse(raw) as TelecomRegistry;
  }

  getEnabledAdapters(): TelecomRegistryEntry[] {
    return this.load().adapters.filter((adapter) => adapter.enabled);
  }
}

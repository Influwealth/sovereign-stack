import * as fs from "node:fs";
import * as path from "node:path";

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface CapsuleStoreItem {
  name: string;
  category: "core" | "business" | "governance" | "integration";
  status: "live" | "planned";
  path: string;
  manifest: string;
  description: string;
}

interface CapsuleStoreCatalog {
  version: string;
  updatedAt: string;
  capsules: CapsuleStoreItem[];
}

export class CapsuleStore {
  private readonly catalogPath: string;
  private catalogCache?: CapsuleStoreCatalog;

  constructor(catalogPath = path.resolve(__dirname, "capsule-store.json")) {
    this.catalogPath = catalogPath;
  }

  list(): CapsuleStoreItem[] {
    return [...this.loadCatalog().capsules];
  }

  listByCategory(category: CapsuleStoreItem["category"]): CapsuleStoreItem[] {
    return this.list().filter((item) => item.category === category);
  }

  get(name: string): CapsuleStoreItem {
    const item = this.list().find((capsule) => capsule.name === name);
    if (!item) {
      throw new Error(`Capsule '${name}' not found in capsule store.`);
    }
    return item;
  }

  search(query: string): CapsuleStoreItem[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return this.list();
    }

    return this.list().filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }

  installPlan(name: string): {
    capsule: string;
    manifestPath: string;
    status: "ready";
  } {
    const item = this.get(name);
    return {
      capsule: item.name,
      manifestPath: path.resolve(path.dirname(this.catalogPath), item.path, item.manifest),
      status: "ready"
    };
  }

  private loadCatalog(): CapsuleStoreCatalog {
    if (this.catalogCache) {
      return this.catalogCache;
    }

    const raw = fs.readFileSync(this.catalogPath, "utf8");
    const parsed = JSON.parse(raw) as CapsuleStoreCatalog;
    if (!Array.isArray(parsed.capsules)) {
      throw new Error("capsule-store.json is invalid: 'capsules' must be an array.");
    }

    this.catalogCache = parsed;
    return parsed;
  }
}

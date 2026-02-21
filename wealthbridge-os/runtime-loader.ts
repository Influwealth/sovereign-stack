import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

export interface CapsuleArtifacts {
  routes: Record<string, (payload: any) => Promise<any> | any>;
  manifest?: any;
}

export async function loadCapsuleArtifacts(capsulePath: string): Promise<CapsuleArtifacts> {
  const candidates = [
    path.resolve(capsulePath, "routes.js"),
    path.resolve(capsulePath, "routes.ts"),
    path.resolve(capsulePath, "index.js"),
    path.resolve(capsulePath, "index.ts")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const mod = await import(pathToFileURL(candidate).href);
        return {
          routes: (mod.routes || mod.default?.routes || {}) as Record<string, any>,
          manifest: mod.manifest || mod.default?.manifest
        };
      } catch (err) {
        // continue to next candidate
      }
    }
  }

  const jsonPath = path.resolve(capsulePath, "routes.json");
  if (fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, "utf8");
    const parsed = JSON.parse(raw);
    return { routes: parsed.routes || {}, manifest: parsed.manifest || null };
  }

  return { routes: {}, manifest: null };
}

import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { rdSignupRecordSchema, writeJsonAtomic, readJsonValidated } from "../src/lib/store-utils";

const TMP_DIR = path.resolve(".tmp-rd-test", "store-utils");
const TARGET = path.join(TMP_DIR, "store.json");
const SNAP_DIR = path.join(TMP_DIR, "snaps");

afterEach(() => {
  if (fs.existsSync(path.resolve(".tmp-rd-test"))) {
    fs.rmSync(path.resolve(".tmp-rd-test"), { recursive: true, force: true });
  }
});

describe("writeJsonAtomic", () => {
  it("writes atomically and keeps snapshots within retention", () => {
    const payload = {
      version: "1.0.0",
      updatedAt: new Date().toISOString(),
      members: [],
      taxCapsules: []
    };

    for (let i = 0; i < 7; i++) {
      payload.updatedAt = new Date().toISOString();
      writeJsonAtomic(TARGET, payload, { snapshotsDir: SNAP_DIR, retention: 3, snapshotLabel: "test" });
    }

    const parsed = JSON.parse(fs.readFileSync(TARGET, "utf8"));
    expect(parsed.version).toBe("1.0.0");

    const snaps = fs.readdirSync(SNAP_DIR).filter((name) => name.includes("store.json"));
    expect(snaps.length).toBeLessThanOrEqual(3);
  });
});

describe("readJsonValidated", () => {
  it("returns fallback on invalid store", () => {
    fs.mkdirSync(path.dirname(TARGET), { recursive: true });
    fs.writeFileSync(TARGET, "not-json", "utf8");

    const fallback = { version: "1.0.0", updatedAt: "0", members: [], taxCapsules: [] };
    const parsed = readJsonValidated(TARGET, rdSignupRecordSchema, fallback);
    expect(parsed).toEqual(fallback);
  });
});

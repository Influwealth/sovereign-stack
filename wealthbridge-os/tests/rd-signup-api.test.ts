import * as fs from "node:fs";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

import { buildServer } from "../../scripts/rd-signup-server";
import { loadRDSignupConfig } from "../src/config/rd-signup-config";

const TMP_ROOT = path.resolve(".tmp-rd-test", "api");

describe("RD signup HTTP API", () => {
  const config = (() => {
    const dataRoot = path.join(TMP_ROOT, "data");
    const docsRoot = path.join(TMP_ROOT, "docs");
    process.env.RD_DATA_ROOT = dataRoot;
    process.env.RD_DOCS_ROOT = docsRoot;
    const base = loadRDSignupConfig();
    return {
      ...base,
      host: "127.0.0.1",
      port: 0,
      paths: {
        ...base.paths,
        dataRoot,
        docsRoot,
        rdLogsDir: path.join(docsRoot, "tax", "rd-logs"),
        rdPackagesDir: path.join(docsRoot, "tax", "rd-packages"),
        signupRecords: path.join(dataRoot, "tax", "rd-signup-records.json"),
        argusAudit: path.join(dataRoot, "tax", "argus-rd-signup-audit.json"),
        snapshotsDir: path.join(dataRoot, "tax", ".snapshots")
      }
    };
  })();

  const server = buildServer(config);
  let agent: request.SuperTest<request.Test>;

  beforeAll(async () => {
    await server.listen({ port: 0, host: config.host });
    agent = request(server.server);
  });

  afterAll(async () => {
    await server.close();
    if (fs.existsSync(TMP_ROOT)) {
      fs.rmSync(TMP_ROOT, { recursive: true, force: true });
    }
  });

  it("rejects invalid payload", async () => {
    const res = await agent.post("/api/rd-signup").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("accepts valid payload and writes artifacts", async () => {
    const res = await agent.post("/api/rd-signup").send({
      name: "Test User",
      email: "test@example.com",
      businessType: "AI SaaS",
      country: "US",
      state: "NY",
      employmentStatus: "founder",
      incomeBand: "250k-500k",
      hasChatHistory: true,
      hasPrototypes: true,
      chatHistorySummary: "Summary"
    });

    expect(res.status).toBe(200);
    expect(res.body.wealthbridgeMemberId).toBeTruthy();
    expect(res.body.correlationId).toBeTruthy();

    const recordsPath = config.paths.signupRecords;
    expect(fs.existsSync(recordsPath)).toBe(true);
  });

  it("reports readiness", async () => {
    const res = await agent.get("/readyz");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

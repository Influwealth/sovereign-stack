import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";

import { AgentOrchestrator } from "../wealthbridge-os/agent-federation/agent-orchestrator";
import { AgentRuntime } from "../wealthbridge-os/agent-federation/agent-runtime";
import type { RDSignupInput, RDSignupResult } from "../wealthbridge-os/capsules/rd-signup-types";
import { loadRDSignupConfig } from "../wealthbridge-os/src/config/rd-signup-config";

const rdSignupSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  businessType: z.string().trim().min(1),
  country: z.string().trim().min(1),
  state: z.string().trim().min(1),
  employmentStatus: z.string().trim().min(1),
  incomeBand: z.string().trim().min(1),
  hasChatHistory: z.boolean(),
  hasPrototypes: z.boolean(),
  chatHistorySummary: z.string().trim().optional()
});

export function buildServer(config = loadRDSignupConfig()) {
  const runtime = new AgentRuntime();
  const orchestrator = new AgentOrchestrator(runtime);

  const server = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        process.env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true, translateTime: true } }
          : undefined,
      base: { service: "rd-signup-server" },
      redact: ["req.headers.authorization", "req.headers.cookie"]
    },
    genReqId: () => randomUUID(),
    bodyLimit: config.payloadLimitBytes
  });

  server.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindowMs,
    allowList: [],
    keyGenerator: (req) => req.headers["x-forwarded-for"]?.toString() ?? req.ip
  });

  server.addHook("onRequest", async (request) => {
    request.log = request.log.child({ correlationId: request.id });
  });

  server.post<{ Body: unknown }>('/api/rd-signup', async (request, reply) => {
    const parsed = rdSignupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid RDSignupInput payload.",
        correlationId: request.id,
        details: parsed.error.errors.map((e) => `${e.path.join(".") || "field"}: ${e.message}`)
      });
    }

    const agentId = resolveAgentId(request.headers["x-agent-id"], config.agentId);

    let agent;
    try {
      agent = orchestrator.loadAgent(agentId);
    } catch (error) {
      return reply.status(403).send({
        error: "Agent is not authorized for RD signup execution.",
        agentId,
        correlationId: request.id,
        details: String(error)
      });
    }

    try {
      const result = (await orchestrator.executeRDSignupIntent(agent, parsed.data)) as RDSignupResult;
      return reply.status(200).send({ ...result, correlationId: result.correlationId ?? request.id });
    } catch (error) {
      request.log.error({ err: error, correlationId: request.id }, "RDSignupIntent execution failed.");
      return reply.status(500).send({
        error: "RD signup processing failed.",
        correlationId: request.id,
        details: String(error)
      });
    }
  });

  server.get("/healthz", async () => {
    return { ok: true, service: "rd-signup-server" };
  });

  server.get("/readyz", async () => {
    const readiness = await readinessCheck(config, orchestrator);
    const status = readiness.ok ? 200 : 503;
    return { statusCode: status, ...readiness };
  });

  return server;
}

async function readinessCheck(config: ReturnType<typeof loadRDSignupConfig>, orchestrator: AgentOrchestrator) {
  const paths = [config.paths.dataRoot, config.paths.docsRoot, config.paths.signupRecords, config.paths.argusAudit];

  const fsResults = paths.map((p) => ({ path: p, writable: canWrite(p) }));
  const health = orchestrator.healthCheck();

  const ok = fsResults.every((r) => r.writable) && health.ok;

  return {
    ok,
    files: fsResults,
    orchestrator: health
  };
}

function canWrite(targetPath: string): boolean {
  try {
    const dir = targetPath.endsWith(".json") ? path.dirname(targetPath) : targetPath;
    fs.mkdirSync(dir, { recursive: true });
    const probe = `${dir}/.readyz-${Date.now()}.tmp`;
    fs.writeFileSync(probe, "ok", "utf8");
    fs.unlinkSync(probe);
    return true;
  } catch (_err) {
    return false;
  }
}

function resolveAgentId(headerValue: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(headerValue) && headerValue.length > 0) {
    return headerValue[0];
  }
  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue.trim();
  }
  return fallback;
}

async function main(): Promise<void> {
  const config = loadRDSignupConfig();
  const server = buildServer(config);

  await server.listen({ host: config.host, port: config.port });
  server.log.info({ host: config.host, port: config.port }, "RD signup server listening.");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start RD signup server.", error);
  process.exit(1);
});

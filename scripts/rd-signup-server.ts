import Fastify from "fastify";

import { AgentOrchestrator } from "../wealthbridge-os/agent-federation/agent-orchestrator";
import { AgentRuntime } from "../wealthbridge-os/agent-federation/agent-runtime";
import type { RDSignupInput } from "../wealthbridge-os/capsules/rd-signup-types";

interface ValidationResult {
  valid: boolean;
  errors: string[];
  value?: RDSignupInput;
}

const runtime = new AgentRuntime();
const orchestrator = new AgentOrchestrator(runtime);
const server = Fastify({
  logger: true
});

server.post<{ Body: unknown }>("/api/rd-signup", async (request, reply) => {
  const validation = validateRDSignupInput(request.body);
  if (!validation.valid || !validation.value) {
    return reply.status(400).send({
      error: "Invalid RDSignupInput payload.",
      details: validation.errors
    });
  }

  const agentId = resolveAgentId(request.headers["x-agent-id"]);

  let agent;
  try {
    agent = orchestrator.loadAgent(agentId);
  } catch (error) {
    return reply.status(403).send({
      error: "Agent is not authorized for RD signup execution.",
      agentId,
      details: String(error)
    });
  }

  try {
    const result = await orchestrator.executeRDSignupIntent(agent, validation.value);
    return reply.status(200).send(result);
  } catch (error) {
    request.log.error({ err: error }, "RDSignupIntent execution failed.");
    return reply.status(500).send({
      error: "RD signup processing failed.",
      details: String(error)
    });
  }
});

server.get("/healthz", async () => {
  return { ok: true, service: "rd-signup-server" };
});

async function main(): Promise<void> {
  const host = process.env.RD_SIGNUP_HOST || "0.0.0.0";
  const port = parsePort(process.env.RD_SIGNUP_PORT, 8088);

  await server.listen({ host, port });
  server.log.info(`RD signup server listening on http://${host}:${port}`);
}

function resolveAgentId(headerValue: string | string[] | undefined): string {
  if (Array.isArray(headerValue) && headerValue.length > 0) {
    return headerValue[0];
  }
  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue.trim();
  }
  return process.env.RD_SIGNUP_AGENT_ID?.trim() || "agent_001";
}

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65535) {
    return fallback;
  }
  return Math.floor(parsed);
}

function validateRDSignupInput(payload: unknown): ValidationResult {
  const errors: string[] = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      valid: false,
      errors: ["Body must be a JSON object matching RDSignupInput."]
    };
  }

  const input = payload as Record<string, unknown>;
  const requiredStringFields: Array<keyof RDSignupInput> = [
    "name",
    "email",
    "businessType",
    "country",
    "state",
    "employmentStatus",
    "incomeBand"
  ];

  for (const field of requiredStringFields) {
    const value = input[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`'${String(field)}' must be a non-empty string.`);
    }
  }

  if (typeof input.hasChatHistory !== "boolean") {
    errors.push("'hasChatHistory' must be a boolean.");
  }

  if (typeof input.hasPrototypes !== "boolean") {
    errors.push("'hasPrototypes' must be a boolean.");
  }

  if (typeof input.email === "string" && !isLikelyEmail(input.email)) {
    errors.push("'email' must be a valid email format.");
  }

  if (input.chatHistorySummary !== undefined && typeof input.chatHistorySummary !== "string") {
    errors.push("'chatHistorySummary' must be a string when provided.");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const value: RDSignupInput = {
    name: String(input.name).trim(),
    email: String(input.email).trim().toLowerCase(),
    businessType: String(input.businessType).trim(),
    country: String(input.country).trim(),
    state: String(input.state).trim(),
    hasChatHistory: Boolean(input.hasChatHistory),
    hasPrototypes: Boolean(input.hasPrototypes),
    employmentStatus: String(input.employmentStatus).trim(),
    incomeBand: String(input.incomeBand).trim(),
    chatHistorySummary:
      typeof input.chatHistorySummary === "string" ? input.chatHistorySummary.trim() : undefined
  };

  return { valid: true, errors: [], value };
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

main().catch((error) => {
  server.log.error({ err: error }, "Failed to start RD signup server.");
  process.exit(1);
});

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  AgentIdentity,
  AgentRegistry,
  CapabilityProfile,
  WalletBinding
} from "./agent.types";
import { fileURLToPath } from "node:url";
import { dirname as _dirname } from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = _dirname(__filename);

export interface AgentExecutionRequest {
  intent: string;
  capsuleName?: string;
  route?: string;
  payload?: unknown;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentExecutionLogEntry {
  level: "info" | "warn" | "error";
  event: string;
  ts: string;
  detail?: Record<string, unknown>;
}

export interface AgentExecutionResult {
  ok: boolean;
  agentId: string;
  handledBy: string;
  status: "completed" | "stubbed" | "timed_out" | "failed";
  durationMs: number;
  logs: AgentExecutionLogEntry[];
  output: Record<string, unknown>;
}

export interface AgentHealthStatus {
  agentId: string;
  enabled: boolean;
  healthy: boolean;
  status: "healthy" | "degraded" | "offline";
  detail: string;
  healthCheckPath?: string;
  execPath?: string;
  version?: string;
}

class AgentTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentTimeoutError";
  }
}

export class AgentRuntime {
  private readonly registryPath: string;
  private cache?: AgentRegistry;
  private readonly defaultTimeoutMs = 15_000;

  constructor(registryPath = path.resolve(__dirname, "agent-registry.json")) {
    this.registryPath = registryPath;
  }

  loadRegistry(): AgentRegistry {
    const raw = fs.readFileSync(this.registryPath, "utf8");
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, "")) as AgentRegistry;
    this.validate(parsed);
    this.cache = parsed;
    return parsed;
  }

  getRegistry(): AgentRegistry {
    return this.cache ?? this.loadRegistry();
  }

  getAgent(agentId: string): AgentIdentity {
    const agent = this.getRegistry().agents.find((entry) => entry.id === agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found.`);
    }
    if (agent.status !== "active") {
      throw new Error(`Agent '${agentId}' is not active.`);
    }
    if (agent.enabled === false) {
      throw new Error(`Agent '${agentId}' is disabled.`);
    }
    return agent;
  }

  getCapabilityProfile(profileName: string): CapabilityProfile {
    const profile = this.getRegistry().capabilityProfiles.find((entry) => {
      return entry.name === profileName || entry.id === profileName || entry.label === profileName;
    });
    if (!profile) {
      throw new Error(`Capability profile '${profileName}' not found.`);
    }
    return profile;
  }

  getWalletBinding(walletId: string): WalletBinding {
    const wallet = this.getRegistry().walletBindings.find((entry) => entry.walletId === walletId);
    if (!wallet) {
      throw new Error(`Wallet binding '${walletId}' not found.`);
    }
    return wallet;
  }

  listAgents(): AgentIdentity[] {
    return [...this.getRegistry().agents];
  }

  listEnabledAgents(): AgentIdentity[] {
    return this.listAgents().filter((agent) => agent.status === "active" && agent.enabled !== false);
  }

  async healthCheckAgent(agentId: string): Promise<AgentHealthStatus> {
    const agent = this.getAgent(agentId);
    if (agent.enabled === false) {
      return {
        agentId,
        enabled: false,
        healthy: false,
        status: "offline",
        detail: "Agent is disabled in the registry.",
        healthCheckPath: agent.healthCheckPath,
        execPath: agent.execPath,
        version: agent.version
      };
    }

    const hasHealthPath = Boolean(String(agent.healthCheckPath || "").trim());
    const hasExecPath = Boolean(String(agent.execPath || "").trim());
    const healthy = hasHealthPath && hasExecPath;

    return {
      agentId,
      enabled: true,
      healthy,
      status: healthy ? "healthy" : "degraded",
      detail: healthy
        ? "Configured placeholder health probe and execution path."
        : "Missing healthCheckPath or execPath in registry.",
      healthCheckPath: agent.healthCheckPath,
      execPath: agent.execPath,
      version: agent.version
    };
  }

  async healthCheckAllAgents(): Promise<AgentHealthStatus[]> {
    return await Promise.all(this.listEnabledAgents().map(async (agent) => this.healthCheckAgent(agent.id)));
  }

  async executeAgent(agentId: string, request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const agent = this.getAgent(agentId);
    const logs: AgentExecutionLogEntry[] = [];
    const startedAt = Date.now();
    const timeoutMs = request.timeoutMs ?? this.defaultTimeoutMs;

    this.pushLog(logs, "info", "agent.execute.start", {
      agentId,
      intent: request.intent,
      capsuleName: request.capsuleName,
      route: request.route
    });

    try {
      const output = await this.withTimeout(this.routeExecution(agent, request, logs), timeoutMs, agent.id);
      this.pushLog(logs, "info", "agent.execute.completed", {
        agentId,
        durationMs: Date.now() - startedAt
      });

      return {
        ok: true,
        agentId: agent.id,
        handledBy: agent.id,
        status: "stubbed",
        durationMs: Date.now() - startedAt,
        logs,
        output
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const timedOut = err instanceof AgentTimeoutError;
      this.pushLog(logs, timedOut ? "warn" : "error", "agent.execute.failed", {
        agentId,
        error: err.message
      });

      return {
        ok: false,
        agentId: agent.id,
        handledBy: agent.id,
        status: timedOut ? "timed_out" : "failed",
        durationMs: Date.now() - startedAt,
        logs,
        output: {
          error: err.message,
          todo: "TODO: replace stubbed execution wrappers with model-specific process orchestration."
        }
      };
    }
  }

  private validate(registry: AgentRegistry): void {
    if (!Array.isArray(registry.agents)) {
      throw new Error("agent-registry.json invalid: 'agents' must be an array.");
    }
    if (!Array.isArray(registry.capabilityProfiles)) {
      throw new Error("agent-registry.json invalid: 'capabilityProfiles' must be an array.");
    }
    if (!Array.isArray(registry.walletBindings)) {
      throw new Error("agent-registry.json invalid: 'walletBindings' must be an array.");
    }
  }

  private async routeExecution(
    agent: AgentIdentity,
    request: AgentExecutionRequest,
    logs: AgentExecutionLogEntry[]
  ): Promise<Record<string, unknown>> {
    switch (agent.id) {
      case "claude-code":
        return await this.executeClaudeCode(request, logs);
      case "gemini-cli":
        return await this.executeGeminiCli(request, logs);
      case "codex":
        return await this.executeCodex(request, logs);
      case "deepflex-uhura":
        return await this.executeDeepflexUhura(request, logs);
      case "turbo-quant":
        return await this.executeTurboQuant(request, logs);
      case "godmode-browser":
        return await this.executeGodmodeBrowser(request, logs);
      case "ad-autonomous":
        return await this.executeAdAutonomous(request, logs);
      default:
        return {
          intent: request.intent,
          capsuleName: request.capsuleName,
          route: request.route,
          todo: `TODO: implement execution wrapper for '${agent.id}'.`
        };
    }
  }

  private async executeClaudeCode(
    request: AgentExecutionRequest,
    logs: AgentExecutionLogEntry[]
  ): Promise<Record<string, unknown>> {
    this.pushLog(logs, "info", "agent.wrapper.claude-code", {
      todo: "TODO: wire Claude Code CLI execution and streaming output."
    });
    return this.stubbedOutput("claude-code", request, "TODO: invoke Claude Code for code generation and review.");
  }

  private async executeGeminiCli(
    request: AgentExecutionRequest,
    logs: AgentExecutionLogEntry[]
  ): Promise<Record<string, unknown>> {
    this.pushLog(logs, "info", "agent.wrapper.gemini-cli", {
      todo: "TODO: wire Gemini CLI prompt and retrieval flow."
    });
    return this.stubbedOutput("gemini-cli", request, "TODO: invoke Gemini CLI for research and compliance analysis.");
  }

  private async executeCodex(
    request: AgentExecutionRequest,
    logs: AgentExecutionLogEntry[]
  ): Promise<Record<string, unknown>> {
    this.pushLog(logs, "info", "agent.wrapper.codex", {
      todo: "TODO: wire Codex task execution against local workspace context."
    });
    return this.stubbedOutput("codex", request, "TODO: invoke Codex for implementation and review workflows.");
  }

  private async executeDeepflexUhura(
    request: AgentExecutionRequest,
    logs: AgentExecutionLogEntry[]
  ): Promise<Record<string, unknown>> {
    this.pushLog(logs, "info", "agent.wrapper.deepflex-uhura", {
      todo: "TODO: wire supervisor escalation and mesh intervention logic."
    });
    return this.stubbedOutput("deepflex-uhura", request, "TODO: invoke DeepFlex Uhura for supervision and fallback.");
  }

  private async executeTurboQuant(
    request: AgentExecutionRequest,
    logs: AgentExecutionLogEntry[]
  ): Promise<Record<string, unknown>> {
    this.pushLog(logs, "info", "agent.wrapper.turbo-quant", {
      todo: "TODO: wire quantitative optimization and forecasting execution."
    });
    return this.stubbedOutput("turbo-quant", request, "TODO: invoke Turbo Quant for scoring and optimization.");
  }

  private async executeGodmodeBrowser(
    request: AgentExecutionRequest,
    logs: AgentExecutionLogEntry[]
  ): Promise<Record<string, unknown>> {
    this.pushLog(logs, "info", "agent.wrapper.godmode-browser", {
      todo: "TODO: wire browser automation and navigation execution."
    });
    return this.stubbedOutput("godmode-browser", request, "TODO: invoke browser automation for monitoring and dispatch.");
  }

  private async executeAdAutonomous(
    request: AgentExecutionRequest,
    logs: AgentExecutionLogEntry[]
  ): Promise<Record<string, unknown>> {
    this.pushLog(logs, "info", "agent.wrapper.ad-autonomous", {
      todo: "TODO: wire campaign orchestration and budget adjustment logic."
    });
    return this.stubbedOutput("ad-autonomous", request, "TODO: invoke ad-autonomous for campaign execution.");
  }

  private stubbedOutput(agentId: string, request: AgentExecutionRequest, todo: string): Record<string, unknown> {
    return {
      agentId,
      intent: request.intent,
      capsuleName: request.capsuleName,
      route: request.route,
      payload: request.payload,
      metadata: request.metadata,
      todo,
      placeholder: true
    };
  }

  private pushLog(
    logs: AgentExecutionLogEntry[],
    level: AgentExecutionLogEntry["level"],
    event: string,
    detail?: Record<string, unknown>
  ): void {
    logs.push({
      level,
      event,
      ts: new Date().toISOString(),
      detail
    });
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, agentId: string): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new AgentTimeoutError(`Agent '${agentId}' exceeded timeout guard of ${timeoutMs}ms.`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}

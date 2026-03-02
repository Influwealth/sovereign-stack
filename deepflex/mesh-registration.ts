import type { RuntimeEventBus } from "./event-bus";

export type MeshNodeStatus = "registered" | "healthy" | "degraded" | "offline";

export interface MeshNodeRegistration {
  subsystemId: string;
  did: string;
  endpoint?: string;
  zone?: string;
  version?: string;
  status: MeshNodeStatus;
  updatedAt: string;
}

export interface MeshHealthProbeResult {
  subsystemId: string;
  status: MeshNodeStatus;
  detail?: string;
  ts: string;
}

export type MeshHealthProbe = (subsystemId: string) => Promise<MeshHealthProbeResult> | MeshHealthProbeResult;

export class MeshRegistry {
  private readonly entries = new Map<string, MeshNodeRegistration>();
  private readonly healthProbe?: MeshHealthProbe;
  private readonly eventBus?: RuntimeEventBus;

  constructor(options: {
    healthProbe?: MeshHealthProbe;
    eventBus?: RuntimeEventBus;
  } = {}) {
    this.healthProbe = options.healthProbe;
    this.eventBus = options.eventBus;
  }

  register(input: Omit<MeshNodeRegistration, "updatedAt" | "status"> & { status?: MeshNodeStatus }): MeshNodeRegistration {
    const subsystemId = String(input.subsystemId || "").trim();
    if (!subsystemId) {
      throw new Error("Mesh registration requires subsystemId.");
    }

    const registration: MeshNodeRegistration = {
      subsystemId,
      did: String(input.did || "").trim(),
      endpoint: input.endpoint,
      zone: input.zone,
      version: input.version,
      status: input.status ?? "registered",
      updatedAt: new Date().toISOString()
    };

    this.entries.set(subsystemId, registration);
    this.eventBus?.publish({
      type: "mesh.node.registered",
      source: "mesh-registry",
      correlation_id: subsystemId,
      payload: registration
    });

    return registration;
  }

  setStatus(subsystemId: string, status: MeshNodeStatus, detail?: string): MeshNodeRegistration {
    const entry = this.get(subsystemId);
    const updated: MeshNodeRegistration = {
      ...entry,
      status,
      updatedAt: new Date().toISOString()
    };
    this.entries.set(subsystemId, updated);

    this.eventBus?.publish({
      type: "mesh.node.status",
      source: "mesh-registry",
      correlation_id: subsystemId,
      payload: {
        ...updated,
        detail
      }
    });

    return updated;
  }

  get(subsystemId: string): MeshNodeRegistration {
    const entry = this.entries.get(subsystemId);
    if (!entry) {
      throw new Error(`Mesh node '${subsystemId}' is not registered.`);
    }
    return entry;
  }

  list(): MeshNodeRegistration[] {
    return [...this.entries.values()];
  }

  isRegistered(subsystemId: string): boolean {
    return this.entries.has(subsystemId);
  }

  async runHealthChecks(): Promise<MeshHealthProbeResult[]> {
    const checks: MeshHealthProbeResult[] = [];
    for (const entry of this.entries.values()) {
      const result = await this.probe(entry.subsystemId);
      checks.push(result);
      this.setStatus(entry.subsystemId, result.status, result.detail);
    }
    return checks;
  }

  private async probe(subsystemId: string): Promise<MeshHealthProbeResult> {
    if (!this.healthProbe) {
      return {
        subsystemId,
        status: "healthy",
        detail: "No external health probe configured.",
        ts: new Date().toISOString()
      };
    }

    try {
      return await this.healthProbe(subsystemId);
    } catch (error) {
      return {
        subsystemId,
        status: "degraded",
        detail: `Probe error: ${String(error)}`,
        ts: new Date().toISOString()
      };
    }
  }
}

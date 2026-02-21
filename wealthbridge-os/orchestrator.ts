import { PolicyEngine } from "./policy-engine";
import { RuntimeLoader, type CapsuleName, type LoadedCapsule } from "./runtime-loader";
import { Scheduler, type SchedulerTask } from "./scheduler";

interface ExecuteRequest {
  routeId: string;
  payload: unknown;
  actor?: string;
  capabilities?: string[];
}

export class Orchestrator {
  private readonly loader: RuntimeLoader;
  private readonly policyEngine: PolicyEngine;
  private readonly scheduler: Scheduler;
  private readonly capsules = new Map<CapsuleName, LoadedCapsule>();
  private readonly routeIndex = new Map<string, CapsuleName>();
  private initialized = false;

  constructor(
    loader = new RuntimeLoader(),
    policyEngine = new PolicyEngine()
  ) {
    this.loader = loader;
    this.policyEngine = policyEngine;
    this.scheduler = new Scheduler(this.executeTask.bind(this), { maxConcurrent: 4 });
  }

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.loader.loadRegistry();
    const loaded = this.loader.loadAllCapsules();

    for (const [capsuleName, capsule] of loaded.entries()) {
      this.capsules.set(capsuleName, capsule);
      for (const route of capsule.routes.routes) {
        const routeId = String(route.id ?? "");
        if (!routeId) {
          continue;
        }
        this.routeIndex.set(routeId, capsuleName);
      }
    }

    this.initialized = true;
  }

  schedule(request: ExecuteRequest): SchedulerTask {
    this.ensureInitialized();

    const routeId = request.routeId;
    const capsule = this.routeIndex.get(routeId);
    if (!capsule) {
      throw new Error(`Route '${routeId}' is not registered in runtime loader.`);
    }

    const actor = request.actor ?? "system";
    const capabilities = request.capabilities ?? [];
    const decision = this.policyEngine.evaluate({ capsule, routeId, actor, capabilities });

    if (!decision.allow) {
      throw new Error(`Policy denied request: ${decision.reason}`);
    }

    return this.scheduler.enqueue({
      capsule,
      routeId,
      payload: request.payload,
      context: { actor, capabilities }
    });
  }

  async run(): Promise<void> {
    this.ensureInitialized();
    await this.scheduler.runTick();
  }

  async drain(timeoutMs = 10_000): Promise<void> {
    this.ensureInitialized();
    await this.scheduler.drain(timeoutMs);
  }

  snapshot(): ReturnType<Scheduler["getSnapshot"]> {
    return this.scheduler.getSnapshot();
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }

  private async executeTask(task: SchedulerTask): Promise<unknown> {
    const capsule = this.capsules.get(task.capsule as CapsuleName);
    if (!capsule) {
      throw new Error(`Capsule '${task.capsule}' is not loaded.`);
    }

    const route = capsule.routes.routes.find((entry) => String(entry.id) === task.routeId);
    if (!route) {
      throw new Error(`Route '${task.routeId}' not found in capsule '${task.capsule}'.`);
    }

    return {
      accepted: true,
      capsule: task.capsule,
      routeId: task.routeId,
      handler: String(route.handler ?? "unbound"),
      actor: task.context.actor,
      timestamp: new Date().toISOString(),
      payload: task.payload
    };
  }
}

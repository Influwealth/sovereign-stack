import { AdapterRegistry } from "./adapter-registry";
import { EventNormalizer } from "./event-normalizer";
import { TelecomRouter } from "./telecom-router";
import type {
  TelecomAdapterRequest,
  TelecomAdapterResponse,
  TelecomNormalizedEvent,
  TelecomRouteRequest
} from "../interfaces/telecom-integration.types";

export class TelecomOrchestrator {
  private readonly registry = new AdapterRegistry();
  private readonly router = new TelecomRouter();
  private readonly normalizer = new EventNormalizer();

  async execute(request: TelecomRouteRequest): Promise<TelecomNormalizedEvent> {
    const enabled = this.registry.getEnabledAdapters().map((entry) => entry.name);
    const routed = this.router.route(request);

    if (!enabled.includes(routed.adapter)) {
      throw new Error(`Adapter '${routed.adapter}' is disabled in telecom-registry.json.`);
    }

    const response = await this.invokeAdapter(routed);
    return this.normalizer.normalize(response, routed.traceId);
  }

  private async invokeAdapter(request: TelecomAdapterRequest): Promise<TelecomAdapterResponse> {
    const started = Date.now();

    // Stubbed adapter call. Real adapter bindings are integrated in phase-4.
    return {
      adapter: request.adapter,
      success: true,
      status: "accepted",
      durationMs: Date.now() - started,
      data: {
        command: request.command,
        traceId: request.traceId
      }
    };
  }
}

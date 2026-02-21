import type { TelecomAdapterResponse, TelecomNormalizedEvent } from "../interfaces/telecom-integration.types";

export class EventNormalizer {
  normalize(response: TelecomAdapterResponse, traceId: string): TelecomNormalizedEvent {
    return {
      source: response.adapter,
      eventType: `telecom.${response.adapter}.${response.status}`,
      timestamp: new Date().toISOString(),
      traceId,
      status: response.success ? "ok" : "error",
      payload: {
        durationMs: response.durationMs,
        data: response.data ?? {},
        error: response.error ?? null
      }
    };
  }
}

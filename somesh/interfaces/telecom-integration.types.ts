export type TelecomAdapterName = "billing" | "esim" | "open5gs" | "pstn" | "ran-oai" | "sip";

export interface TelecomRouteRequest {
  domain: string;
  action: string;
  payload: Record<string, unknown>;
  metadata?: {
    traceId?: string;
    actor?: string;
    priority?: "low" | "normal" | "high";
  };
}

export interface TelecomAdapterRequest {
  adapter: TelecomAdapterName;
  command: string;
  payload: Record<string, unknown>;
  traceId: string;
}

export interface TelecomAdapterResponse {
  adapter: TelecomAdapterName;
  success: boolean;
  status: string;
  data?: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

export interface TelecomNormalizedEvent {
  source: TelecomAdapterName;
  eventType: string;
  timestamp: string;
  traceId: string;
  status: "ok" | "error";
  payload: Record<string, unknown>;
}

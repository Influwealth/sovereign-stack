import type {
  TelecomAdapterName,
  TelecomAdapterRequest,
  TelecomRouteRequest
} from "../interfaces/telecom-integration.types";

const DOMAIN_TO_ADAPTER: Record<string, TelecomAdapterName> = {
  billing: "billing",
  esim: "esim",
  core5g: "open5gs",
  pstn: "pstn",
  ran: "ran-oai",
  sip: "sip"
};

export class TelecomRouter {
  route(request: TelecomRouteRequest): TelecomAdapterRequest {
    const adapter = DOMAIN_TO_ADAPTER[request.domain];
    if (!adapter) {
      throw new Error(`No telecom adapter registered for domain '${request.domain}'.`);
    }

    return {
      adapter,
      command: `${request.domain}.${request.action}`,
      payload: request.payload,
      traceId: request.metadata?.traceId ?? `tm-${Date.now()}`
    };
  }
}

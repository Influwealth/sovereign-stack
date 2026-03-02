export interface RuntimeEvent<TPayload = unknown> {
  id: string;
  ts: string;
  type: string;
  source: string;
  payload: TPayload;
  correlation_id?: string;
}

export interface RuntimeEventInput<TPayload = unknown> {
  type: string;
  source: string;
  payload?: TPayload;
  correlation_id?: string;
}

export interface RuntimeEventBusOptions {
  maxRetainedEvents?: number;
}

export type RuntimeEventHandler = (event: RuntimeEvent) => void;

export class RuntimeEventBus {
  private readonly maxRetainedEvents: number;
  private readonly handlers = new Map<string, Set<RuntimeEventHandler>>();
  private readonly retained: RuntimeEvent[] = [];
  private sequence = 0;

  constructor(options: RuntimeEventBusOptions = {}) {
    this.maxRetainedEvents = options.maxRetainedEvents ?? 250;
  }

  publish<TPayload = unknown>(input: RuntimeEventInput<TPayload>): RuntimeEvent<TPayload> {
    const event: RuntimeEvent<TPayload> = {
      id: `evt-${Date.now()}-${++this.sequence}`,
      ts: new Date().toISOString(),
      type: input.type,
      source: input.source,
      payload: (input.payload ?? null) as TPayload,
      correlation_id: input.correlation_id
    };

    this.retained.push(event);
    if (this.retained.length > this.maxRetainedEvents) {
      this.retained.splice(0, this.retained.length - this.maxRetainedEvents);
    }

    this.emit(event);
    return event;
  }

  subscribe(type: string, handler: RuntimeEventHandler): () => void {
    const key = this.normalizeType(type);
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }
    this.handlers.get(key)!.add(handler);

    return () => {
      const set = this.handlers.get(key);
      if (!set) {
        return;
      }
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(key);
      }
    };
  }

  getRecent(limit = 100): RuntimeEvent[] {
    const safeLimit = Math.max(1, limit);
    if (this.retained.length <= safeLimit) {
      return [...this.retained];
    }
    return this.retained.slice(this.retained.length - safeLimit);
  }

  private emit(event: RuntimeEvent): void {
    const exact = this.handlers.get(this.normalizeType(event.type));
    if (exact) {
      for (const handler of exact) {
        this.safeInvoke(handler, event);
      }
    }

    const wildcard = this.handlers.get("*");
    if (wildcard) {
      for (const handler of wildcard) {
        this.safeInvoke(handler, event);
      }
    }
  }

  private safeInvoke(handler: RuntimeEventHandler, event: RuntimeEvent): void {
    try {
      handler(event);
    } catch (_error) {
      // Event bus handlers must never break runtime flow.
    }
  }

  private normalizeType(type: string): string {
    const normalized = String(type || "").trim();
    return normalized || "*";
  }
}

export interface CapsuleSandboxPolicy {
  maxPayloadBytes: number;
  executionTimeoutMs: number;
  allowedRoutePattern?: RegExp;
}

export interface CapsuleSandboxExecutionInput {
  capsuleName: string;
  route: string;
  payload: unknown;
  handler: (payload: unknown) => Promise<unknown> | unknown;
}

export interface CapsuleSandboxExecutionResult {
  capsule: string;
  route: string;
  duration_ms: number;
  timeout_ms: number;
  payload_bytes: number;
  result: unknown;
}

const DEFAULT_POLICY: CapsuleSandboxPolicy = {
  maxPayloadBytes: 256_000,
  executionTimeoutMs: 20_000
};

export class CapsuleSandbox {
  private readonly policy: CapsuleSandboxPolicy;

  constructor(policy: Partial<CapsuleSandboxPolicy> = {}) {
    this.policy = {
      ...DEFAULT_POLICY,
      ...policy
    };
  }

  async execute(input: CapsuleSandboxExecutionInput): Promise<CapsuleSandboxExecutionResult> {
    const capsuleName = String(input.capsuleName || "").trim();
    const route = String(input.route || "").trim();

    if (!capsuleName || !route) {
      throw new Error("CapsuleSandbox requires capsuleName and route.");
    }

    if (this.policy.allowedRoutePattern && !this.policy.allowedRoutePattern.test(`${capsuleName}.${route}`)) {
      throw new Error(`CapsuleSandbox blocked route '${capsuleName}.${route}'.`);
    }

    const clonedPayload = cloneJson(input.payload);
    const payloadBytes = new TextEncoder().encode(JSON.stringify(clonedPayload ?? null)).length;
    if (payloadBytes > this.policy.maxPayloadBytes) {
      throw new Error(
        `CapsuleSandbox blocked payload: ${payloadBytes} bytes exceeds ${this.policy.maxPayloadBytes} bytes.`
      );
    }

    const started = Date.now();
    const result = await withTimeout(
      Promise.resolve(input.handler(clonedPayload)),
      this.policy.executionTimeoutMs,
      `CapsuleSandbox timeout after ${this.policy.executionTimeoutMs}ms for ${capsuleName}.${route}`
    );

    return {
      capsule: capsuleName,
      route,
      duration_ms: Date.now() - started,
      timeout_ms: this.policy.executionTimeoutMs,
      payload_bytes: payloadBytes,
      result
    };
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function cloneJson(payload: unknown): unknown {
  if (payload === undefined) {
    return {};
  }
  return JSON.parse(JSON.stringify(payload));
}

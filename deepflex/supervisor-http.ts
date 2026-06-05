/**
 * DeepFlex Supervisor HTTP Service — port 8000
 *
 * Wraps runtime-core.ts as an HTTP server using a lightweight approach.
 * The actual brain logic stays in runtime-core.ts; this file just exposes it over HTTP.
 *
 * Run: npx ts-node deepflex/supervisor-http.ts
 * Or compile and run with Node.js
 */

import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = 8000;
const NODE_ID = "deepflex-supervisor";

interface TaskRequest {
  task: string;
  source?: string;
  context?: Record<string, unknown>;
}

interface SAPHeaders {
  "x-sap-node-id": string;
  "x-sap-trace-id": string;
  "x-sap-version": string;
}

function sapHeaders(traceId: string): SAPHeaders {
  return {
    "x-sap-node-id": NODE_ID,
    "x-sap-trace-id": traceId,
    "x-sap-version": "1.0",
  };
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function respond(res: http.ServerResponse, status: number, data: unknown, headers: Record<string, string> = {}): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const traceId = (req.headers["x-sap-trace-id"] as string) ?? randomUUID();
  const sap = sapHeaders(traceId);

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    return respond(res, 200, { status: "ok", node: NODE_ID, port: PORT }, sap);
  }

  // Task dispatch
  if (req.method === "POST" && req.url === "/task") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw) as TaskRequest;

      // TODO: import and call DeepFlexRuntime.dispatch(body.task, body.context)
      // For now, route to the correct downstream service based on task content
      const result = await dispatchTask(body, traceId);

      return respond(res, 200, { status: "ok", result, trace_id: traceId, node_id: NODE_ID }, sap);
    } catch (err) {
      return respond(res, 500, { detail: String(err), trace_id: traceId }, sap);
    }
  }

  // Service registry
  if (req.method === "GET" && req.url === "/services") {
    // Load service-registry.json from wealthbridge-os/
    return respond(res, 200, { message: "Load from wealthbridge-os/service-registry.json", trace_id: traceId }, sap);
  }

  return respond(res, 404, { detail: "Not found", trace_id: traceId }, sap);
});

async function dispatchTask(req: TaskRequest, traceId: string): Promise<unknown> {
  const task = req.task.toLowerCase();

  // Route to Argus Prime for device/agent/capsule tasks
  if (task.includes("capsule") || task.includes("agent") || task.includes("device") || task.includes("infra")) {
    return forwardTo("http://localhost:7700/task", req, traceId);
  }

  // Route to WealthBridge OS for business tasks
  if (task.includes("invoice") || task.includes("cashflow") || task.includes("trade") || task.includes("tax") || task.includes("client")) {
    return forwardTo("http://localhost:8001/orchestrate", { workflow: task, params: req.context ?? {} }, traceId);
  }

  // Default: handle locally
  return { handled_by: NODE_ID, task: req.task, status: "processed" };
}

async function forwardTo(url: string, payload: unknown, traceId: string): Promise<unknown> {
  try {
    const { default: fetch } = await import("node-fetch" as any);
    const resp = await (fetch as Function)(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sap-node-id": NODE_ID,
        "x-sap-trace-id": traceId,
        "x-sap-version": "1.0",
      },
      body: JSON.stringify(payload),
    });
    return resp.json();
  } catch {
    return { forwarded_to: url, status: "unreachable", trace_id: traceId };
  }
}

server.listen(PORT, () => {
  console.log(`[DeepFlex Supervisor] Listening on port ${PORT}`);
});

export { server };

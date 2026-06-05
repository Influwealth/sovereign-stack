/**
 * DeepFlex Supervisor HTTP Service — port 8000
 * MONAD v3.7 — NODE_ALPHA: Sovereign Control Hub
 *
 * Routes:
 *   GET  /health              — liveness probe
 *   POST /task               — task dispatch (capsule, business, inference, identity, vr)
 *   GET  /services           — service registry
 *   POST /services/register  — MONAD node self-registration
 *   POST /services/heartbeat — MONAD node 30s heartbeat
 *   POST /deepflex/callback  — async callback from downstream nodes
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const PORT = 8000;
const NODE_ID = "NODE_ALPHA";
const SAP_VERSION = "3.7";

const SERVICE_REGISTRY_PATH = path.join(
  __dirname,
  "..",
  "wealthbridge-os",
  "service-registry.json"
);

interface TaskRequest {
  task: string;
  source?: string;
  context?: Record<string, unknown>;
}

interface ServiceRegistration {
  service_id: string;
  node_id: string;
  port: number;
  capabilities: string[];
  monad_version?: string;
  registered_at?: number;
  trace_id?: string;
  [key: string]: unknown;
}

const registeredServices: Map<string, ServiceRegistration & { last_heartbeat: number }> = new Map();

function sapHeaders(traceId: string): Record<string, string> {
  return {
    "x-sap-node-id": NODE_ID,
    "x-sap-trace-id": traceId,
    "x-sap-version": SAP_VERSION,
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

function respond(
  res: http.ServerResponse,
  status: number,
  data: unknown,
  headers: Record<string, string> = {}
): void {
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
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  // Liveness probe
  if (method === "GET" && url === "/health") {
    return respond(res, 200, {
      status: "ok",
      node: NODE_ID,
      port: PORT,
      monad_version: SAP_VERSION,
      registered_services: registeredServices.size,
    }, sap);
  }

  // Task dispatch (primary entry point from all nodes)
  if (method === "POST" && url === "/task") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw) as TaskRequest;
      const result = await dispatchTask(body, traceId);
      return respond(res, 200, { status: "ok", result, trace_id: traceId, node_id: NODE_ID }, sap);
    } catch (err) {
      return respond(res, 500, { detail: String(err), trace_id: traceId }, sap);
    }
  }

  // Service registry read
  if (method === "GET" && url === "/services") {
    try {
      const staticRegistry = JSON.parse(fs.readFileSync(SERVICE_REGISTRY_PATH, "utf-8"));
      const liveServices = Array.from(registeredServices.values()).map((s) => ({
        ...s,
        alive: Date.now() - s.last_heartbeat < 60_000,
      }));
      return respond(res, 200, {
        static_registry: staticRegistry,
        live_services: liveServices,
        trace_id: traceId,
      }, sap);
    } catch {
      return respond(res, 200, { live_services: [], trace_id: traceId }, sap);
    }
  }

  // MONAD service self-registration
  if (method === "POST" && url === "/services/register") {
    try {
      const raw = await readBody(req);
      const reg = JSON.parse(raw) as ServiceRegistration;
      registeredServices.set(reg.service_id, { ...reg, last_heartbeat: Date.now() });
      console.log(`[NODE_ALPHA] Registered: ${reg.service_id} (${reg.node_id}) on port ${reg.port}`);
      return respond(res, 200, {
        status: "registered",
        service_id: reg.service_id,
        trace_id: traceId,
      }, sap);
    } catch (err) {
      return respond(res, 400, { detail: String(err), trace_id: traceId }, sap);
    }
  }

  // MONAD heartbeat
  if (method === "POST" && url === "/services/heartbeat") {
    try {
      const raw = await readBody(req);
      const hb = JSON.parse(raw) as { service_id: string };
      const existing = registeredServices.get(hb.service_id);
      if (existing) {
        existing.last_heartbeat = Date.now();
        return respond(res, 200, { status: "ok", service_id: hb.service_id, trace_id: traceId }, sap);
      }
      return respond(res, 404, { detail: "Service not registered", trace_id: traceId }, sap);
    } catch (err) {
      return respond(res, 400, { detail: String(err), trace_id: traceId }, sap);
    }
  }

  // Async callback from downstream (Argus, NVIDIA, VR, ICP)
  if (method === "POST" && url === "/deepflex/callback") {
    try {
      const raw = await readBody(req);
      const cb = JSON.parse(raw);
      console.log(`[NODE_ALPHA] Callback from ${req.headers["x-sap-node-id"] ?? "unknown"}: ${JSON.stringify(cb).slice(0, 120)}`);
      return respond(res, 200, { status: "received", trace_id: traceId }, sap);
    } catch (err) {
      return respond(res, 400, { detail: String(err), trace_id: traceId }, sap);
    }
  }

  return respond(res, 404, { detail: "Not found", url, trace_id: traceId }, sap);
});

async function dispatchTask(req: TaskRequest, traceId: string): Promise<unknown> {
  const task = req.task.toLowerCase();

  // MONAD internal tasks
  if (task === "service.register" || task === "service.heartbeat") {
    const serviceId = (req.context as any)?.service_id ?? "unknown";
    if (task === "service.register") {
      registeredServices.set(serviceId, {
        ...(req.context as ServiceRegistration),
        last_heartbeat: Date.now(),
      });
      console.log(`[NODE_ALPHA] Registered via task: ${serviceId}`);
    } else {
      const existing = registeredServices.get(serviceId);
      if (existing) existing.last_heartbeat = Date.now();
    }
    return { handled_by: NODE_ID, task: req.task, service_id: serviceId };
  }

  // Device / agent / capsule / infra → Argus Prime (7700)
  if (
    task.includes("capsule") ||
    task.includes("agent") ||
    task.includes("device") ||
    task.includes("infra")
  ) {
    return forwardTo("http://localhost:7700/task", req, traceId);
  }

  // Inference / NIM / world-building → NVIDIA Resource Suite (7760)
  if (
    task.includes("inference") ||
    task.includes("nim") ||
    task.includes("world") ||
    task.includes("render") ||
    task.includes("education")
  ) {
    return forwardTo("http://localhost:7760/task", req, traceId);
  }

  // Identity / ICP / token → ICP Gateway (4943)
  if (
    task.includes("identity") ||
    task.includes("icp") ||
    task.includes("token") ||
    task.includes("canister")
  ) {
    return forwardTo("http://localhost:4943/task", req, traceId);
  }

  // VR / meeting / digital twin → VR Room (7791)
  if (
    task.includes("vr") ||
    task.includes("meeting") ||
    task.includes("cockpit") ||
    task.includes("twin")
  ) {
    return forwardTo("http://localhost:7791/task", req, traceId);
  }

  // Business workflows → WealthBridge OS orchestrator (8001)
  if (
    task.includes("invoice") ||
    task.includes("cashflow") ||
    task.includes("trade") ||
    task.includes("tax") ||
    task.includes("client") ||
    task.includes("financing")
  ) {
    return forwardTo(
      "http://localhost:8001/orchestrate",
      { workflow: task, params: req.context ?? {} },
      traceId
    );
  }

  // Default: handle locally
  return { handled_by: NODE_ID, task: req.task, status: "processed", monad_version: SAP_VERSION };
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
        "x-sap-version": SAP_VERSION,
      },
      body: JSON.stringify(payload),
    });
    return resp.json();
  } catch {
    return { forwarded_to: url, status: "unreachable", trace_id: traceId };
  }
}

server.listen(PORT, () => {
  console.log(`[DeepFlex Supervisor — NODE_ALPHA] MONAD v${SAP_VERSION} listening on port ${PORT}`);
});

export { server };

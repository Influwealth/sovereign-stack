import type { QuantumExecutionNormalizedResult, QuantumExecutionRequest } from "../interfaces/quantum-adapter.types";

export interface QuantumFlowPlan {
  workflowId: string;
  stages: string[];
  metadata?: Record<string, unknown>;
}

export class QuantumFlowPlaceholder {
  buildPlan(request: QuantumExecutionRequest): QuantumFlowPlan {
    return {
      workflowId: `qf-${request.circuit.name}-${Date.now()}`,
      stages: [
        "compile-circuit",
        "provider-select",
        "execute",
        "normalize-result"
      ],
      metadata: {
        provider: request.provider,
        qubits: request.circuit.qubits,
        operations: request.circuit.operations.length
      }
    };
  }

  attachResult(plan: QuantumFlowPlan, result: QuantumExecutionNormalizedResult): Record<string, unknown> {
    return {
      plan,
      result,
      status: "placeholder-complete"
    };
  }
}

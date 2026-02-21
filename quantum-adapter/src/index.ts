import type {
  QuantumExecutionNormalizedResult,
  QuantumExecutionRequest
} from "../interfaces/quantum-adapter.types";
import { CircuitBuilder } from "./circuit-builder";
import { ExecutionWrapper } from "./execution-wrapper";
import { QuantumFlowPlaceholder } from "./quantumflow-placeholder";
import { ResultNormalizer } from "./result-normalizer";

export class QuantumAdapterIntegration {
  private readonly circuitBuilder = new CircuitBuilder();
  private readonly executionWrapper = new ExecutionWrapper();
  private readonly normalizer = new ResultNormalizer();
  private readonly quantumFlow = new QuantumFlowPlaceholder();

  async run(request: QuantumExecutionRequest): Promise<QuantumExecutionNormalizedResult> {
    const circuit = this.circuitBuilder.build({
      name: request.circuit.name,
      qubits: request.circuit.qubits,
      operations: request.circuit.operations,
      shots: request.circuit.shots
    });

    const executionRequest: QuantumExecutionRequest = {
      ...request,
      circuit
    };

    const raw = await this.executionWrapper.execute(executionRequest);
    const normalized = this.normalizer.normalize(executionRequest, raw);

    // Placeholder for future QuantumFlow integration pipeline.
    const plan = this.quantumFlow.buildPlan(executionRequest);
    this.quantumFlow.attachResult(plan, normalized);

    return normalized;
  }
}

export * from "../interfaces/quantum-adapter.types";
export { CircuitBuilder } from "./circuit-builder";
export { ExecutionWrapper } from "./execution-wrapper";
export { ResultNormalizer } from "./result-normalizer";
export { QuantumFlowPlaceholder } from "./quantumflow-placeholder";

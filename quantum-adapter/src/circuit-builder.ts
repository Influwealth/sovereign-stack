import type { QuantumCircuitOp, QuantumCircuitSpec } from "../interfaces/quantum-adapter.types";

export interface CircuitBuildInput {
  name: string;
  qubits: number;
  operations?: QuantumCircuitOp[];
  shots?: number;
}

export class CircuitBuilder {
  build(input: CircuitBuildInput): QuantumCircuitSpec {
    const operations = input.operations ?? this.defaultBellPairOps();
    return {
      name: input.name,
      qubits: input.qubits,
      classicalBits: input.qubits,
      operations,
      shots: input.shots ?? 1024
    };
  }

  // Qiskit-friendly starter circuit for adapter health checks.
  private defaultBellPairOps(): QuantumCircuitOp[] {
    return [
      { gate: "h", qubits: [0] },
      { gate: "cx", qubits: [0, 1] },
      { gate: "measure_all", qubits: [0, 1] }
    ];
  }
}

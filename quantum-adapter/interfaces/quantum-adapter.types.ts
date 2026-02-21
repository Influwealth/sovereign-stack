export type QuantumProvider = "qiskit" | "webgpu" | "cudaq" | "simulator";

export interface QuantumCircuitOp {
  gate: string;
  qubits: number[];
  params?: number[];
}

export interface QuantumCircuitSpec {
  name: string;
  qubits: number;
  classicalBits?: number;
  operations: QuantumCircuitOp[];
  shots?: number;
}

export interface QuantumExecutionRequest {
  provider: QuantumProvider;
  circuit: QuantumCircuitSpec;
  options?: {
    backend?: string;
    timeoutMs?: number;
    optimize?: boolean;
  };
}

export interface QuantumExecutionRawResult {
  provider: QuantumProvider;
  backend: string;
  jobId: string;
  counts?: Record<string, number>;
  statevector?: number[];
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export interface QuantumExecutionNormalizedResult {
  provider: QuantumProvider;
  backend: string;
  success: boolean;
  jobId: string;
  dominantState: string | null;
  probabilities: Record<string, number>;
  durationMs: number;
  trace: {
    circuitName: string;
    qubits: number;
    operations: number;
    shots: number;
  };
  metadata?: Record<string, unknown>;
}

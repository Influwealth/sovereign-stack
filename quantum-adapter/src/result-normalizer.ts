import type {
  QuantumExecutionNormalizedResult,
  QuantumExecutionRawResult,
  QuantumExecutionRequest
} from "../interfaces/quantum-adapter.types";

export class ResultNormalizer {
  normalize(
    request: QuantumExecutionRequest,
    raw: QuantumExecutionRawResult
  ): QuantumExecutionNormalizedResult {
    const shots = request.circuit.shots ?? 1024;
    const counts = raw.counts ?? {};
    const probabilities: Record<string, number> = {};

    for (const [state, count] of Object.entries(counts)) {
      probabilities[state] = count / shots;
    }

    const dominantState = this.findDominantState(counts);

    return {
      provider: raw.provider,
      backend: raw.backend,
      success: true,
      jobId: raw.jobId,
      dominantState,
      probabilities,
      durationMs: raw.durationMs,
      trace: {
        circuitName: request.circuit.name,
        qubits: request.circuit.qubits,
        operations: request.circuit.operations.length,
        shots
      },
      metadata: raw.metadata
    };
  }

  private findDominantState(counts: Record<string, number>): string | null {
    let winner: string | null = null;
    let max = -1;

    for (const [state, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        winner = state;
      }
    }

    return winner;
  }
}

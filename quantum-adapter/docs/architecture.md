# Quantum Adapter Integration Architecture

This layer provides the phase-3 quantum integration surface for Sovereign-Stack.

## Modules

- `src/circuit-builder.ts`: circuit construction stubs (Qiskit-friendly defaults)
- `src/execution-wrapper.ts`: provider execution wrapper entrypoint
- `src/result-normalizer.ts`: normalizes raw provider outputs
- `src/quantumflow-placeholder.ts`: placeholder pipeline for future QuantumFlow integration
- `src/index.ts`: orchestration entrypoint for adapter execution

## Provider Strategy

- Qiskit is the primary provider target.
- WebGPU and CUDA-Q are modeled as compatible providers.
- Simulator backend remains active as the default fallback.

## Output Contract

All executions should resolve into a single normalized schema:
- provider/backend
- dominant state + probabilities
- duration
- trace metadata (circuit, qubits, operation count, shots)

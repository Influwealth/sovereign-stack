# Codex Automation Plan  
### Sovereign‑Stack • WealthBridge OS Automation Engine  
### Influwealth Quantum Labs — 2026

---

## 1. Purpose

Codex is the **automation engine** of Sovereign‑Stack.  
Its mission is to maintain, extend, and evolve the monorepo by:

- Generating new capsules  
- Wiring adapters  
- Creating manifests + routes  
- Producing documentation  
- Maintaining consistency across layers  
- Enforcing OS‑level architecture rules  

Codex MUST treat this file as the **source of truth** for all automation behavior.

---

## 2. Required Inputs (Codex MUST read these)

Codex must always load and interpret the following files before generating anything:

1. README.md  
2. docs/architecture.md  
3. capsules/INDEX.md  
4. docs/ROADMAP.md  
5. codex/AUTOMATION_PLAN.md (this file)

These files define:

- Layer boundaries  
- Capsule registry  
- Integration surfaces  
- R&D phases  
- Automation rules  

Codex MUST NOT generate code without referencing these documents.

---

## 3. Capsule Automation Rules (MANDATORY)

When Codex creates a new capsule <name>, it MUST:

### 3.1 Create folder
capsules/<name>/

Code

### 3.2 Generate required files
capsules/<name>/README.md
capsules/<name>/capsule.<name>.json
capsules/<name>/routes.<name>.json
capsules/<name>/adapters.map.json

Code

### 3.3 Update registry
Append a new entry to:

capsules/INDEX.md

Code

### 3.4 Enforce naming conventions
- Lowercase folder names  
- Lowercase manifest filenames  
- Use <name> consistently across all files  

### 3.5 Wire capsule into WealthBridge OS
Codex must:

- Register capsule with the OS scheduler  
- Add routing logic  
- Attach observability hooks  
- Validate adapter references  

### 3.6 Validate structure
Every capsule MUST contain:

- A manifest  
- A routes file  
- An adapter map  
- A README  

If any file is missing, Codex must generate it.

---

## 4. Adapter Automation Rules

Codex must detect adapters in:

- somesh/adapters/*  
- quantum-adapter/  
- sap/  
- icp-integration/  

Codex MUST:

- Map adapters into dapters.map.json  
- Generate stubs for missing adapters  
- Maintain consistent naming  
- Ensure adapter references match real directories  

Codex MUST NOT create “phantom adapters” that do not exist.

---

## 5. Quantum Automation Rules

For quantum‑related tasks, Codex MUST:

- Prefer Qiskit integration via quantum-adapter/  
- Generate:
  - Circuit construction stubs  
  - Execution wrappers  
  - Result normalization functions  
- Create placeholder modules for QuantumFlow integration  
- Maintain quantum‑aware documentation  

Codex MUST NOT generate quantum code outside the adapter layer.

---

## 6. Identity + Infrastructure Automation Rules

Codex MUST:

- Use infra-federated-access/ for identity + trust logic  
- Integrate IFA into the identity capsule  
- Use deployments/ + scripts/ for infra automation  
- Generate:
  - Deployment templates  
  - Script stubs  
  - Config examples  

Codex MUST NOT modify deployment files without updating documentation.

---

## 7. Documentation Automation Rules

Codex MUST:

- Update capsule READMEs when generating new files  
- Update capsules/INDEX.md when adding capsules  
- Update architecture docs if new layers or flows are introduced  
- Maintain consistency across all docs  

Codex MUST NOT leave documentation outdated.

---

## 8. Safety + Consistency Rules

Codex MUST:

- Respect the monorepo structure  
- Maintain deterministic naming  
- Avoid breaking existing capsules  
- Avoid overwriting human‑written docs unless instructed  
- Validate JSON before writing  
- Maintain cross‑capsule compatibility  

Codex MUST NOT:

- Create duplicate capsules  
- Break OS‑level routing  
- Introduce inconsistent naming  
- Generate code outside designated folders  

---

## 9. Activation Criteria

Codex becomes fully active when ALL of the following exist:

- README.md  
- docs/architecture.md  
- capsules/INDEX.md  
- docs/ROADMAP.md  
- codex/AUTOMATION_PLAN.md  

Once this file is committed, Codex is authorized to:

- Scaffold new capsules  
- Generate manifests + routes  
- Wire adapters  
- Produce documentation  
- Maintain the OS  

**Codex activation: TRUE once committed.**


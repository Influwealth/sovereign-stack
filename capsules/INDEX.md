# Capsule Index  
### Sovereign‑Stack Capsule Runtime Registry

---

## 1. Purpose

This index is the **canonical registry** of all capsules in Sovereign‑Stack.  
Both **WealthBridge OS** and **Codex** rely on this file to:

- Discover available capsules  
- Understand their purpose  
- Locate manifests, routes, and adapter maps  
- Plan new capsule scaffolding  
- Maintain OS‑level consistency  

This file MUST remain accurate at all times.

---

## 2. Capsule Registry

### 2.1 Observability Capsule (LIVE)

- **Name:** observability  
- **Path:** capsules/observability/  
- **Role:** Logging, metrics, runtime introspection  
- **Status:** Live and active  

Files included:

- README.md  
- capsule.observability.json  
- 
outes.observability.json  
-  dapters.map.json  

---

### 2.2 Identity Capsule (PLANNED)

- **Name:** identity  
- **Path:** capsules/identity/  
- **Role:** Identity, authentication, token formats, IFA integration  
- **Status:** To be scaffolded  

Codex tasks:

- Create folder + base files  
- Integrate with infra-federated-access/  
- Define capsule manifest + routes + adapter map  

---

### 2.3 Messaging Capsule (PLANNED)

- **Name:** messaging  
- **Path:** capsules/messaging/  
- **Role:** Inter‑capsule messaging, event bus, notifications  
- **Status:** To be scaffolded  

---

### 2.4 Compute Capsule (PLANNED)

- **Name:** compute  
- **Path:** capsules/compute/  
- **Role:** Local compute orchestration, job scheduling, workload routing  
- **Status:** To be scaffolded  

---

### 2.5 Economic Capsule (PLANNED)

- **Name:** economic  
- **Path:** capsules/economic/  
- **Role:** WealthBridge financial logic, pricing, flows, economic modeling  
- **Status:** To be scaffolded  

---

### 2.6 Social Capsule (PLANNED)

- **Name:** social  
- **Path:** capsules/social/  
- **Role:** Social graph, engagement logic, interaction flows  
- **Status:** To be scaffolded  

---

## 3. Capsule Anatomy (MANDATORY STRUCTURE)

Every capsule MUST contain:

capsules/<name>/
├── README.md
├── capsule.<name>.json
├── routes.<name>.json
└── adapters.map.json

Code

Descriptions:

- **README.md** → Human‑readable capsule description  
- **capsule.<name>.json** → Core manifest (inputs, outputs, adapters, metadata)  
- **routes.<name>.json** → Entrypoints + routing logic  
- **adapters.map.json** → Mapping to adapters + external systems  

---

## 4. Codex Rules (NON‑NEGOTIABLE)

When Codex creates a new capsule, it MUST:

1. Create folder under capsules/<name>/  
2. Generate all four required files  
3. Append the capsule entry to this INDEX.md  
4. Maintain lowercase naming conventions  
5. Wire capsule into WealthBridge OS  
6. Add observability hooks  
7. Ensure adapter maps reference valid adapters  

Codex MUST treat this file as the **source of truth** for capsule existence.


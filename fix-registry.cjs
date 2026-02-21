const fs = require("fs");
const p = "wealthbridge-os/agent-federation/agent-registry.json";
const registry = {
  "agents": [
    {
      "id": "agent_001",
      "did": "did:wb:agent_001",
      "role": "admin",
      "walletId": "wallet_001",
      "capabilities": [
        "capsule:identity","capsule:messaging","capsule:economic",
        "capsule:business-ops","capsule:compliance","capsule:funding-intelligence",
        "capsule:quantum-adapter","capsule:somesh-telecom",
        "economic.triggerPayout","economic.ledgerUpdate",
        "identity.resolve","messaging.send"
      ],
      "permissions": {
        "capsules": ["identity","messaging","economic","business-ops","compliance","funding-intelligence","quantum-adapter","somesh-telecom"],
        "routes": ["economic.triggerPayout","economic.ledgerUpdate","identity.resolve","messaging.send"]
      },
      "status": "active"
    }
  ],
  "capabilityProfiles": [
    {
      "id": "profile_admin",
      "label": "Sovereign Admin",
      "capabilities": ["capsule:identity","capsule:messaging","capsule:economic","capsule:business-ops","capsule:compliance","capsule:funding-intelligence","capsule:quantum-adapter","capsule:somesh-telecom","economic.triggerPayout","economic.ledgerUpdate","identity.resolve","messaging.send"]
    }
  ],
  "wallets": [
    {
      "walletId": "wallet_001",
      "network": "circle-mainnet",
      "address": "0x0000000000000000000000000000000000000001",
      "metadata": { "owner": "agent_001", "type": "primary" }
    }
  ]
};
fs.writeFileSync(p, JSON.stringify(registry, null, 2), "utf8");
console.log("Fixed: agent-registry.json now has capabilityProfiles array");

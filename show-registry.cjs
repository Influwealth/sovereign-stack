const fs = require("fs");
const p = "wealthbridge-os/agent-federation/agent-registry.json";
const c = fs.readFileSync(p, "utf8");
console.log(c);

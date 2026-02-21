const fs = require("fs");
const p = "wealthbridge-os/agent-federation/agent-runtime.ts";
let c = fs.readFileSync(p, "utf8");
console.log(c.split("\n").slice(0,12).join("\n"));

const fs = require("fs");
const p = "wealthbridge-os/agent-federation/agent-runtime.ts";
const c = fs.readFileSync(p, "utf8");
// Show the validate function
const start = c.indexOf("validate");
console.log(c.slice(start, start + 600));

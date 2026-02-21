const fs = require("fs");
const p = "wealthbridge-os/agent-federation/agent-runtime.ts";
const c = fs.readFileSync(p, "utf8");
const start = c.indexOf("private validate");
console.log(c.slice(start, start + 1200));

const fs = require("fs");
const p = "wealthbridge-os/src/wallet-bridge/circleClient.ts";
let c = fs.readFileSync(p, "utf8");
c = c.replace(
  /Authorization:.*\n/,
  'Authorization: `Bearer ${process.env.CIRCLE_API_KEY || ""}`,\n'
);
fs.writeFileSync(p, c, "utf8");
console.log("Fixed. New content:");
console.log(c.split("\n").slice(0,15).join("\n"));

// Minimal smoke test for the CJS entry point.
const sdk = require("./dist/index.cjs");

sdk.ReclaimClient.configure({ token: "smoke" });

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("  ok:", msg);
  }
}

assert(typeof sdk.ReclaimClient === "function", "ReclaimClient exported (CJS)");
assert(typeof sdk.Task === "function", "Task exported (CJS)");
assert(typeof sdk.DailyHabit === "function", "DailyHabit exported (CJS)");
assert(typeof sdk.Hours === "function", "Hours exported (CJS)");
assert(typeof sdk.Webhook === "function", "Webhook exported (CJS)");
assert(typeof sdk.Changelog === "object" && typeof sdk.Changelog.all === "function", "Changelog exported (CJS)");
assert(sdk.PriorityLevel.P1 === "P1", "enum exported (CJS)");
assert(typeof sdk.verifySignature === "function", "verifySignature exported (CJS)");
assert(typeof sdk.parseWebhookPayload === "function", "parseWebhookPayload exported (CJS)");

const t = new sdk.Task({ title: "cjs smoke" });
t.duration = 1.5;
assert(t.timeChunksRequired === 6, "chunk math works (CJS)");

if (!process.exitCode) console.log("\nCJS smoke ok.");

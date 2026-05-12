/**
 * Webhooks — create a subscription and a receiver pseudocode.
 *
 *   RECLAIM_TOKEN=... npx tsx examples/webhooks.ts
 *
 * Subscribing requires an `apiVersion` value (e.g. "v2026-04-13") and a valid
 * `status` (e.g. "ACTIVE"). Reclaim may need to provision the webhook feature
 * on your account first — contact support if `POST` returns 500.
 */
import {
  Webhook,
  isHabitWebhookEvent,
  isTaskWebhookEvent,
  parseWebhookPayload,
  verifySignature,
} from "../src/index.js";

async function main(): Promise<void> {
  for (const wh of await Webhook.list()) {
    console.log(`${wh.id}: ${wh.url} (status=${wh.status}, events=${wh.events?.join(",")})`);
  }

  const wh = new Webhook({
    url: "https://yourapp.example.com/reclaim-hook",
    events: ["task.created", "task.updated", "task.completed"],
    status: "ACTIVE",
    apiVersion: "v2026-04-13",
    name: "my-integration",
  });
  // await wh.save(); // uncomment once webhooks are enabled on your account
  void wh;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/* ---- example receiver (Express-ish pseudocode) ---------------------------

import express from "express";

const app = express();
const SECRET = process.env.RECLAIM_WEBHOOK_SECRET!;

app.post(
  "/reclaim-hook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    verifySignature(req.body, req.header("X-Reclaim-Signature"), SECRET);
    const event = parseWebhookPayload(req.body);
    if (isTaskWebhookEvent(event)) {
      console.log("task", event.type, event.task.id, event.task.title);
    } else if (isHabitWebhookEvent(event)) {
      console.log("habit", event.type, event.habit.id, event.habit.title);
    }
    res.sendStatus(200);
  },
);

--------------------------------------------------------------------------- */
void verifySignature;
void parseWebhookPayload;
void isTaskWebhookEvent;
void isHabitWebhookEvent;

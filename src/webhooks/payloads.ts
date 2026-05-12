import { DailyHabit } from "../resources/habit.js";
import { Task } from "../resources/task.js";

/**
 * Webhook event type discriminator strings.
 */
export type TaskWebhookEventType =
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "task.deleted";

export type HabitWebhookEventType =
  | "habit.created"
  | "habit.updated"
  | "habit.deleted";

/**
 * Shape of a `task.*` event posted to your webhook receiver.
 *
 * The `task` field is rehydrated into a fully-functional {@link Task}
 * instance so you can call `.save()`, planner actions, etc. directly on it.
 */
export interface TaskWebhookEvent {
  type: TaskWebhookEventType;
  eventId: string;
  created: string;
  task: Task;
}

/**
 * Shape of a `habit.*` event posted to your webhook receiver.
 *
 * The `habit` field is rehydrated into a fully-functional {@link DailyHabit}.
 */
export interface HabitWebhookEvent {
  type: HabitWebhookEventType;
  eventId: string;
  created: string;
  habit: DailyHabit;
}

/**
 * Discriminated union of every webhook event Reclaim can deliver.
 */
export type WebhookEvent = TaskWebhookEvent | HabitWebhookEvent;

/**
 * Type guard — narrows a {@link WebhookEvent} to its task variant.
 */
export function isTaskWebhookEvent(e: WebhookEvent): e is TaskWebhookEvent {
  return e.type.startsWith("task.");
}

/**
 * Type guard — narrows a {@link WebhookEvent} to its habit variant.
 */
export function isHabitWebhookEvent(e: WebhookEvent): e is HabitWebhookEvent {
  return e.type.startsWith("habit.");
}

/**
 * Parse a raw HTTP request body into a typed {@link WebhookEvent}.
 *
 * Accepts either the raw `Buffer`/`Uint8Array`/`string` body or an
 * already-parsed JSON object. The `task` / `habit` sub-payloads are
 * rehydrated into proper {@link Task} / {@link DailyHabit} instances so you
 * can call methods on them.
 *
 * Throws if the body is not a recognisable Reclaim webhook payload.
 *
 * @example
 * ```ts
 * import express from "express";
 * import { parseWebhookPayload, isTaskWebhookEvent } from "reclaim-sdk";
 *
 * app.post("/reclaim", express.raw({ type: "application/json" }), (req, res) => {
 *   const event = parseWebhookPayload(req.body);
 *   if (isTaskWebhookEvent(event)) {
 *     console.log("task event", event.task.id, event.task.title);
 *   }
 *   res.sendStatus(200);
 * });
 * ```
 */
export function parseWebhookPayload(
  raw: string | Uint8Array | Buffer | Record<string, unknown>,
): WebhookEvent {
  let obj: Record<string, unknown>;
  if (raw instanceof Uint8Array) {
    obj = JSON.parse(new TextDecoder("utf-8").decode(raw)) as Record<string, unknown>;
  } else if (typeof raw === "string") {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } else if (typeof raw === "object" && raw !== null) {
    obj = raw;
  } else {
    throw new TypeError("parseWebhookPayload: expected string, buffer, or object");
  }

  const type = obj.type;
  if (typeof type !== "string") {
    throw new TypeError(
      `parseWebhookPayload: missing or invalid 'type' field: ${String(type)}`,
    );
  }
  const eventId = String(obj.eventId ?? "");
  const created = String(obj.created ?? "");

  if (type === "task.created" || type === "task.updated" || type === "task.completed" || type === "task.deleted") {
    const taskData = (obj.task ?? {}) as Record<string, unknown>;
    return {
      type,
      eventId,
      created,
      task: new Task(taskData),
    };
  }
  if (type === "habit.created" || type === "habit.updated" || type === "habit.deleted") {
    const habitData = (obj.habit ?? {}) as Record<string, unknown>;
    return {
      type,
      eventId,
      created,
      habit: new DailyHabit(habitData),
    };
  }
  throw new TypeError(`parseWebhookPayload: unknown event type: ${type}`);
}

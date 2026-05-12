import {
  type HabitWebhookEventType,
  type TaskWebhookEventType,
} from "../webhooks/payloads.js";
import { BaseResource, type JsonObject, type ResourceOptions } from "./base.js";

/**
 * Every event name Reclaim can deliver via webhooks.
 */
export type WebhookEventName = TaskWebhookEventType | HabitWebhookEventType;

/**
 * Type-only shape for `new Webhook({...})` autocomplete.
 */
export interface WebhookInit {
  id?: number;
  url?: string;
  events?: WebhookEventName[];
  secret?: string;
  name?: string;
  status?: string;
  apiVersion?: string;
  createdAt?: string;
  created?: string;
  updated?: string;
}

/**
 * Subscription to Reclaim's outbound webhook stream.
 *
 * Backed by `/api/team/current/webhooks`. Subscribe to a list of event types
 * (`task.created`, `task.updated`, `task.completed`, `task.deleted`,
 * `habit.created`, `habit.updated`, `habit.deleted`) and Reclaim posts
 * matching events to the URL you provide.
 *
 * Note: the webhook feature may need to be provisioned on your account by
 * Reclaim support before `POST /api/team/current/webhooks` succeeds.
 *
 * @example
 * ```ts
 * import { Webhook } from "reclaim-sdk";
 *
 * const wh = new Webhook({
 *   url: "https://yourapp.example.com/reclaim-hook",
 *   events: ["task.created", "task.updated", "task.completed"],
 *   status: "ACTIVE",
 *   apiVersion: "v2026-04-13",
 *   name: "my-integration",
 * });
 * await wh.save();
 * ```
 */
export class Webhook extends BaseResource<number> {
  public static readonly ENDPOINT = "/api/team/current/webhooks";

  declare public url?: string;
  declare public events?: WebhookEventName[];
  declare public secret?: string;
  declare public name?: string;
  declare public status?: string;
  declare public apiVersion?: string;
  declare public createdAt?: string;

  constructor(data: WebhookInit & JsonObject = {}, options: ResourceOptions = {}) {
    super(data, options);
    if (this.events === undefined) this.events = [];
  }
}

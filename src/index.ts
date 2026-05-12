// Core client
export {
  ReclaimClient,
  type ReclaimClientConfig,
  type RequestOptions,
  type QueryParams,
  type QueryParamValue,
  encodeQueryParams,
  toZuluIso,
} from "./client.js";

// Exceptions
export {
  ReclaimAPIError,
  RecordNotFound,
  InvalidRecord,
  AuthenticationError,
  SignatureVerificationError,
} from "./exceptions.js";

// Enums
export {
  PriorityLevel,
  EventCategory,
  EventColor,
  TaskStatus,
  TaskSource,
  SnoozeOption,
  Weekday,
  TimeSchemeFeature,
  PolicyType,
  EventSubType,
} from "./enums.js";

// Resources
export {
  BaseResource,
  type SaveStrategy,
  type SaveOptions,
  type ResourceOptions,
  type JsonObject,
} from "./resources/base.js";
export { PlannerResource } from "./resources/planner.js";
export {
  Task,
  type TaskInit,
  type TaskPatch,
  type TaskSourceObject,
} from "./resources/task.js";
export { DailyHabit, type DailyHabitInit } from "./resources/habit.js";
export {
  Hours,
  type HoursInit,
  type Interval,
  type DayIntervals,
  type TimeSchemePolicy,
  type TargetCalendar,
} from "./resources/hours.js";
export { Webhook, type WebhookInit, type WebhookEventName } from "./resources/webhook.js";
export { Changelog, type ChangeLogEntryView } from "./resources/changelog.js";

// Webhooks
export {
  type WebhookEvent,
  type TaskWebhookEvent,
  type HabitWebhookEvent,
  type TaskWebhookEventType,
  type HabitWebhookEventType,
  parseWebhookPayload,
  isTaskWebhookEvent,
  isHabitWebhookEvent,
  verifySignature,
} from "./webhooks/index.js";

/**
 * Priority bucket for tasks and habits. Higher number = lower priority.
 */
export const PriorityLevel = {
  P1: "P1",
  P2: "P2",
  P3: "P3",
  P4: "P4",
} as const;
export type PriorityLevel = (typeof PriorityLevel)[keyof typeof PriorityLevel];

/**
 * Top-level category for an event/task/habit. Determines which working-hours
 * profile (WORK / PERSONAL / both) Reclaim uses when scheduling.
 */
export const EventCategory = {
  WORK: "WORK",
  PERSONAL: "PERSONAL",
  BOTH: "BOTH",
} as const;
export type EventCategory = (typeof EventCategory)[keyof typeof EventCategory];

/**
 * Calendar event color (mirrors Google Calendar's palette).
 */
export const EventColor = {
  NONE: "NONE",
  LAVENDER: "LAVENDER",
  SAGE: "SAGE",
  GRAPE: "GRAPE",
  FLAMINGO: "FLAMINGO",
  BANANA: "BANANA",
  TANGERINE: "TANGERINE",
  PEACOCK: "PEACOCK",
  GRAPHITE: "GRAPHITE",
  BLUEBERRY: "BLUEBERRY",
  BASIL: "BASIL",
  TOMATO: "TOMATO",
} as const;
export type EventColor = (typeof EventColor)[keyof typeof EventColor];

/**
 * Lifecycle status of a task.
 */
export const TaskStatus = {
  NEW: "NEW",
  SCHEDULED: "SCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETE: "COMPLETE",
  CANCELLED: "CANCELLED",
  ARCHIVED: "ARCHIVED",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

/**
 * Where a task originated. Reclaim's own tasks use RECLAIM; integrations like
 * Google Tasks, Linear, Jira, etc. use their respective values.
 */
export const TaskSource = {
  RECLAIM: "RECLAIM",
  GOOGLE: "GOOGLE",
  ASANA: "ASANA",
  CLICKUP: "CLICKUP",
  JIRA: "JIRA",
  TODOIST: "TODOIST",
  LINEAR: "LINEAR",
} as const;
export type TaskSource = (typeof TaskSource)[keyof typeof TaskSource];

/**
 * Built-in snooze presets understood by the planner.
 */
export const SnoozeOption = {
  FROM_NOW_15M: "FROM_NOW_15M",
  FROM_NOW_30M: "FROM_NOW_30M",
  FROM_NOW_1H: "FROM_NOW_1H",
  FROM_NOW_2H: "FROM_NOW_2H",
  FROM_NOW_4H: "FROM_NOW_4H",
  TOMORROW: "TOMORROW",
  IN_TWO_DAYS: "IN_TWO_DAYS",
  NEXT_WEEK: "NEXT_WEEK",
} as const;
export type SnoozeOption = (typeof SnoozeOption)[keyof typeof SnoozeOption];

/**
 * Weekday names as used by time-scheme `dayHours` maps.
 */
export const Weekday = {
  MONDAY: "MONDAY",
  TUESDAY: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  FRIDAY: "FRIDAY",
  SATURDAY: "SATURDAY",
  SUNDAY: "SUNDAY",
} as const;
export type Weekday = (typeof Weekday)[keyof typeof Weekday];

/**
 * Which Reclaim flows are allowed to consume a given time scheme.
 */
export const TimeSchemeFeature = {
  TASK_ASSIGNMENT: "TASK_ASSIGNMENT",
  HABIT_ASSIGNMENT: "HABIT_ASSIGNMENT",
  SMART_HABIT: "SMART_HABIT",
  ONE_ON_ONE_ASSIGNMENT: "ONE_ON_ONE_ASSIGNMENT",
  SMART_MEETING: "SMART_MEETING",
  SCHEDULING_LINK_MEETING: "SCHEDULING_LINK_MEETING",
} as const;
export type TimeSchemeFeature =
  (typeof TimeSchemeFeature)[keyof typeof TimeSchemeFeature];

/**
 * Time scheme policy. CUSTOM is required to send custom day-hour intervals;
 * WORK/PERSONAL/MEETING bind the scheme to one of the user's main profiles.
 */
export const PolicyType = {
  CUSTOM: "CUSTOM",
  WORK: "WORK",
  PERSONAL: "PERSONAL",
  MEETING: "MEETING",
} as const;
export type PolicyType = (typeof PolicyType)[keyof typeof PolicyType];

/**
 * Detailed event sub-categorisation as understood by the scheduling engine.
 */
export const EventSubType = {
  ONE_ON_ONE: "ONE_ON_ONE",
  STAFF_MEETING: "STAFF_MEETING",
  OP_REVIEW: "OP_REVIEW",
  EXTERNAL: "EXTERNAL",
  IDEATION: "IDEATION",
  FOCUS: "FOCUS",
  PRODUCTIVITY: "PRODUCTIVITY",
  TRAVEL: "TRAVEL",
  FLIGHT: "FLIGHT",
  TRAIN: "TRAIN",
  RECLAIM: "RECLAIM",
  VACATION: "VACATION",
  HEALTH: "HEALTH",
  ERRAND: "ERRAND",
  OTHER_PERSONAL: "OTHER_PERSONAL",
  UNKNOWN: "UNKNOWN",
} as const;
export type EventSubType = (typeof EventSubType)[keyof typeof EventSubType];

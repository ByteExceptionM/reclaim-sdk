import {
  type EventCategory,
  type PolicyType,
  type TimeSchemeFeature,
  type Weekday,
} from "../enums.js";
import { BaseResource, type JsonObject, type ResourceOptions } from "./base.js";

/**
 * A single contiguous working slot within one weekday. Boundaries are
 * `"HH:MM:SS"` strings interpreted in the user's local time zone; the
 * optional `duration` is filled in by the server and ignored on write.
 */
export interface Interval {
  start: string;
  end: string;
  duration?: number;
}

/**
 * Working intervals for one weekday, plus optional convenience bounds.
 */
export interface DayIntervals {
  intervals: Interval[];
  startOfDay?: string;
  endOfDay?: string;
}

/**
 * Per-weekday breakdown of allowed working times for a time scheme.
 *
 * Map a {@link Weekday} to its {@link DayIntervals}; omit a weekday entry to
 * mark that day completely off-limits for scheduling.
 */
export interface TimeSchemePolicy {
  dayHours: Partial<Record<Weekday, DayIntervals>>;
  startOfWeek?: Weekday;
  endOfWeek?: Weekday;
}

/**
 * Server-resolved calendar object, present on `taskTargetCalendar` reads.
 */
export interface TargetCalendar {
  id?: number;
  [k: string]: unknown;
}

/**
 * Type-only shape for `new Hours({...})` autocomplete.
 */
export interface HoursInit {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  userId?: string;
  taskCategory?: EventCategory;
  policyType?: PolicyType;
  policy?: TimeSchemePolicy;
  features?: TimeSchemeFeature[];
  taskTargetCalendarId?: number;
  taskTargetCalendar?: TargetCalendar;
  created?: string;
  updated?: string;
}

/**
 * A Reclaim **time scheme** — a named working-hours profile (also surfaced
 * as "Hours" in the web UI).
 *
 * Lives at `/api/timeschemes`. Each scheme declares **when** Reclaim is
 * allowed to schedule what — work tasks, meetings, personal habits — by
 * listing the allowed time intervals for each weekday.
 *
 * @example
 * ```ts
 * import { Hours, PolicyType, TimeSchemeFeature, Weekday } from "reclaim-sdk";
 *
 * const workday = { intervals: [{ start: "09:00:00", end: "17:00:00" }] };
 * const scheme = new Hours({
 *   title: "9-5 Mon-Fri",
 *   policyType: PolicyType.CUSTOM,
 *   policy: {
 *     dayHours: {
 *       [Weekday.MONDAY]: workday,
 *       [Weekday.TUESDAY]: workday,
 *       [Weekday.WEDNESDAY]: workday,
 *       [Weekday.THURSDAY]: workday,
 *       [Weekday.FRIDAY]: workday,
 *     },
 *   },
 *   features: [TimeSchemeFeature.TASK_ASSIGNMENT],
 * });
 * await scheme.save();
 * ```
 */
export class Hours extends BaseResource<string> {
  public static readonly ENDPOINT = "/api/timeschemes";

  declare public title?: string;
  declare public description?: string;
  declare public status?: string;
  declare public userId?: string;
  declare public taskCategory?: EventCategory;
  declare public policyType?: PolicyType;
  declare public policy?: TimeSchemePolicy;
  declare public features?: TimeSchemeFeature[];
  declare public taskTargetCalendarId?: number;
  declare public taskTargetCalendar?: TargetCalendar;

  constructor(data: HoursInit & JsonObject = {}, options: ResourceOptions = {}) {
    super(data, options);
    if (this.features === undefined) this.features = [];
  }
}

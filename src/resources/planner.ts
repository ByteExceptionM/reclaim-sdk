import { toZuluIso, type QueryParams } from "../client.js";
import { type SnoozeOption } from "../enums.js";
import { BaseResource } from "./base.js";

/**
 * Path segment used in `/api/planner/<segment>/<id>` — either `"task"` or
 * `"habit"`. Resources that participate in planner actions override this.
 */
export type PlannerPathSegment = "task" | "habit";

/**
 * Common ancestor for resources that expose planner actions via the
 * `/api/planner/*` namespace.
 *
 * `Task` and `DailyHabit` both inherit from this class. Each concrete
 * subclass sets `PLANNER_PATH_SEGMENT` so the same method bodies generate
 * the right URL (`/api/planner/start/task/123` vs `/api/planner/start/habit/45`).
 *
 * Every planner endpoint returns the updated record — often nested under a
 * `taskOrHabit` envelope — which is unwrapped and folded back onto `this`
 * so in-memory state matches the server.
 */
export abstract class PlannerResource<TId = number | string> extends BaseResource<TId> {
  /** Subclasses override — drives `/api/planner/<segment>/...` paths. */
  protected static readonly PLANNER_PATH_SEGMENT: PlannerPathSegment = "task";

  protected _plannerSegment(): PlannerPathSegment {
    return (this.constructor as typeof PlannerResource).PLANNER_PATH_SEGMENT;
  }

  protected async _plannerCall(
    method: "POST" | "DELETE",
    path: string,
    params?: QueryParams,
  ): Promise<void> {
    const response = await this._client.request(method, path, params ? { params } : {});
    this._assignFromResponse(response);
  }

  /**
   * Start working on this task/habit now. Wraps `/api/planner/start/...`.
   */
  public async start(): Promise<void> {
    return this._plannerCall(
      "POST",
      `/api/planner/start/${this._plannerSegment()}/${this.id}`,
    );
  }

  /**
   * Stop the currently running session.
   */
  public async stop(): Promise<void> {
    return this._plannerCall(
      "POST",
      `/api/planner/stop/${this._plannerSegment()}/${this.id}`,
    );
  }

  /**
   * Re-schedule a previously completed/archived item back to active state.
   */
  public async restart(): Promise<void> {
    return this._plannerCall(
      "POST",
      `/api/planner/restart/${this._plannerSegment()}/${this.id}`,
    );
  }

  /**
   * Clear all manual scheduling overrides (snoozes, pinned slots, etc.).
   */
  public async clearExceptions(): Promise<void> {
    return this._plannerCall(
      "POST",
      `/api/planner/clear-exceptions/${this._plannerSegment()}/${this.id}`,
    );
  }

  /**
   * Snooze the item. Provide a preset {@link SnoozeOption} and/or a custom
   * `relativeFrom` reference time.
   */
  public async snooze(options: {
    option?: SnoozeOption;
    relativeFrom?: Date;
  } = {}): Promise<void> {
    const params: QueryParams = {};
    if (options.option) params.snoozeOption = options.option;
    if (options.relativeFrom) params.relativeFrom = toZuluIso(options.relativeFrom);
    return this._plannerCall(
      "POST",
      `/api/planner/${this._plannerSegment()}/${this.id}/snooze`,
      params,
    );
  }

  /**
   * Clear a previously applied snooze.
   */
  public async clearSnooze(): Promise<void> {
    return this._plannerCall(
      "POST",
      `/api/planner/${this._plannerSegment()}/${this.id}/clear-snooze`,
    );
  }

  /**
   * Pin work for this item to a specific date/time slot.
   */
  public async planWork(options: {
    dateTime: Date;
    durationMinutes?: number;
  }): Promise<void> {
    const params: QueryParams = { dateTime: toZuluIso(options.dateTime) };
    if (options.durationMinutes !== undefined) {
      params.durationMinutes = options.durationMinutes;
    }
    return this._plannerCall(
      "POST",
      `/api/planner/plan-work/${this._plannerSegment()}/${this.id}`,
      params,
    );
  }

  /**
   * Mark the item as done. Equivalent to clicking the ✓ in the web app.
   */
  public async markComplete(): Promise<void> {
    return this._plannerCall(
      "POST",
      `/api/planner/done/${this._plannerSegment()}/${this.id}`,
    );
  }

  /**
   * Un-archive / un-complete a previously completed item.
   */
  public async markIncomplete(): Promise<void> {
    return this._plannerCall(
      "POST",
      `/api/planner/unarchive/${this._plannerSegment()}/${this.id}`,
    );
  }

  /**
   * Log time spent on this item.
   *
   * The `end` timestamp (if provided) is sent in Zulu ISO with millisecond
   * precision — the API rejects higher resolution.
   */
  public async logWork(minutes: number, end?: Date): Promise<void> {
    const params: QueryParams = { minutes };
    if (end) params.end = toZuluIso(end);
    return this._plannerCall(
      "POST",
      `/api/planner/log-work/${this._plannerSegment()}/${this.id}`,
      params,
    );
  }
}

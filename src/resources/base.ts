import { ReclaimClient, type QueryParams } from "../client.js";

/**
 * Strategy used by {@link BaseResource.save} when updating an existing record.
 *
 * - `"patch"` (default) sends only the fields you've set: server-side partial update.
 * - `"put"` sends the full resource representation, replacing the record.
 */
export type SaveStrategy = "patch" | "put";

/**
 * Save options for {@link BaseResource.save}.
 */
export interface SaveOptions {
  strategy?: SaveStrategy;
}

/**
 * Constructor options shared by every resource: an optional explicit token
 * (overrides the shared singleton config for this instance) and the option to
 * inject a pre-built {@link ReclaimClient}.
 */
export interface ResourceOptions {
  /** Optional override token — bypasses the shared singleton for this instance. */
  token?: string;
  /** Inject a custom client (useful for tests or multi-tenant code). */
  client?: ReclaimClient;
}

/**
 * Plain JSON object received from / sent to the API.
 */
export type JsonObject = Record<string, unknown>;

/**
 * Narrow an unknown value to a plain (non-array) object.
 */
export function isPlainObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Resolve the {@link ReclaimClient} to use for a class-method call:
 * an explicit `options.client` wins, otherwise the shared singleton.
 */
export function resolveClient(options: ResourceOptions): ReclaimClient {
  return options.client ?? ReclaimClient.getInstance();
}

/**
 * Many planner endpoints return the updated record wrapped in
 * `{ taskOrHabit: <record> }`. Unwrap if present, otherwise pass through.
 * Returns `undefined` for non-object payloads.
 */
export function unwrapTaskOrHabit(response: unknown): JsonObject | undefined {
  if (!isPlainObject(response)) return undefined;
  const inner = response["taskOrHabit"];
  return isPlainObject(inner) ? inner : response;
}

/**
 * Generic CRUD base for every API-backed resource.
 *
 * Subclasses must override {@link BaseResource.ENDPOINT} on the constructor and
 * may declare their fields as plain public properties. Field names are used
 * verbatim in API payloads — match the API's camelCase exactly.
 *
 * Conventions:
 * - `id` is auto-managed: missing means "new", present means "update".
 * - `save()` does `POST` when there's no id, `PATCH` (or `PUT`) when there is.
 * - The response body is folded back into the instance after every write so
 *   server-assigned fields (`id`, `created`, `updated`, …) populate.
 *
 * Note: this file declares fields with the `declare` keyword so no runtime
 * field initialisers run after `super()`. The constructor is the single
 * source of field initialisation, which keeps the class behaviour stable
 * regardless of `useDefineForClassFields` in consumers' tsconfigs.
 */
export abstract class BaseResource<TId = number | string> {
  /** API path for this resource. Override on subclasses. */
  public static readonly ENDPOINT: string = "";

  /** If true, list/get auto-inject the current user's id as `?user=` param. */
  public static readonly USER_PARAM_REQUIRED: boolean = false;

  /** Unique identifier — undefined until the resource is persisted. */
  declare public id?: TId;
  declare public created?: string;
  declare public updated?: string;

  /** @internal */
  protected _client: ReclaimClient;

  constructor(data: JsonObject = {}, options: ResourceOptions = {}) {
    if (options.client) {
      this._client = options.client;
    } else if (options.token) {
      this._client = ReclaimClient.configure({ token: options.token });
    } else {
      this._client = ReclaimClient.getInstance();
    }
    this._assign(data);
  }

  /**
   * Copy an API payload's keys onto this instance. Internal — used by
   * `save()`, `refresh()`, and constructors.
   */
  protected _assign(data: JsonObject): void {
    const self = this as unknown as JsonObject;
    for (const [key, value] of Object.entries(data)) {
      if (key === "client" || key === "_client") continue;
      self[key] = value;
    }
  }

  /**
   * Unwrap a (possibly `taskOrHabit`-wrapped) response and merge it onto
   * `this`. Returns silently if the payload isn't a plain object.
   */
  protected _assignFromResponse(response: unknown): void {
    const payload = unwrapTaskOrHabit(response);
    if (payload) this._assign(payload);
  }

  /**
   * Build the JSON payload sent to the API. Skips undefined values and
   * underscore-prefixed internal fields. Override to customise serialisation.
   */
  public toApiData(): JsonObject {
    const self = this as unknown as JsonObject;
    const out: JsonObject = {};
    for (const key of Object.keys(this)) {
      if (key.startsWith("_")) continue;
      const value = self[key];
      if (value === undefined) continue;
      out[key] = value;
    }
    return out;
  }

  /** Get the {@link ReclaimClient} this resource uses. */
  public get client(): ReclaimClient {
    return this._client;
  }

  /**
   * Reload this resource from the server, overwriting in-memory fields.
   */
  public async refresh(): Promise<void> {
    if (this.id === undefined) {
      throw new Error("Cannot refresh a resource without an ID");
    }
    const ctor = this.constructor as typeof BaseResource;
    const data = await this._client.get<JsonObject>(`${ctor.ENDPOINT}/${this.id}`);
    if (isPlainObject(data)) this._assign(data);
  }

  /**
   * Create (POST) or update (PATCH / PUT) the resource. Response is merged
   * back into this instance so server-assigned fields populate.
   */
  public async save(options: SaveOptions = {}): Promise<void> {
    const ctor = this.constructor as typeof BaseResource;
    const body = this.toApiData();
    let response: unknown;
    if (this.id !== undefined) {
      const path = `${ctor.ENDPOINT}/${this.id}`;
      response =
        options.strategy === "put"
          ? await this._client.put(path, { json: body })
          : await this._client.patch(path, { json: body });
    } else {
      response = await this._client.post(ctor.ENDPOINT, { json: body });
    }
    if (isPlainObject(response)) this._assign(response);
  }

  /**
   * Delete this resource. Resource must have been persisted first.
   */
  public async delete(): Promise<void> {
    if (this.id === undefined) {
      throw new Error("Cannot delete a resource without an ID");
    }
    const ctor = this.constructor as typeof BaseResource;
    await this._client.delete(`${ctor.ENDPOINT}/${this.id}`);
  }

  /**
   * Fetch a single resource by id.
   */
  public static async get<T extends BaseResource>(
    this: new (data?: JsonObject, options?: ResourceOptions) => T,
    id: number | string,
    options: ResourceOptions = {},
  ): Promise<T> {
    const ctor = this as unknown as typeof BaseResource;
    const client = resolveClient(options);
    const params: QueryParams = {};
    if (ctor.USER_PARAM_REQUIRED) {
      const user = await client.currentUser();
      if (typeof user.id === "string" || typeof user.id === "number") {
        params.user = user.id;
      }
    }
    const data = await client.get<JsonObject>(`${ctor.ENDPOINT}/${id}`, { params });
    return new this(data ?? {}, { client });
  }

  /**
   * List all resources, with optional query parameters.
   */
  public static async list<T extends BaseResource>(
    this: new (data?: JsonObject, options?: ResourceOptions) => T,
    params: QueryParams = {},
    options: ResourceOptions = {},
  ): Promise<T[]> {
    const ctor = this as unknown as typeof BaseResource;
    const client = resolveClient(options);
    const finalParams: QueryParams = { ...params };
    if (ctor.USER_PARAM_REQUIRED && finalParams.user === undefined) {
      const user = await client.currentUser();
      if (typeof user.id === "string" || typeof user.id === "number") {
        finalParams.user = user.id;
      }
    }
    const data = await client.get<JsonObject[]>(ctor.ENDPOINT, { params: finalParams });
    return (data ?? []).map((item) => new this(item, { client }));
  }
}

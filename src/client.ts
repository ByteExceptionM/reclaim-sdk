import {
  AuthenticationError,
  InvalidRecord,
  ReclaimAPIError,
  RecordNotFound,
} from "./exceptions.js";

/**
 * Configuration for {@link ReclaimClient}.
 */
export interface ReclaimClientConfig {
  /** Personal API token from https://app.reclaim.ai/settings/developer. */
  token: string;
  /** API base URL. Defaults to https://api.app.reclaim.ai. */
  baseUrl?: string;
  /**
   * Custom fetch implementation. Defaults to `globalThis.fetch` (built-in
   * since Node 18). Useful for testing or to inject `undici`/`node-fetch`.
   */
  fetch?: typeof fetch;
}

/**
 * Value accepted as a query parameter. Arrays produce repeated `?key=v1&key=v2`
 * pairs; `Date` is serialized as Zulu ISO; primitives are stringified.
 */
export type QueryParamValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | Array<string | number | boolean | Date | null | undefined>;

export type QueryParams = Record<string, QueryParamValue>;

export interface RequestOptions {
  params?: QueryParams;
  json?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

const DEFAULT_BASE_URL = "https://api.app.reclaim.ai";

interface CurrentUser {
  id?: string | number;
  [k: string]: unknown;
}

/**
 * Thin singleton wrapper around `fetch` for the Reclaim REST API.
 *
 * Construction is idempotent — `new ReclaimClient()` always returns the
 * shared instance. Configure once with {@link ReclaimClient.configure}
 * or set the `RECLAIM_TOKEN` environment variable.
 *
 * @example
 * ```ts
 * import { ReclaimClient } from "reclaim-sdk";
 *
 * ReclaimClient.configure({ token: "rec_..." });
 * ```
 */
export class ReclaimClient {
  private static _instance: ReclaimClient | null = null;
  private static _config: ReclaimClientConfig | null = null;

  private _userCache: CurrentUser | null = null;
  private readonly _baseUrl: string;
  private readonly _token: string;
  private readonly _fetch: typeof fetch;

  private constructor(config: ReclaimClientConfig) {
    if (!config.token) {
      throw new Error(
        "Reclaim token is required. Use ReclaimClient.configure({ token }) " +
          "or set the RECLAIM_TOKEN environment variable.",
      );
    }
    this._token = config.token;
    this._baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    const fetchImpl = config.fetch ?? (globalThis.fetch as typeof fetch);
    if (!fetchImpl) {
      throw new Error(
        "No `fetch` implementation available. Node 18+ has built-in fetch, " +
          "or pass one via ReclaimClient.configure({ fetch }).",
      );
    }
    this._fetch = fetchImpl.bind(globalThis);
  }

  /**
   * Returns the shared client instance, initialising from the
   * `RECLAIM_TOKEN` env var if not yet configured.
   */
  public static getInstance(): ReclaimClient {
    if (ReclaimClient._instance) return ReclaimClient._instance;
    const config =
      ReclaimClient._config ??
      ({
        token: ReclaimClient._readTokenFromEnv(),
      } as ReclaimClientConfig);
    ReclaimClient._instance = new ReclaimClient(config);
    return ReclaimClient._instance;
  }

  /**
   * Configure (or reconfigure) the shared client. Subsequent calls overwrite
   * the previous configuration and reset the cached current-user lookup.
   */
  public static configure(config: ReclaimClientConfig): ReclaimClient {
    ReclaimClient._config = config;
    ReclaimClient._instance = new ReclaimClient(config);
    return ReclaimClient._instance;
  }

  /** Drop the singleton — useful in tests. */
  public static reset(): void {
    ReclaimClient._instance = null;
    ReclaimClient._config = null;
  }

  private static _readTokenFromEnv(): string {
    const token =
      typeof process !== "undefined" ? process.env?.RECLAIM_TOKEN : undefined;
    if (!token) {
      throw new Error(
        "Reclaim token is required. Use ReclaimClient.configure({ token }) " +
          "or set the RECLAIM_TOKEN environment variable.",
      );
    }
    return token;
  }

  /**
   * Generic request — translates JSON bodies, query params, and HTTP errors.
   *
   * @returns Parsed JSON response, `null` for empty bodies, or `{}` for
   *   `DELETE` returning 204/200 with empty body.
   */
  public async request<T = unknown>(
    method: string,
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this._buildUrl(endpoint, options.params);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this._token}`,
      Accept: "application/json",
      ...(options.headers ?? {}),
    };

    let body: string | undefined;
    if (options.json !== undefined) {
      body = JSON.stringify(options.json, jsonReplacer);
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await this._fetch(url, {
        method: method.toUpperCase(),
        headers,
        body,
        signal: options.signal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ReclaimAPIError(`Request failed: ${message}`);
    }

    if (!response.ok) {
      const text = await safeReadText(response);
      const errorBody = tryParseJson(text);
      const message = extractErrorMessage(errorBody, text, response.status);
      throwHttpError(response.status, endpoint, message, errorBody ?? text);
    }

    const upperMethod = method.toUpperCase();
    if (upperMethod === "DELETE" && (response.status === 204 || response.status === 200)) {
      const text = await safeReadText(response);
      if (!text) return {} as T;
      return (tryParseJson(text) as T) ?? ({} as T);
    }

    if (response.status === 204) return null as T;

    const text = await safeReadText(response);
    if (!text) return null as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ReclaimAPIError("Invalid JSON response from API");
    }
  }

  public get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", endpoint, options);
  }

  public post<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", endpoint, options);
  }

  public put<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", endpoint, options);
  }

  public patch<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", endpoint, options);
  }

  public delete<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", endpoint, options);
  }

  /**
   * `GET /api/users/current`, cached for the lifetime of this client.
   */
  public async currentUser(): Promise<CurrentUser> {
    if (this._userCache !== null) return this._userCache;
    const data = await this.get<CurrentUser>("/api/users/current");
    this._userCache = data ?? {};
    return this._userCache;
  }

  private _buildUrl(endpoint: string, params?: QueryParams): string {
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    let url = `${this._baseUrl}${path}`;
    if (!params) return url;
    const search = encodeQueryParams(params);
    if (search) url += (url.includes("?") ? "&" : "?") + search;
    return url;
  }
}

/**
 * Extract a human-readable error message from a JSON error body, falling
 * back to the raw response text and finally to `HTTP <status>`.
 */
function extractErrorMessage(body: unknown, fallbackText: string, status: number): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as { message?: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return fallbackText || `HTTP ${status}`;
}

function throwHttpError(
  status: number,
  endpoint: string,
  message: string,
  body: unknown,
): never {
  switch (status) {
    case 401:
      throw new AuthenticationError(`Authentication failed: ${message}`, status, body);
    case 404:
      throw new RecordNotFound(`Resource not found: ${endpoint}`, status, body);
    case 400:
    case 422:
      throw new InvalidRecord(`Invalid data: ${message}`, status, body);
    default:
      throw new ReclaimAPIError(`API error: ${message}`, status, body);
  }
}

/**
 * Encode a {@link QueryParams} record into a URL-safe query string.
 *
 * - Arrays produce repeated keys (`?ids=1&ids=2`), matching how the Reclaim
 *   API expects multi-value query params.
 * - `Date` is serialized as Zulu ISO.
 * - `null` / `undefined` values are skipped.
 */
export function encodeQueryParams(params: QueryParams): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (item === null || item === undefined) continue;
      usp.append(key, item instanceof Date ? toZuluIso(item) : String(item));
    }
  }
  return usp.toString();
}

/**
 * `Date` → `2026-05-12T19:00:00.000Z` (always UTC, millisecond precision).
 */
export function toZuluIso(d: Date): string {
  return d.toISOString();
}

/**
 * `JSON.stringify` replacer that serializes `Date` values as Zulu ISO.
 */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) return toZuluIso(value);
  return value;
}

async function safeReadText(r: Response): Promise<string> {
  try {
    return await r.text();
  } catch {
    return "";
  }
}

function tryParseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

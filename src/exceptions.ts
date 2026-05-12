/**
 * Base exception thrown for any error returned by the Reclaim API.
 *
 * Specific subclasses are thrown for well-known HTTP status codes:
 *   - 401 → AuthenticationError
 *   - 404 → RecordNotFound
 *   - 400 / 422 → InvalidRecord
 *   - Anything else → ReclaimAPIError
 *
 * For webhook signature mismatches, see SignatureVerificationError.
 */
export class ReclaimAPIError extends Error {
  public readonly status?: number;
  public readonly body?: unknown;

  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = "ReclaimAPIError";
    this.status = status;
    this.body = body;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RecordNotFound extends ReclaimAPIError {
  constructor(message: string, status?: number, body?: unknown) {
    super(message, status, body);
    this.name = "RecordNotFound";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidRecord extends ReclaimAPIError {
  constructor(message: string, status?: number, body?: unknown) {
    super(message, status, body);
    this.name = "InvalidRecord";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends ReclaimAPIError {
  constructor(message: string, status?: number, body?: unknown) {
    super(message, status, body);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SignatureVerificationError extends ReclaimAPIError {
  constructor(message: string) {
    super(message);
    this.name = "SignatureVerificationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

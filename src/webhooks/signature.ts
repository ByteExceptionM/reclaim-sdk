import { createHmac, timingSafeEqual } from "node:crypto";
import { SignatureVerificationError } from "../exceptions.js";

/**
 * Verify a Reclaim webhook signature against the raw request body.
 *
 * Assumes the signature header carries a hex-encoded HMAC-SHA256 of the raw
 * request body, signed with the subscriber's shared secret. If a future
 * version of Reclaim's webhook system uses a different scheme, replace this
 * function's body — the call sites won't need to change.
 *
 * **Critical:** pass the *raw* request body, not the parsed JSON. Re-serializing
 * JSON changes whitespace and breaks the digest. In Express, use
 * `express.raw({ type: "application/json" })` and pass `req.body` (a Buffer).
 *
 * @param body   Raw request body as a Buffer / Uint8Array / string.
 * @param header Value of the signature header sent by Reclaim.
 * @param secret The shared secret you configured when creating the webhook.
 * @returns `true` on success.
 * @throws  {@link SignatureVerificationError} on any mismatch.
 *
 * @example
 * ```ts
 * import { verifySignature } from "reclaim-sdk";
 *
 * verifySignature(req.body, req.header("X-Reclaim-Signature")!, MY_SECRET);
 * ```
 */
export function verifySignature(
  body: Buffer | Uint8Array | string,
  header: string | null | undefined,
  secret: string,
): boolean {
  if (!header) {
    throw new SignatureVerificationError("empty signature header");
  }
  const buf =
    typeof body === "string"
      ? Buffer.from(body, "utf8")
      : Buffer.isBuffer(body)
        ? body
        : Buffer.from(body);
  const expected = createHmac("sha256", secret).update(buf).digest("hex");
  const provided = Buffer.from(header, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (provided.length !== expectedBuf.length) {
    throw new SignatureVerificationError("signature mismatch");
  }
  if (!timingSafeEqual(provided, expectedBuf)) {
    throw new SignatureVerificationError("signature mismatch");
  }
  return true;
}

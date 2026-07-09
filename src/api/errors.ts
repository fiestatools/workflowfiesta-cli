/**
 * Error taxonomy for backend communication. Callers can branch on these
 * classes (via `instanceof`) to produce accurate, user-facing messages
 * without parsing strings.
 */

/** A non-2xx HTTP response from the backend. */
export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status code of the failing response. */
    readonly status: number,
    /** Parsed response body, when one was returned. */
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * A 401 response — the access token is missing, invalid, expired, or revoked.
 * A dedicated subclass so the auth layer can react (clear the stored token and
 * prompt the user to sign in again).
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', body?: unknown) {
    super(message, 401, body);
    this.name = 'UnauthorizedError';
  }
}

/**
 * A transport-level failure: the request never produced an HTTP response
 * (DNS/connection error, TLS failure, or a client-side timeout/abort).
 */
export class NetworkError extends Error {
  /** Underlying cause (the original `fetch` rejection or abort reason). */
  readonly originalCause?: unknown;

  constructor(
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'NetworkError';
    this.originalCause = cause;
  }
}

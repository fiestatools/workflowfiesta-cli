/**
 * Supplies the bearer token for outgoing requests. Implemented by
 * `AuthService`; declared as an interface so `ApiClient` depends only on the
 * capability it needs (and can be unit-tested with a stub).
 */
export interface TokenProvider {
  /** Resolves to the current access token, or `undefined` when signed out. */
  getToken(): Promise<string | undefined>;
}

/** HTTP methods the client supports. */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Query string values; `undefined` entries are omitted. */
export type QueryParams = Record<string, string | number | boolean | undefined>;

/** Options for a single {@link ApiClient.request} call. */
export interface RequestOptions {
  method?: HttpMethod;
  /** JSON-serializable request body. Sets `Content-Type: application/json`. */
  body?: unknown;
  /** Query parameters appended to the URL. */
  query?: QueryParams;
  /** Caller-provided cancellation signal, combined with the internal timeout. */
  signal?: AbortSignal;
  /** Overrides the configured timeout for this request only. */
  timeoutMs?: number;
  /**
   * Explicit bearer token, used instead of the {@link TokenProvider}.
   *
   * Intended for validating a *candidate* token before it is stored (sign-in).
   * When set, a 401 does NOT invoke the unauthorized handler, because there is
   * no stored session to invalidate — the caller interprets the failure.
   */
  token?: string;
}

/**
 * Endpoint used to validate a candidate access token.
 *
 * `/external/me` is a purpose-built identity endpoint on the bearer-guarded
 * `/external/*` API: it returns 200 with the caller's org/token identity for a
 * valid token and 401 for an invalid one, with no domain-data serialization.
 */
export const VALIDATION_ENDPOINT = '/external/me'

/** Interval between browser-auth approval status polls. */
export const CLI_AUTH_POLL_INTERVAL_MS = 2_000

/** Maximum number of browser-auth status polls before timing out. */
export const CLI_AUTH_MAX_ATTEMPTS = 150

/**
 * Shape of an assembled access token: `<prefix>_<32-hex uid>.<hex secret>`
 * (see the backend `assembleSecretKey`). Checked client-side so malformed input
 * is rejected before it reaches the backend.
 */
export const ACCESS_TOKEN_PATTERN = /^[a-z0-9]+_[0-9a-f]{32}\.[0-9a-f]{16,}$/i

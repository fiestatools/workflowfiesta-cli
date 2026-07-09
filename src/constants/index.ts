/**
 * Shared named constants for the CLI.
 *
 * Behavioral/config values that would otherwise be magic numbers live here so
 * they're discoverable and tunable in one place (per the project standards).
 */

/** How often to poll a parked OAuth request for resolution (milliseconds). */
export const OAUTH_POLL_INTERVAL_MS = 2_000

/**
 * Maximum OAuth poll attempts before giving up — roughly five minutes at
 * {@link OAUTH_POLL_INTERVAL_MS}. Caps the timer so a request the user never
 * completes can't leak it.
 */
export const OAUTH_POLL_MAX_ATTEMPTS = 150

/** Maximum length of a conversation title derived from its first message. */
export const CONVERSATION_TITLE_MAX_LENGTH = 60

/** Most recent conversations retained in the local history index. */
export const MAX_STORED_CONVERSATIONS = 50

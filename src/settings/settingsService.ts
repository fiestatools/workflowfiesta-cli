import type { ApiClient } from '../api'

/** Shape returned by `GET /external/me`. */
interface MeResponse {
  orgId: string
  /** Added in a later backend version; absent when talking to an older server. */
  orgName?: string | null
  defaultAgentId: string | null
  /** Added in a later backend version; absent when talking to an older server. */
  user?: { email: string, name: string | null } | null
  token: {
    uid: string
    name: string
    expiresAt: string
  }
}

/**
 * The caller's identity behind the current access token, for the settings
 * account section.
 */
export interface Identity {
  /** Org (tenant) the token is scoped to — a UID. */
  orgId: string
  /** Human-friendly org name, or `null` when the server doesn't provide it. */
  orgName: string | null
  /** Account default agent (used when no local pin is set). */
  defaultAgentId: string | null
  /** Email of the human who created the token, or `null` when unavailable. */
  userEmail: string | null
  /** Full name of the token creator, or `null` when unavailable. */
  userName: string | null
  /** Human-friendly name of the access token in use. */
  tokenName: string
  /** ISO-8601 token expiry, or empty string when unknown. */
  tokenExpiresAt: string
}

/**
 * Fetches settings-related identity data from the bearer-guarded `/external`
 * API. Kept separate from {@link AgentRunService} so the settings panel doesn't
 * depend on the run pipeline.
 */
export class SettingsService {
  constructor(private readonly api: ApiClient) {}

  /** Resolve the caller's org, default agent, and token identity. */
  async getIdentity(): Promise<Identity> {
    const me = await this.api.get<MeResponse>('/external/me')
    return {
      orgId: me.orgId,
      orgName: me.orgName ?? null,
      defaultAgentId: me.defaultAgentId ?? null,
      userEmail: me.user?.email ?? null,
      userName: me.user?.name ?? null,
      tokenName: me.token?.name ?? '',
      tokenExpiresAt: me.token?.expiresAt ?? '',
    }
  }
}

import type { ApiClient } from '../api'

interface MeResponse {
  orgId: string
  orgName?: string | null
  defaultAgentId: string | null
  user?: { email: string, name: string | null } | null
  token: {
    uid: string
    name: string
    expiresAt: string
  }
}

export type ProviderType = 'anthropic' | 'aws_bedrock' | 'openai' | 'ollama'

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  anthropic: 'Anthropic',
  aws_bedrock: 'AWS Bedrock',
  openai: 'OpenAI',
  ollama: 'Ollama',
}

export interface ProviderSummary {
  uid: string
  name: string
  type: ProviderType
  isDefault: boolean
}

export interface AnthropicProviderConfig {
  type: 'anthropic'
  name: string
  apiKey: string
}

export interface OpenAIProviderConfig {
  type: 'openai'
  name: string
  apiKey: string
  /** Optional base URL for proxies or Azure OpenAI */
  baseUrl?: string
}

export interface AWSBedrockProviderConfig {
  type: 'aws_bedrock'
  name: string
  region: string
  accessKeyId: string
  secretAccessKey: string
}

export interface OllamaProviderConfig {
  type: 'ollama'
  name: string
  /** Base URL, e.g. http://localhost:11434 */
  baseUrl: string
}

export type CreateProviderConfig
  = | AnthropicProviderConfig
    | OpenAIProviderConfig
    | AWSBedrockProviderConfig
    | OllamaProviderConfig

export interface Identity {
  orgId: string
  orgName: string | null
  defaultAgentId: string | null
  userEmail: string | null
  userName: string | null
  tokenName: string
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

  async listProviders(): Promise<ProviderSummary[]> {
    return this.api.get<ProviderSummary[]>('/external/providers')
  }

  async setDefaultProvider(providerId: string): Promise<void> {
    await this.api.post(`/external/providers/${providerId}/set-default`)
  }

  async createProvider(config: CreateProviderConfig): Promise<ProviderSummary> {
    return this.api.post<ProviderSummary>('/external/providers', { body: config })
  }
}

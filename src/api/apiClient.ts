import type { QueryParams, RequestOptions, TokenProvider } from './types'
import { logger } from '../logger'
import { ApiError, NetworkError, UnauthorizedError } from './errors'

/** Construction dependencies for {@link ApiClient}. */
export interface ApiClientOptions {
  /** Returns the backend base URL (no trailing slash), read fresh per request. */
  getBaseUrl: () => string | Promise<string>
  /** Returns the default request timeout in milliseconds. */
  getTimeoutMs: () => number
  /** Source of the bearer token for authenticated requests. */
  tokenProvider: TokenProvider
  /**
   * Invoked when a request made with the *stored* token receives a 401.
   * Signals that the session is no longer valid (expired/revoked). Not called
   * for requests that pass an explicit `token` override.
   */
  onUnauthorized?: () => void
}

/**
 * Thin, dependency-free HTTP client for the WorkflowFiesta backend.
 *
 * Responsibilities are deliberately narrow: URL building, bearer auth,
 * JSON (de)serialization, timeouts, and mapping responses to the typed error
 * classes in `./errors`. It holds no session state — the token is pulled from
 * the injected {@link TokenProvider} on every call, so it always reflects the
 * latest sign-in/sign-out.
 */
export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  /** GET convenience wrapper. */
  get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  /** POST convenience wrapper. */
  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body })
  }

  /** PATCH convenience wrapper. */
  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body })
  }

  /** PUT convenience wrapper. */
  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body })
  }

  /** DELETE convenience wrapper. */
  delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }

  /**
   * Perform an HTTP request and decode the JSON response.
   *
   * @throws {UnauthorizedError} on 401
   * @throws {ApiError} on any other non-2xx response
   * @throws {NetworkError} when no response is received (timeout / transport error)
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, query, signal, timeoutMs, token } = options

    const url = await this.buildUrl(path, query)
    const usingStoredToken = token === undefined
    const authToken = token ?? (await this.options.tokenProvider.getToken())

    const headers: Record<string, string> = { Accept: 'application/json' }
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`
    }

    let payload: string | undefined
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }

    const response = await this.fetchWithTimeout(url, path, {
      method,
      headers,
      body: payload,
      signal,
      timeoutMs: timeoutMs ?? this.options.getTimeoutMs(),
    })

    return this.parseResponse<T>(path, response, usingStoredToken)
  }

  /** Join the base URL, path, and query into an absolute URL. */
  private async buildUrl(path: string, query?: QueryParams): Promise<string> {
    const base = await this.options.getBaseUrl()
    logger.debug('API request', { base, path })
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = new URL(`${base}${normalizedPath}`)

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value))
        }
      }
    }

    return url.toString()
  }

  /**
   * `fetch` wrapped with a timeout that also honors a caller-provided signal.
   * Any failure to obtain a response is normalized to {@link NetworkError}.
   */
  private async fetchWithTimeout(
    url: string,
    path: string,
    init: {
      method: string
      headers: Record<string, string>
      body?: string
      signal?: AbortSignal
      timeoutMs: number
    },
  ): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), init.timeoutMs)

    const { signal: callerSignal } = init
    const forwardAbort = () => controller.abort()
    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort()
      }
      else {
        callerSignal.addEventListener('abort', forwardAbort, { once: true })
      }
    }

    try {
      return await fetch(url, {
        method: init.method,
        headers: init.headers,
        body: init.body,
        signal: controller.signal,
      })
    }
    catch (err) {
      // Distinguish an internal timeout from a caller-initiated cancellation.
      if (controller.signal.aborted && !callerSignal?.aborted) {
        throw new NetworkError(`Request to ${path} timed out after ${init.timeoutMs}ms`, err)
      }
      throw new NetworkError(`Request to ${path} failed`, err)
    }
    finally {
      clearTimeout(timeout)
      callerSignal?.removeEventListener('abort', forwardAbort)
    }
  }

  /** Decode a response body and translate non-2xx statuses into typed errors. */
  private async parseResponse<T>(
    path: string,
    response: Response,
    usingStoredToken: boolean,
  ): Promise<T> {
    if (response.status === 204) {
      return undefined as T
    }

    const data = await this.readBody(response)

    if (response.ok) {
      logger.debug('API response ok', { path, status: response.status })
      return data as T
    }

    logger.debug('API response error', { path, status: response.status })

    if (response.status === 401) {
      // Only invalidate the session for requests made with the stored token.
      if (usingStoredToken) {
        this.options.onUnauthorized?.()
      }
      throw new UnauthorizedError(this.extractErrorMessage(data) ?? 'Authentication failed', data)
    }

    const message
      = this.extractErrorMessage(data) ?? `Request to ${path} failed with status ${response.status}`
    throw new ApiError(message, response.status, data)
  }

  /** Parse the body as JSON when possible, otherwise return raw text. */
  private async readBody(response: Response): Promise<unknown> {
    const text = await response.text()
    if (!text) {
      return undefined
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(text)
      }
      catch {
        return text
      }
    }

    return text
  }

  /** Pull a human-readable message out of a JSON error body, if present. */
  private extractErrorMessage(data: unknown): string | undefined {
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>
      const candidate = record.error ?? record.message
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate
      }
    }
    return undefined
  }
}

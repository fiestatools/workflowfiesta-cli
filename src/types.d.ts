/**
 * Type declarations for the CLI.
 */

// Build-time constants
declare const WF_VERSION: string
declare const WF_CLI_NAME: string

// React JSX intrinsic elements for OpenTUI
declare namespace JSX {
  interface IntrinsicElements {
    'box': Record<string, unknown>
    'text': Record<string, unknown>
    'ascii-font': Record<string, unknown>
  }
}

// Extend process.env with expected environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    /** WorkflowFiesta API base URL override. */
    WORKFLOWFIESTA_API_URL?: string
    /** WorkflowFiesta access token override. */
    WORKFLOWFIESTA_TOKEN?: string
    /** Enable debug logging. */
    DEBUG?: string
  }
}

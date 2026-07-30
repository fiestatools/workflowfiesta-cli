export interface RunOptions {
  agent?: string
  continue?: boolean
  session?: string
  /** Copy the final assistant response to the clipboard before exiting. */
  copy?: boolean
}

export interface SessionInfo {
  uid: string
  title?: string
  agentId?: string
}

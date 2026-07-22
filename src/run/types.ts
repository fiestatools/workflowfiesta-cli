export interface RunOptions {
  agent?: string
  continue?: boolean
  session?: string
}

export interface SessionInfo {
  uid: string
  title?: string
  agentId?: string
}

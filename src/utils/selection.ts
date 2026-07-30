import type { CliRenderer } from '@opentui/core'
import { copyToClipboard } from './clipboard'

export async function copySelection(renderer: CliRenderer): Promise<boolean> {
  const selection = renderer.getSelection()
  if (!selection) {
    return false
  }

  const text = selection.getSelectedText()
  if (!text) {
    return false
  }

  const ok = await copyToClipboard(text)
  renderer.clearSelection()
  return ok
}

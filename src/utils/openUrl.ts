import open from 'open';
import { logger } from '../logger';

/**
 * Open a URL in the user's default browser.
 *
 * Delegates to the `open` package, which handles the platform matrix (macOS,
 * Windows, Linux, WSL, and headless fallbacks). Best-effort and never throws —
 * a failure is logged and reported so callers can fall back to showing the raw
 * URL for manual copying.
 *
 * @returns `true` if the browser launcher was spawned, `false` otherwise.
 */
export async function openUrl(url: string): Promise<boolean> {
  try {
    await open(url);
    return true;
  } catch (err) {
    logger.warn(`Failed to open URL in browser: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

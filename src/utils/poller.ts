import { logger } from '../logger';

/** Handle to a running poll; `stop()` is idempotent. */
export interface PollHandle {
  stop(): void;
}

/** Options for {@link startPolling}. */
export interface PollOptions {
  /** Delay between attempts, in milliseconds. */
  intervalMs: number;
  /** Give up after this many attempts. */
  maxAttempts: number;
  /**
   * One poll attempt. Resolve `true` to stop (the condition is met), `false` to
   * keep polling. Thrown errors are treated as transient — logged at debug and
   * polling continues until the attempt cap.
   */
  onTick: () => Promise<boolean>;
  /** Invoked once if the attempt cap is reached without `onTick` returning true. */
  onExhausted?: () => void;
}

/**
 * Poll an async condition on a fixed interval until it succeeds or the attempt
 * cap is hit. Returns a handle to stop early. The interval never overlaps: a
 * tick that's still running is awaited before its result is applied, and a
 * `stop()` mid-tick prevents any late side effects.
 */
export function startPolling({ intervalMs, maxAttempts, onTick, onExhausted }: PollOptions): PollHandle {
  let attempts = 0;
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const stop = (): void => {
    stopped = true;
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  timer = setInterval(() => {
    void (async () => {
      if (stopped) return;
      attempts += 1;
      try {
        if (await onTick()) {
          stop();
          return;
        }
      } catch (err) {
        logger.debug(`poll tick failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (!stopped && attempts >= maxAttempts) {
        stop();
        onExhausted?.();
      }
    })();
  }, intervalMs);

  return { stop };
}

import { TextAttributes } from '@opentui/core';
import type { RunEvent } from '../runs/runEvents';
import { foldToolEvents, groupTimeline, type ToolRound, type TimelineGroup } from '../runs';
import { themeColors } from '../theme';

/** Props for the tool activity timeline. */
export interface ToolActivityProps {
  toolEvents: RunEvent[];
}

const INPUT_VALUE_LIMIT = 200;
const RESULT_CHAR_LIMIT = 300;
const RESULT_LINE_LIMIT = 4;

function truncate(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

/** One-line rendering of a tool-input value. */
function formatInputValue(value: unknown): string {
  if (typeof value === 'string') return truncate(value, INPUT_VALUE_LIMIT);
  if (Array.isArray(value) && value.every((v) => typeof v !== 'object' || v === null)) {
    return truncate(value.map((v) => String(v)).join(', '), INPUT_VALUE_LIMIT);
  }
  try {
    return truncate(JSON.stringify(value), INPUT_VALUE_LIMIT);
  } catch {
    return String(value);
  }
}

/** Result content clipped to a few lines / chars, returned line-by-line. */
function resultLines(result: unknown): string[] {
  let text: string;
  if (typeof result === 'string') {
    text = result;
  } else {
    try {
      text = JSON.stringify(result, null, 2);
    } catch {
      text = String(result);
    }
  }
  const allLines = text.trim().split('\n');
  const lines = allLines.slice(0, RESULT_LINE_LIMIT).map((line) => truncate(line, RESULT_CHAR_LIMIT));
  if (allLines.length > RESULT_LINE_LIMIT) {
    lines.push(`… (+${allLines.length - RESULT_LINE_LIMIT} more lines)`);
  }
  return lines;
}

/** Status pill text + color for a group of rounds. */
function groupStatus(rounds: ToolRound[]): { text: string; color: string } {
  if (rounds.some((r) => r.status === 'running')) {
    const progress = [...rounds].reverse().find((r) => r.status === 'running' && r.progress)?.progress;
    return { text: `${progress ?? 'Working…'}`, color: themeColors.warning };
  }
  if (rounds.some((r) => r.isError)) return { text: '✗ Error', color: themeColors.error };
  return { text: '✓ Done', color: themeColors.success };
}

/** Render a single tool round's input params and result. */
function Round({ round, index, showIndex }: { round: ToolRound; index: number; showIndex: boolean }) {
  const inputEntries = round.input ? Object.entries(round.input) : [];
  const hasResult = round.result !== null && round.result !== undefined;

  return (
    <box flexDirection="column" paddingLeft={2}>
      {showIndex && (
        <text fg={themeColors.textSubtle} attributes={TextAttributes.DIM}>#{index + 1}</text>
      )}
      {inputEntries.map(([key, value]) => (
        <text key={key} attributes={TextAttributes.DIM}>
          <span fg={themeColors.textMuted}>{key}: </span>
          <span fg={themeColors.text}>{formatInputValue(value)}</span>
        </text>
      ))}
      {hasResult ? (
        resultLines(round.result).map((line, i) => (
          <text key={i} attributes={TextAttributes.DIM}>
            <span fg={round.isError ? themeColors.error : themeColors.textSubtle}>{i === 0 ? '→ ' : '  '}</span>
            <span fg={round.isError ? themeColors.error : themeColors.textMuted}>{line}</span>
          </text>
        ))
      ) : round.status === 'running' ? (
        <text attributes={TextAttributes.DIM}>
          <span fg={themeColors.textSubtle}>{round.progress ?? 'Running…'}</span>
        </text>
      ) : null}
    </box>
  );
}

/** Render one grouped tool (with count) or a thinking block. */
function Group({ group }: { group: TimelineGroup }) {
  if (group.kind === 'thinking') {
    const label = group.item.streaming ? 'Thinking…' : 'Thought for a moment';
    // Collapse reasoning to a one-line snippet (first non-empty line) so it stays
    // a compact, secondary cue — the full text isn't the point of the timeline.
    const snippet = group.item.thinking
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    return (
      <box flexDirection="column" marginBottom={1}>
        <text attributes={TextAttributes.DIM}>
          <span fg={themeColors.tool}>{label}</span>
        </text>
        {snippet && (
          <box paddingLeft={2}>
            <text fg={themeColors.textSubtle} attributes={TextAttributes.DIM}>
              {truncate(snippet, RESULT_CHAR_LIMIT)}
            </text>
          </box>
        )}
      </box>
    );
  }

  const { text: statusText, color: statusColor } = groupStatus(group.rounds);
  const showIndex = group.rounds.length > 1;
  const hasDetail = group.rounds.some(
    (r) => r.input !== null || (r.result !== null && r.result !== undefined) || r.status === 'running',
  );

  return (
    <box flexDirection="column" marginBottom={1}>
      <text>
        <span fg={themeColors.text} attributes={TextAttributes.BOLD}>{group.label}</span>
        {group.rounds.length > 1 && <span fg={themeColors.textSubtle}> ×{group.rounds.length}</span>}
        <span fg={statusColor}>  {statusText}</span>
      </text>
      {hasDetail &&
        group.rounds.map((round, i) => (
          <Round key={round.eventUid ?? i} round={round} index={i} showIndex={showIndex} />
        ))}
    </box>
  );
}

/**
 * Renders the tool/thinking timeline for a turn, folded from the raw run events
 * (mirrors the web and extension: tool calls with their input and result, shown
 * above the assistant's final text).
 */
export function ToolActivity({ toolEvents }: ToolActivityProps) {
  const groups = groupTimeline(foldToolEvents(toolEvents));
  if (groups.length === 0) return null;

  return (
    <box flexDirection="column">
      {groups.map((group, i) => (
        <Group key={i} group={group} />
      ))}
    </box>
  );
}

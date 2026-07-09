import type { RunEvent } from './runEvents';

/**
 * Folds the flat stream of run events (`tool_call`, `tool_result`, `thinking`, …)
 * into a render-ready timeline, mirroring the extension's `toolActivity` model.
 *
 * The backend re-emits tool calls under the same `uid` via `run:event:update`
 * (e.g. once the parsed input or result is known), so calls are upserted by
 * `eventUid` rather than appended, and results are linked back to their call by
 * `toolCallEventId`. The output is then grouped so consecutive same-tool calls
 * collapse into one "Web Search ×3" row.
 */

/** A single tool call/round in the timeline. */
export interface ToolRound {
  kind: 'tool';
  eventUid?: string;
  /** Raw tool name (e.g. `web_search`). */
  name: string;
  /** Human label (e.g. `Web Search`). */
  label: string;
  status: 'running' | 'done';
  input: Record<string, unknown> | null;
  result: unknown;
  isError: boolean;
  progress?: string;
}

/** A reasoning block in the timeline. */
export interface ThinkingRound {
  kind: 'thinking';
  eventUid?: string;
  thinking: string;
  streaming: boolean;
}

export type TimelineItem = ToolRound | ThinkingRound;

/** A group of consecutive same-tool rounds (or a standalone thinking block). */
export type TimelineGroup =
  | { kind: 'tool'; name: string; label: string; rounds: ToolRound[] }
  | { kind: 'thinking'; item: ThinkingRound };

function str(content: Record<string, unknown>, key: string): string | undefined {
  const value = content[key];
  return typeof value === 'string' ? value : undefined;
}

/** Normalize a raw tool name; blank/non-string falls back to `tool`. */
function toolName(name: unknown): string {
  return typeof name === 'string' && name ? name : 'tool';
}

/** Turn a raw tool name (`run_bash`) into a readable label (`Run Bash`). */
export function toolLabel(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function doneRound(label: string, result?: unknown): ToolRound {
  return {
    kind: 'tool',
    name: label,
    label,
    status: 'done',
    input: null,
    result: result ?? null,
    isError: false,
  };
}

/** Fold raw run events into an ordered timeline of tool rounds and thinking blocks. */
export function foldToolEvents(events: RunEvent[]): TimelineItem[] {
  const items: TimelineItem[] = [];

  const findRoundForResult = (content: Record<string, unknown>): ToolRound | undefined => {
    const linkId = str(content, 'toolCallEventId');
    if (linkId) {
      const byId = items.find(
        (t): t is ToolRound => t.kind === 'tool' && t.eventUid === linkId,
      );
      if (byId) return byId;
    }
    const name = toolName(content.toolName);
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i]!;
      if (item.kind === 'tool' && item.status === 'running' && item.name === name) {
        return item;
      }
    }
    return undefined;
  };

  for (const event of events) {
    const content = event.content ?? {};
    switch (event.eventType) {
      case 'thinking': {
        const text = str(content, 'thinking') ?? '';
        const streaming = content.streaming === true;
        const existing = items.find(
          (t): t is ThinkingRound => t.kind === 'thinking' && t.eventUid === event.uid,
        );
        if (existing) {
          existing.thinking = text;
          existing.streaming = streaming;
        } else {
          items.push({ kind: 'thinking', eventUid: event.uid, thinking: text, streaming });
        }
        break;
      }
      case 'tool_call': {
        const name = toolName(content.toolName);
        const existing = event.uid
          ? items.find((t): t is ToolRound => t.kind === 'tool' && t.eventUid === event.uid)
          : undefined;
        if (existing) {
          existing.name = name;
          existing.label = toolLabel(name);
          if (content.toolInput) {
            existing.input = content.toolInput as Record<string, unknown>;
          }
          if (content.result !== undefined && content.result !== null) {
            existing.status = 'done';
            existing.result = content.result;
            existing.isError = content.status === 'incomplete' || content.isError === true;
          }
          break;
        }
        items.push({
          kind: 'tool',
          eventUid: event.uid,
          name,
          label: toolLabel(name),
          status: 'running',
          input: (content.toolInput as Record<string, unknown>) ?? null,
          result: null,
          isError: false,
        });
        break;
      }
      case 'tool_result': {
        const round = findRoundForResult(content);
        if (round) {
          round.status = 'done';
          round.result = content.result;
          round.isError = content.isError === true;
        } else {
          const name = toolName(content.toolName);
          const item = doneRound(toolLabel(name), content.result);
          item.name = name;
          item.isError = content.isError === true;
          items.push(item);
        }
        break;
      }
      case 'tool_progress': {
        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i]!;
          if (item.kind === 'tool' && item.status === 'running') {
            const message = str(content, 'message');
            if (message) item.progress = message;
            break;
          }
        }
        break;
      }
      case 'skill_invoked':
        items.push(doneRound(toolLabel(str(content, 'skillName') ?? str(content, 'toolName') ?? 'Skill')));
        break;
      case 'script_executed':
        items.push(doneRound('Ran a script'));
        break;
      case 'sub_agent_spawned':
        items.push(doneRound(`Delegated to ${str(content, 'agentName') ?? 'a sub-agent'}`));
        break;
      // `text` and `error` are handled elsewhere, not in the tool timeline.
    }
  }

  return items;
}

/** Collapse consecutive same-tool rounds into groups; thinking blocks stand alone. */
export function groupTimeline(items: TimelineItem[]): TimelineGroup[] {
  const groups: TimelineGroup[] = [];
  for (const item of items) {
    if (item.kind === 'thinking') {
      groups.push({ kind: 'thinking', item });
      continue;
    }
    const last = groups[groups.length - 1];
    if (last && last.kind === 'tool' && last.name === item.name) {
      last.rounds.push(item);
    } else {
      groups.push({ kind: 'tool', name: item.name, label: item.label, rounds: [item] });
    }
  }
  return groups;
}

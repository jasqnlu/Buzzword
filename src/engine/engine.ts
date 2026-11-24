import { createContext } from './context';
import { AP_RULES } from './rules/ap';
import { HOUSE_RULES } from './rules/house';
import { DEFAULT_SETTINGS, type Issue, type Rule, type RuleInfo, type Settings } from './types';

export const ALL_RULES: Rule[] = [...AP_RULES, ...HOUSE_RULES];

/** Every rule id the engine can report, with its metadata (for the sidebar and tests). */
export const RULE_INFO: Record<string, RuleInfo> = (() => {
  const map: Record<string, RuleInfo> = {};
  for (const rule of ALL_RULES) {
    const { find: _find, related, ...info } = rule;
    map[rule.id] = info;
    for (const r of related ?? []) map[r.id] = r;
  }
  return map;
})();

export interface CheckOptions {
  settings?: Partial<Settings>;
  /** Rule ids to skip entirely. */
  disabled?: string[];
}

/** Find every issue in the text. Safe fixes never overlap each other. */
export function check(text: string, options: CheckOptions = {}): Issue[] {
  const settings: Settings = { ...DEFAULT_SETTINGS, ...options.settings };
  const disabled = new Set(options.disabled ?? []);
  const ctx = createContext(text);
  const found: Array<Issue & { priority: number }> = [];

  for (const rule of ALL_RULES) {
    if (disabled.has(rule.id)) continue;
    for (const hit of rule.find(ctx, settings)) {
      const info = RULE_INFO[hit.ruleId ?? rule.id];
      if (!info || disabled.has(info.id)) continue;
      const inQuote = ctx.inQuote(hit.start);
      if (info.inQuotes === 'skip' && inQuote) continue;
      if (info.inQuotes === 'only' && !inQuote) continue;
      if (hit.end <= hit.start) continue;
      found.push({
        ruleId: info.id,
        pack: info.pack,
        category: info.category,
        title: info.title,
        safe: info.safe && hit.replacement !== undefined,
        reason: info.reason,
        why: info.why,
        start: hit.start,
        end: hit.end,
        original: text.slice(hit.start, hit.end),
        replacement: hit.replacement ?? null,
        hint: hit.hint,
        inQuote,
        priority: info.priority ?? 0,
      });
    }
  }

  // Longest match first, then priority; a safe fix may not overlap an accepted safe fix.
  found.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start) || b.priority - a.priority);
  const accepted: Issue[] = [];
  const safeRanges: Array<[number, number]> = [];
  const seen = new Set<string>();
  for (const { priority: _p, ...issue } of found) {
    const key = `${issue.ruleId}:${issue.start}:${issue.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (issue.safe) {
      if (safeRanges.some(([s, e]) => issue.start < e && s < issue.end)) continue;
      safeRanges.push([issue.start, issue.end]);
    }
    accepted.push(issue);
  }
  return accepted.sort((a, b) => a.start - b.start);
}

/** Apply every safe fix to the text. Used by tests and the browser preview. */
export function applySafeFixes(text: string, issues: Issue[]): string {
  let out = text;
  for (const issue of [...issues].filter((i) => i.safe).sort((a, b) => b.start - a.start)) {
    out = out.slice(0, issue.start) + issue.replacement + out.slice(issue.end);
  }
  return out;
}

/** Convenience for tests: check, apply safe fixes, and repeat until nothing changes. */
export function fixAll(text: string, options: CheckOptions = {}): string {
  let current = text;
  for (let i = 0; i < 5; i++) {
    const next = applySafeFixes(current, check(current, options));
    if (next === current) return current;
    current = next;
  }
  return current;
}

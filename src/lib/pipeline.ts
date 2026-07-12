import type { DataArtifact, PipelineResult, UserPreferencesState } from './types.js';
import { runPrivacyGate } from './privacyGate';
import { resolveConflicts } from './router.js';
import {extractPreferences} from "./preferanceExtractor.js"
/**
 * Runs the full Context Layer pipeline:
 *   ingestion buffer -> Privacy Gate -> Routing/Resolution -> prompt assembly
 */
export function runPipeline(ingestionBuffer: DataArtifact[]): PipelineResult {
  const { allowed, blocked, securityExclusionCount } = runPrivacyGate(ingestionBuffer);

  const { remaining, userPreferences } = extractPreferences(allowed);

  const { resolved: contextItems, droppedStaleIds } = resolveConflicts(remaining);

  const finalPromptContext = buildPromptContext(contextItems, userPreferences);

  return {
    finalPromptContext,
    contextItems,
    userPreferences,
    securityExclusionCount,
    blockedArtifacts: blocked,
    droppedStaleIds,
  };
}

function buildPromptContext(
  contextItems: DataArtifact[],
  userPreferences: UserPreferencesState
): string {
  const lines: string[] = [];

  lines.push('### SYSTEM CONTEXT ###');

  lines.push('\n[Global User Preferences]');
  const { notes, settings } = userPreferences;
  const settingsEntries = Object.entries(settings);

  if (notes.length === 0 && settingsEntries.length === 0) {
    lines.push('(none)');
  } else {
    for (const note of notes) {
      lines.push(`- ${note}`);
    }
    for (const [key, value] of settingsEntries) {
      const rendered = typeof value === 'string' ? value : JSON.stringify(value);
      lines.push(`- ${key}: ${rendered}`);
    }
  }

  lines.push('\n[Resolved Context Items]');
  if (contextItems.length === 0) {
    lines.push('(none)');
  } else {
    for (const item of contextItems) {
      const rendered = typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
      lines.push(`- (${item.source} | topic: ${item.topicId} | ${item.createdAt}) ${rendered}`);
    }
  }

  return lines.join('\n');
}

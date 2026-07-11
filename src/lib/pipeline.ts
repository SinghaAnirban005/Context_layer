import type { DataArtifact, PipelineResult } from './types.js';
import { runPrivacyGate } from './privacyGate';
import { runRouter } from './router.js';

/**
 * Runs the full Context Layer pipeline:
 *   ingestion buffer -> Privacy Gate -> Routing/Resolution -> prompt assembly
 */
export function runPipeline(ingestionBuffer: DataArtifact[]): PipelineResult {
  // Privacy Gate
  const { allowed, blocked, securityExclusionCount } = runPrivacyGate(ingestionBuffer);

  // Routing & Resolution
  const { contextItems, preferences, droppedStaleIds } = runRouter(allowed);

  // Final prompt assembly
  const finalPromptContext = buildPromptContext(contextItems, preferences);

  return {
    finalPromptContext,
    contextItems,
    preferences,
    securityExclusionCount,
    blockedArtifacts: blocked,
    droppedStaleIds,
  };
}

function buildPromptContext(
  contextItems: DataArtifact[],
  preferences: Record<string, string | Record<string, any>>
): string {
  const lines: string[] = [];

  lines.push('### SYSTEM CONTEXT ###');

  lines.push('\n[User Preferences — always injected]');
  const prefEntries = Object.entries(preferences);
  if (prefEntries.length === 0) {
    lines.push('(none)');
  } else {
    for (const [topicId, content] of prefEntries) {
      const rendered = typeof content === 'string' ? content : JSON.stringify(content);
      lines.push(`- [${topicId}] ${rendered}`);
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

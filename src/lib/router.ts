import type { DataArtifact, RoutingResult } from './types';

/**
 * Routing & Resolution Layer
 *
 * a) Deterministic Fast Path
 *    Artifacts with source === 'preference' never enter the main context
 *    array or the conflict resolver. They are written into a dedicated
 *    preferences map (keyed by topicId) that gets injected into the final
 *    output unconditionally, every time.
 *
 * b) Conflict & Staleness Resolver
 *    For everything else artifacts are grouped by topicId. If more than
 *    one artifact shares a topicId only the most recently created one
 *    survives older duplicates are dropped and their IDs recorded.
 */
export function runRouter(artifacts: DataArtifact[]): RoutingResult {
  const preferences: Record<string, string | Record<string, any>> = {};
  const nonPreferenceArtifacts: DataArtifact[] = [];

  // Deterministic fast path split
  for (const artifact of artifacts) {
    if (artifact.source === 'preference') {
      preferences[artifact.topicId] = artifact.content;
    } else {
      nonPreferenceArtifacts.push(artifact);
    }
  }

  // Conflict & staleness resolution grouped by topicId
  const byTopic = new Map<string, DataArtifact[]>();
  for (const artifact of nonPreferenceArtifacts) {
    const bucket = byTopic.get(artifact.topicId);
    if (bucket) {
      bucket.push(artifact);
    } else {
      byTopic.set(artifact.topicId, [artifact]);
    }
  }

  const contextItems: DataArtifact[] = [];
  const droppedStaleIds: string[] = [];

  for (const bucket of byTopic.values()) {
    if (bucket.length === 1) {
      contextItems.push(bucket[0] as DataArtifact);
      continue;
    }

    const sorted = [...bucket].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const [freshest, ...stale] = sorted;
    contextItems.push(freshest as DataArtifact);
    droppedStaleIds.push(...stale.map((item) => item.id));
  }

  return { contextItems, preferences, droppedStaleIds };
}

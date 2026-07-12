import type { DataArtifact, ConflictResolutionResult } from './types';

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
export function resolveConflicts(artifacts: DataArtifact[]): ConflictResolutionResult {
  const byTopic = new Map<string, DataArtifact[]>();
  for (const artifact of artifacts) {
    const bucket = byTopic.get(artifact.topicId);
    if (bucket) {
      bucket.push(artifact);
    } else {
      byTopic.set(artifact.topicId, [artifact]);
    }
  }

  const resolved: DataArtifact[] = [];
  const droppedStaleIds: string[] = [];

  for (const bucket of byTopic.values()) {
    if (bucket.length === 1) {
      resolved.push(bucket[0] as DataArtifact);
      continue;
    }

    const sorted = [...bucket].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const [freshest, ...stale] = sorted;
    resolved.push(freshest as DataArtifact);
    droppedStaleIds.push(...stale.map((item) => item.id));
  }

  return { resolved, droppedStaleIds };
}

import type { DataArtifact, ConflictResolutionResult } from './types';

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

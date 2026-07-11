import type { DataArtifact, PrivacyGateResult } from './types.js';

/**
 * Intercepts ingestion. Any artifact with isPrivate === true is dropped
 * immediately and never allowed further into the pipeline. We track both
 * the count and the full blocked records.
 */
export function runPrivacyGate(artifacts: DataArtifact[]): PrivacyGateResult {
  const allowed: DataArtifact[] = [];
  const blocked: DataArtifact[] = [];

  for (const artifact of artifacts) {
    if (artifact.isPrivate === true) {
      blocked.push(artifact);
    } else {
      allowed.push(artifact);
    }
  }

  return {
    allowed,
    blocked,
    securityExclusionCount: blocked.length,
  };
}

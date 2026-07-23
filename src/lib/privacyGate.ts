import type { DataArtifact, PrivacyGateResult } from './types.js';

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

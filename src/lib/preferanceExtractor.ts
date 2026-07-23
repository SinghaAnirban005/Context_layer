import type { DataArtifact, UserPreferencesState } from './types.js';

export interface PreferenceExtractionResult {
  remaining: DataArtifact[];
  userPreferences: UserPreferencesState;
}

export function extractPreferences(artifacts: DataArtifact[]): PreferenceExtractionResult {
  const userPreferences: UserPreferencesState = { notes: [], settings: {} };
  const remaining: DataArtifact[] = [];

  for (const artifact of artifacts) {
    if (artifact.source !== 'preference') {
      remaining.push(artifact);
      continue;
    }

    if (typeof artifact.content === 'string') {
      if (!userPreferences.notes.includes(artifact.content)) {
        userPreferences.notes.push(artifact.content);
      }
    } else {
      Object.assign(userPreferences.settings, artifact.content);
    }
  }

  return { remaining, userPreferences };
}

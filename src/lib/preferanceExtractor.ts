import type { DataArtifact, UserPreferencesState } from './types.js';

export interface PreferenceExtractionResult {
  /** Everything that is NOT a preference —> the only stream that ever
   *  reaches the topic based conflict resolver downstream. */
  remaining: DataArtifact[];
  userPreferences: UserPreferencesState;
}

/**
 * Deterministic Fast-Path — Preference Extraction.
 *
 * Preferences are global user configuration (style, tone, constraints),
 * not topic-scoped transactional events. They are isolated here, at the
 * earliest possible point after the Privacy Gate, and NEVER touch
 * `topicId`-based logic downstream (no conflict resolution, no staleness
 * comparison, no per-topic bucketing). Isolating them this early ensures
 * a preference item can never accidentally collide with, shadow, or be
 * dropped by an unrelated event that happens to share a `topicId`.
 *
 * Accumulation rules for the global `userPreferences` state:
 *   - string content  -> appended to `notes` (deduplicated)
 *   - object content   -> shallow-merged into `settings`, last-write-wins
 *                          per key, so repeated updates to the same
 *                          setting always reflect the most recent value.
 */
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

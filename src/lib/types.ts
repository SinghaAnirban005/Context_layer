// Core data schema

export type DataSourceType = 'slack' | 'email' | 'jira' | 'calendar' | 'preference';

export interface DataArtifact {
  id: string;
  source: DataSourceType;
  topicId: string;
  content: string | Record<string, any>;
  isPrivate: boolean;
  createdAt: string;
}

// Pipeline result shapes

export interface PrivacyGateResult {
  allowed: DataArtifact[];
  blocked: DataArtifact[];
  securityExclusionCount: number;
}

export interface ConflictResolutionResult {
  resolved: DataArtifact[];
  droppedStaleIds: string[];
}

/**
 * Global, structural preference state —> deliberately NOT keyed by topicId.
 */
export interface UserPreferencesState {
  notes: string[];
  settings: Record<string, any>;
}

export interface PipelineResult {
  finalPromptContext: string;
  contextItems: DataArtifact[];
  userPreferences: UserPreferencesState;
  securityExclusionCount: number;
  blockedArtifacts: DataArtifact[];
  droppedStaleIds: string[];
}

// Action governance

export interface ActionPayload {
  operation: string;
  params?: Record<string, any>;
}

export type ActionStatus = 'EXECUTED' | 'AWAITING_HUMAN_APPROVAL';

export interface ActionGovernanceResult {
  status: ActionStatus;
  operation: string;
  reason: string;
}

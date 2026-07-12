import type { DataArtifact } from './types.js';

const now = new Date();
const today = new Date(now);
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);

export const sampleArtifacts: DataArtifact[] = [
  {
    id: 'artifact-a-slack',
    source: 'slack',
    topicId: 'project-deadline-q3-launch',
    content: 'Heads up — the deadline is Friday at 5 PM.',
    isPrivate: false,
    createdAt: today.toISOString(),
  },
  {
    id: 'artifact-b-email',
    source: 'email',
    topicId: 'project-deadline-q3-launch',
    content: 'Reminder: the deadline is Thursday at 12 PM.',
    isPrivate: false,
    createdAt: yesterday.toISOString(),
  },
  {
    id: 'artifact-c-jira',
    source: 'jira',
    topicId: 'infra-secrets-ticket',
    content: { summary: 'Rotate prod keys', apiKey: 'sk-live-REDACTED-DO-NOT-LEAK' },
    isPrivate: true,
    createdAt: today.toISOString(),
  },
  {
    id: 'artifact-d-preference',
    source: 'preference',
    topicId: 'response-style',
    content: 'User prefers concise text outputs.',
    isPrivate: false,
    createdAt: today.toISOString(),
  },
  {
    id: 'artifact-e-preference-structured',
    source: 'preference',
    topicId: 'notification-config',
    content: { notifyOnMention: true, digestFrequency: 'daily' },
    isPrivate: false,
    createdAt: today.toISOString(),
  },
];

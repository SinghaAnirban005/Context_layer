import assert from 'node:assert/strict';
import { runPipeline } from '../lib/pipeline.js';
import { evaluateAction } from '../lib/governance.js';
import { sampleArtifacts } from '../lib/sampleData.js';
import type { ActionPayload } from '../lib/types.js';

let passCount = 0;
function pass(label: string) {
  passCount++;
  console.log(`Pass: ${label}`);
}

function fail(label: string, err: unknown): never {
  console.error(`FAIL: ${label}`);
  console.error(err);
  process.exit(1);
}

console.log('Running Context Layer pipeline against sample data...\n');
const result = runPipeline(sampleArtifacts);

console.log(result.finalPromptContext);
console.log('\n--- Assertions ---\n');

try {
  assert.equal(result.securityExclusionCount, 1);
  assert.ok(result.blockedArtifacts.some((a) => a.id === 'artifact-c-jira'));
  assert.ok(
    !result.contextItems.some((a) => a.id === 'artifact-c-jira'),
    'private artifact must never reach contextItems'
  );
  pass('Private Jira ticket (Item C) was blocked by the Privacy Gate');
} catch (err) {
  fail('Private Jira ticket should be blocked', err);
}

try {
  assert.ok(result.droppedStaleIds.includes('artifact-b-email'));
  assert.ok(result.contextItems.some((a) => a.id === 'artifact-a-slack'));
  assert.ok(!result.contextItems.some((a) => a.id === 'artifact-b-email'));
  pass('Stale email (Item B) dropped in favor of fresh Slack message (Item A)');
} catch (err) {
  fail('Staleness resolution failed', err);
}

try {
  assert.ok(result.userPreferences.notes.includes('User prefers concise text outputs.'));
  assert.ok(!result.contextItems.some((a) => a.id === 'artifact-d-preference'));
  assert.ok(result.finalPromptContext.includes('[Global User Preferences]'));
  assert.ok(result.finalPromptContext.includes('User prefers concise text outputs.'));

  assert.ok(!result.contextItems.some((a) => a.topicId === 'response-style'));
  assert.equal(result.userPreferences.settings.notifyOnMention, true);
  assert.equal(result.userPreferences.settings.digestFrequency, 'daily');
  assert.ok(!result.contextItems.some((a) => a.topicId === 'notification-config'));
  pass('Preference (Item D) isolated at extraction and injected as global userPreferences (root-level, topicId-independent)');
} catch (err) {
  fail('Global preference extraction failed', err);
}

try {
  const destructive: ActionPayload = { operation: 'send_email', params: { to: 'team@example.com' } };
  const destructiveResult = evaluateAction(destructive);
  assert.equal(destructiveResult.status, 'AWAITING_HUMAN_APPROVAL');

  const readOnly: ActionPayload = { operation: 'query_status', params: { topicId: 'project-deadline-q3-launch' } };
  const readOnlyResult = evaluateAction(readOnly);
  assert.equal(readOnlyResult.status, 'EXECUTED');

  pass(`Destructive action "send_email" -> STATUS: ${destructiveResult.status}`);
  pass(`Read-only action "query_status" -> STATUS: ${readOnlyResult.status}`);
} catch (err) {
  fail('Action governance interceptor failed', err);
}

console.log(`\nAll ${passCount} assertions passed.`);

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

// Private ticket (Item C) was blocked by the Privacy Gate
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

// Stale email (Item B) was dropped in favor of the fresher Slack message (Item A)
try {
  assert.ok(result.droppedStaleIds.includes('artifact-b-email'));
  assert.ok(result.contextItems.some((a) => a.id === 'artifact-a-slack'));
  assert.ok(!result.contextItems.some((a) => a.id === 'artifact-b-email'));
  pass('Stale email (Item B) dropped in favor of fresh Slack message (Item A)');
} catch (err) {
  fail('Staleness resolution failed', err);
}

// 3. Preference (Item D) was injected directly into the final prompt/system context,
//    bypassing the conflict resolver and contextItems array entirely.
try {
  assert.equal(result.preferences['response-style'], 'User prefers concise text outputs.');
  assert.ok(!result.contextItems.some((a) => a.id === 'artifact-d-preference'));
  assert.ok(result.finalPromptContext.includes('User prefers concise text outputs.'));
  pass('Preference (Item D) injected into final context via deterministic fast-path');
} catch (err) {
  fail('Preference fast-path failed', err);
}

// 4. Action governance --> destructive action requires human approval,
//    read only action executes immediately.
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

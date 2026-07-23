import type { ActionPayload, ActionGovernanceResult } from './types';

const MUTATING_PREFIXES = ['send_', 'delete_', 'create_', 'update_', 'write_', 'modify_', 'cancel_'];
const READ_ONLY_PREFIXES = ['get_', 'read_', 'query_', 'list_', 'search_', 'fetch_'];

export function evaluateAction(action: ActionPayload): ActionGovernanceResult {
  const op = action.operation.toLowerCase();

  const isMutating = MUTATING_PREFIXES.some((prefix) => op.startsWith(prefix));
  const isReadOnly = READ_ONLY_PREFIXES.some((prefix) => op.startsWith(prefix));

  if (isMutating) {
    return {
      status: 'AWAITING_HUMAN_APPROVAL',
      operation: action.operation,
      reason: `Operation "${action.operation}" mutates external state and requires human sign-off.`,
    };
  }

  if (isReadOnly) {
    return {
      status: 'EXECUTED',
      operation: action.operation,
      reason: `Operation "${action.operation}" is a safe, read-only query.`,
    };
  }

  return {
    status: 'AWAITING_HUMAN_APPROVAL',
    operation: action.operation,
    reason: `Operation "${action.operation}" is not a recognized read-only op; defaulting to human approval.`,
  };
}

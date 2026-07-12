# Context Layer for Agents

A minimal, dependency light TypeScript implementation of the HLD:


<img width="799" height="764" alt="Screenshot from 2026-07-12 01-41-14" src="https://github.com/user-attachments/assets/4f96ba09-3170-42b9-b723-fecb6fdfa184" />


This prototype implements the **deterministic side** of the diagram end to end
(Privacy Filter → Deterministic Path / Redis style preferences store →
Context Conflict Engine → Action Evaluator → Safe Path). The Embedding
Pipeline / Vector DB branch is intentionally out of scope since it needs a real
embedding model and vector store which conflicts with the "zero paid API
keys and zero external dependencies" constraint. Swapping it in later just means
adding a sibling to `runRouter` that also feeds into `contextItems`.

## Architecture → Code Mapping

| Diagram stage | File |
|---|---|
| Structured/Unstructured Data ingestion | `src/lib/sampleData.ts` (`DataArtifact[]`) |
| Privacy Filter | `src/privacyGate.ts` |
| Deterministic Path (global preferences) | `src/lib/preferenceExtractor.ts` |
| Context Conflict Engine (staleness) | `src/lib/router.ts` |
| Agent → Action Evaluator Engine | `src/lib/governance.ts` |
| Safe Path / Human in the loop | `evaluateAction()` → `STATUS: EXECUTED` \| `STATUS: AWAITING_HUMAN_APPROVAL` |
| System Execute | orchestrated by `src/lib/pipeline.ts` |

### Preferences are global state, not topic scoped data

`preference` artifacts are isolated in `preferenceExtractor.ts` immediately
after the Privacy Gate and *before* anything touches `topicId`. They never
enter the Context Conflict Engine, so they can't collide with, shadow, or be
dropped by an unrelated event that happens to share a `topicId`. They
accumulate into a single global `UserPreferencesState`:

```ts
interface UserPreferencesState {
  notes: string[];
  settings: Record<string, any>;
}
```

This state is injected at the **root** of the final markdown wrapper, in its
own `[Global User Preferences]` block structurally above and separate from
`[Resolved Context Items]`, it's ambient config for the whole response, not
"one topic among others."

## Run it

```bash
pnpm install
pnpm test        # runs validate.ts via tsx, prints ✓ Pass assertions
pnpm start        # runs index.ts, prints the assembled prompt context
pnpm run build    # compiles to dist/ with tsc
```

## Run it in Docker

```bash
docker build -t context-layer .
docker run --rm context-layer                    # runs validate.ts (default)
docker run --rm context-layer node dist/index.js # runs the plain demo instead
```

## What `validate.ts` proves

1. **Privacy Gate** — the private Jira ticket (Item C) is blocked and counted
   as a security exclusion; it never reaches `contextItems`.
   
2. **Staleness Resolver** — Item B (email, created yesterday) and Item A
   (Slack, created today) share a `topicId`; the stale email is dropped and
   its ID recorded in `droppedStaleIds`.
   
3. **Preference Isolation (Deterministic Fast Path)** — Item D (string
   preference) and Item E (structured preference) are isolated during
   early extraction, before any `topicId` logic runs. They accumulate
   into the global `userPreferences` state (`notes` + `settings`) and are
   injected at the root of `finalPromptContext` independent of their own
   `topicId` values.
   
4. **Action Governance** — a mutating action (`send_email`) is intercepted
   and flagged `AWAITING_HUMAN_APPROVAL`; a read only action (`query_status`)
   is flagged `EXECUTED`.

## Design notes / known edge cases

- **Timestamp comparison** uses `new Date(x).getTime()`, which correctly
  orders ISO 8601 strings regardless of millisecond precision or timezone
  offset.
  
- **Unrecognized action operations** fail safe: if an operation doesn't
  match a known mutating or read only prefix, governance defaults to
  `AWAITING_HUMAN_APPROVAL` rather than assuming it's safe.
  
- **Preferences never carry topicId semantics.** String preferences are
  deduplicated into `notes`; object preferences are shallow merged into
  `settings` by their own keys, last write wins so restating the same
  setting later cleanly overwrites the old value, matching how a global
  config object should behave.

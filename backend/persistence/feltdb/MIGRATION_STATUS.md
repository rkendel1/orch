# FeltDB Migration Status

This document tracks the migration of Agent Orchestrator's persistence layer from SQLite to FeltDB.

## Summary

- **Total Collections**: 26
- **Completed**: 26
- **In Progress**: 0
- **Not Started**: 0

## Migration Inventory

| # | SQLite Table | FeltDB Collection | Domain Concept | Status | Notes |
|---|--------------|-------------------|---|--------|-------|
| 1 | projects | projects | Projects | ✅ Complete | Soft-delete via archived_at |
| 2 | sessions | sessions | Sessions | ✅ Complete | Complex lifecycle state, interface transitions |
| 3 | conversations | conversations | Conversations | ✅ Complete | Scope-based (session/project) |
| 4 | conversation_turns | conversationTurns | Conversation Turns | ✅ Complete | Sequence-based ordering per branch |
| 5 | conversation_messages | conversationMessages | Messages | ✅ Complete | Author-tracked, sequence-based |
| 6 | conversation_activities | conversationActivities | Activities | ✅ Complete | Tool use, file changes, etc. |
| 7 | conversation_branches | conversationBranches | Timeline Branches | ✅ Complete | Immutable sequence ordering |
| 8 | conversation_provider_events | conversationProviderEvents | Provider Events | ✅ Complete | GitHub webhooks, etc. |
| 9 | pr | pullRequests | Pull Requests | ✅ Complete | State tracking for observation |
| 10 | pr_checks | prChecks | CI Checks | ✅ Complete | Composite key: (pr_url, name, commit_hash) |
| 11 | pr_comments | prComments | PR Comments | ✅ Complete | Author-tracked review comments |
| 12 | pr_review_threads | prReviewThreads | Review Threads | ✅ Complete | File/line-specific discussion threads |
| 13 | pr_reviews | prReviews | PR Reviews | ✅ Complete | Reviewer state (commented/approved/changes_requested) |
| 14 | review_runs | reviewRuns | Review Runs | ✅ Complete | Batch reviews from single tool at commit |
| 15 | reviews | reviews | Findings | ✅ Complete | Code review findings with severity |
| 16 | notifications | notifications | Notifications | ✅ Complete | Project/session scoped, read tracking |
| 17 | workspace_repos | workspaceRepos | Workspace Repos | ✅ Complete | Clone state tracking |
| 18 | shell_terminals | shellTerminals | Terminals | ✅ Complete | Session-scoped shell contexts |
| 19 | session_interface_transitions | sessionInterfaceTransitions | Interface Mode Changes | ✅ Complete | TUI ↔ Chat transitions |
| 20 | session_interface_transition_messages | sessionInterfaceTransitionMessages | Transition Metadata | ✅ Complete | Message tracking during transitions |
| 21 | agent_switches | agentSwitches | Agent Changes | ✅ Complete | TUI agent switches |
| 22 | app_settings | appSettings | Settings | ✅ Complete | Global app configuration |
| 23 | agent_model_catalog | agentModelCatalog | Model Catalog | ✅ Complete | Available models with deprecation tracking |
| 24 | telemetry_events | telemetryEvents | Telemetry | ✅ Complete | Event tracking for analytics |
| 25 | model_usage_events | modelUsageEvents | Token Usage | ✅ Complete | Token accounting for models |
| 26 | change_log | changeLog | CDC Audit Log | ✅ Complete | Durable event stream |

## Components Implemented

### 1. Type Definitions (`types.ts`)
- 26 TypeScript interfaces matching FeltDB collections
- Enum types for state machines (activity_state, pr_state, etc.)
- Optional fields for nullable relationships
- Proper JSON and Record<string, unknown> for unstructured data

### 2. Database Initialization (`db.ts`)
- `openDatabase()` with directory-based configuration
- Type-safe collection accessors (26 functions)
- Singleton pattern with `getDatabase()` and `closeDatabase()`
- Lazy collection initialization via FeltDB

### 3. Stores (5 files)
- **projects.ts**: ProjectStore with CRUD and soft-delete
- **sessions.ts**: SessionStore with lifecycle, activity state, and mode transitions
- **pullrequests.ts**: PullRequestStore with multi-table PR state
- **conversations.ts**: ConversationStore with turns, messages, activities, branches
- **notifications.ts**: NotificationStore with read tracking
- **reviews.ts**: ReviewStore with findings and runs
- **workspace.ts**: WorkspaceStore for repos, terminals, transitions, switches
- **settings.ts**: SettingsStore for configuration and telemetry

### 4. CDC Layer (`cdc.ts`)
- CDCManager with subscription pattern
- CDCEventType enum with 10+ event types
- Sequence-based audit trail persistence
- Smart filtering (only emit on durable fact changes)
- FeltDB subscription handlers

### 5. Migration Utility (`migrate.ts`)
- `migrateFromSQLite()` function for bulk data import
- MigrationResult tracking counts per collection
- Error handling with graceful fallback for missing tables
- Support for idempotent re-runs (upsert patterns)
- 19 collection migration blocks (A-T above)

### 6. Index & Exports (`index.ts`)
- Central export point for all stores, types, utilities
- Enables clean imports: `import * from "./feltdb"`

## Data Integrity Considerations

### ID Generation
- Sessions: `{project_id}-{num}` (sequential per project)
- PRChecks: Composite key `(pr_url, name, commit_hash)`
- Others: Explicit string IDs

### Enum Casting
- Migration code carefully casts SQLite string values to enums
- Uses `String()` for safe type conversion
- Falls back to defaults if values are missing

### Durable Facts vs Derived
- activity_state, is_terminated: durable in sessions
- pr_state, ci_state, review_decision: durable in PR tracking
- CDC only emits on durable fact changes (not every update)

### Relationships
- session → conversations, PRs, terminals
- pr → checks, comments, reviews, review_runs
- conversation → turns, messages, activities, branches
- All relationships maintained via foreign key patterns (string references)

## Next Steps

1. **Persistence Contract Tests**
   - Create/read/update/delete for each collection
   - Session lifecycle (spawn → active → terminated)
   - Conversation branching with immutable sequence
   - Multi-row transaction atomicity
   - CDC event emission verification
   - Restart/reopen durability
   - Migration round-trip data integrity

2. **Go Backend Integration**
   - Wire Go backend to call FeltDB adapter (TypeScript/Node runtime)
   - Create persistence ports in Go
   - Handle async/callback patterns for CDC

3. **Architecture Documentation**
   - Update architecture.md (FeltDB replaces SQLite)
   - backend-code-structure.md with new module layout
   - stack.md with deployment changes

4. **Removal of SQLite**
   - Delete migration files and goose infrastructure
   - Remove sqlc runtime and storage layer
   - Clean up old SQLite-specific code

5. **End-to-End Testing**
   - Full application flow with FeltDB backend
   - UI/CLI integration tests
   - Agent adapter compatibility verification

## FeltDB Schema (`feltdb.flow`)

The authoritative schema definition exists in `backend/persistence/feltdb/feltdb.flow`, which declares:
- All 26 collections with exact field types
- Primary keys and unique constraints
- Indexes for high-frequency queries
- Enum definitions
- Relationship metadata

**Note**: The .flow file is the source of truth for schema evolution and must be updated before schema migrations.

## Key Invariants

1. **Single-Writer**: AO daemon is sole writer; UI/CLI read-only
2. **Immutable Conversations**: Turn sequences are append-only; branching creates new timelines
3. **Idempotent Operations**: Migration and PR observation polling are re-runnable
4. **Atomic Multi-Row**: Session creation, PR observation, conversation projection
5. **CDC Durability**: changeLog persists all events for audit and recovery

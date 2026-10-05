# FeltDB Integration Plan

## Architecture Decision: Store Adapter Pattern

The existing Go application passes a concrete `Store` type (from `backend/internal/storage/sqlite/store/store.go`) to all services. Rather than refactoring all service interfaces, we'll implement a new Store that:

1. **Implements all existing Store methods** (same signatures as SQLite Store)
2. **Calls FeltDB TypeScript runtime via local service/HTTP bridge**
3. **Maintains single-writer guarantee** (AO daemon writes exclusively)
4. **Preserves CDC behavior** (FeltDB subscriptions replace SQLite triggers)

```
Go Domain Services (unchanged)
        ↓
Store interface (implemented by SQLiteStore OR FeltDBStore)
        ↓
FeltDB HTTP Bridge
        ↓
Node.js FeltDB Runtime
        ↓
@feltdb/core
        ↓
ao.feltdb
```

## Implementation Phases

### Phase 1: FeltDB HTTP Service (Node.js)
Create a lightweight HTTP server in Node.js that wraps the FeltDB TypeScript stores:
- `backend/persistence/feltdb/server.ts`
- Exposes FeltDB store methods as REST endpoints
- Runs on localhost:6000 (configurable)
- Used only by daemon (internal service)

### Phase 2: FeltDB Store Adapter (Go)
Create a Go Store implementation that calls the FeltDB HTTP service:
- `backend/internal/storage/feltdb/store.go`
- Implements same methods as SQLiteStore
- Calls HTTP endpoints instead of SQL
- Environment variable to select backend (default: SQLite for now)

### Phase 3: Persistence Contract Tests
Write executable tests for both SQLite and FeltDB implementations:
- `backend/internal/storage/contract_test.go`
- Tests CRUD, lifecycle, CDC, atomicity
- Run against both backends
- Verify migration data integrity

### Phase 4: Migration & Validation
- Create migration validation script
- Test round-trip: SQLite → FeltDB → verify state
- Run full E2E tests with FeltDB

### Phase 5: Remove SQLite
- Delete goose migrations
- Remove sqlc dependencies
- Remove SQLite Store implementation
- Update daemon to use FeltDB only

## Minimal Go Changes Required

1. Add FeltDB client adapter (150-200 lines)
2. Add HTTP bridge initialization (50 lines)
3. Update daemon wiring to select backend (10 lines)
4. Add integration tests (200+ lines)

**No changes to domain services, no interface extraction needed.**

## FeltDB TypeScript Runtime Startup

The Node.js FeltDB service will be:
1. Started as a subprocess by the Go daemon at startup
2. Runs on localhost:6000
3. Connects to ao.feltdb (same location as ao.db)
4. Responds to HTTP requests for store operations
5. Stopped gracefully on daemon shutdown

Environment variables:
- `FELTDB_ENABLE`: true/false (enable FeltDB backend)
- `FELTDB_PORT`: 6000 (default)
- `FELTDB_DATA_DIR`: ~/.ao (default, inherited from parent)

## Files to Create/Modify

```
NEW:
  backend/persistence/feltdb/server.ts          (HTTP bridge ~300 lines)
  backend/internal/storage/feltdb/store.go      (HTTP client ~300 lines)
  backend/internal/storage/contract_test.go     (tests ~500 lines)
  scripts/run-feltdb-tests.sh                   (test runner)

MODIFY:
  backend/internal/daemon/daemon.go             (10 lines: select backend)

DELETE (Phase 5):
  backend/internal/storage/sqlite/              (entire dir)
  backend/migrations/                           (goose migrations)
  sqlc.yaml / generated sqlc code
```

## Testing Strategy

1. **Unit contract tests**: Both backends pass identical tests
2. **Integration tests**: Real daemon with FeltDB backend
3. **Migration tests**: SQLite DB → FeltDB → data integrity verification
4. **CDC tests**: FeltDB mutations produce expected notifications
5. **Restart durability**: Data survives daemon restart

## Acceptance Criteria

- [x] FeltDB persistence layer implemented (Phase 0 - DONE)
- [ ] FeltDB HTTP service created
- [ ] Go Store adapter for FeltDB created  
- [ ] Persistence contract tests pass for both backends
- [ ] Daemon starts with FeltDB backend
- [ ] E2E flows work (project → session → conversation → notification)
- [ ] CDC events flow correctly
- [ ] Migration validation passes
- [ ] SQLite completely removed
- [ ] No remaining production SQLite dependencies
- [ ] Architecture docs updated

## Timeline

- Phase 1 (Server): 2-3 hours
- Phase 2 (Adapter): 2-3 hours
- Phase 3 (Tests): 4-6 hours
- Phase 4 (Migration): 2-3 hours
- Phase 5 (Cleanup): 2-3 hours

Total: ~14-18 hours of implementation

## Risk Mitigation

1. **Fallback**: Keep SQLite code in git history; can revert if needed
2. **Gradual**: Run both backends in parallel during testing
3. **Contract tests**: Catch incompatibilities early
4. **Snapshots**: Save representative test databases for comparison

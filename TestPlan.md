# Onedrive Audit test plan

## 1. Purpose and scope

This test plan defines how to validate the **OnedriveAudit** Azure Functions solution end-to-end while keeping day-to-day feedback fast and reliable.

Primary goals:

- Detect regressions early in pull requests.
- Validate OneDrive change tracking correctness (create, rename, move, delete).
- Ensure resilience to Microsoft Graph pagination, throttling, and transient failures.
- Make it easy to run tests locally and in GitHub Actions.

Out of scope:

- Performance/load testing at enterprise scale (can be added later as a separate plan).
- Security penetration testing (covered by separate security review process).

---

## 2. Test strategy (layered)

### 2.1 Unit tests (Vitest-first)

**Framework:** `vitest` (required default for unit tests)

Purpose:

- Validate business logic with no network and no real cloud dependencies.
- Keep execution extremely fast for local development and PR checks.

Characteristics:

- Mock all external dependencies (Graph client, database repositories, time, UUID/randomness).
- Deterministic inputs/outputs.
- Focus on small, isolated units.

Target scope examples:

- Delta event normalization and mapping to `ChangeEvent`.
- Operation classification (`create`, `rename`, `move`, `delete`).
- Path/name resolution logic.
- Retry strategy decisioning (what is retryable vs not).
- SQL parameter generation logic where separated from DB driver calls.

### 2.2 Integration tests (mocked boundaries)

Purpose:

- Validate component collaboration (services + repositories + client wrappers).
- Exercise realistic workflows without using live Microsoft services.

Characteristics:

- Use mocked Graph HTTP responses (fixtures) for delta paging and error scenarios.
- Use test database (ephemeral or isolated schema) for repository CRUD validation.
- Validate persisted state transitions in PostgreSQL (`DriveItem`, `ChangeEvent`, `DeltaState`, `WebhookSubscription`).

Target scope examples:

- Process multi-page delta feed and persist exact resulting state.
- Handle rename/move sequences across pages.
- Idempotent reprocessing behavior.
- Webhook notification ingestion → queued processing → DB updates.

### 2.3 Contract/fixture compatibility tests

Purpose:

- Protect against drift in Graph response payload structure.

Characteristics:

- Use sanitized real-world payload snapshots as fixtures.
- Parse and validate required fields and fallback behavior when optional fields are missing.

Target scope examples:

- Missing optional properties.
- Additional unknown properties.
- Slightly reordered payload structures.

### 2.4 Smoke tests (live, opt-in)

Purpose:

- Verify real integration with Microsoft Graph and Azure deployment wiring.

Approach (per project note):

- Use a **dedicated Microsoft test account** created specifically for this repository.
- Store credentials/secrets in **GitHub Environments** (not repository-level plaintext secrets).

Characteristics:

- Minimal but critical path checks only.
- Non-destructive where possible; cleanup routines for created artifacts.
- Run manually and/or scheduled, not as required PR gate.

Recommended smoke scenarios:

1. Authenticate and access target drive.
2. Create test folder/file and detect change.
3. Rename and detect rename event.
4. Move and detect move event.
5. Delete and detect delete event.

---

## 3. Test environment design

### 3.1 Local developer environment

Required:

- Node.js LTS compatible with Azure Functions runtime.
- Local PostgreSQL instance (Docker or local service) for integration tests.
- `.env.test` for local non-production configuration.

Developer commands (example):

- `npm run test:unit` (Vitest)
- `npm run test:integration`
- `npm run test` (all non-smoke)
- `npm run test:smoke` (only when env vars are set)

### 3.2 CI environment (GitHub Actions)

Recommended workflows:

1. **PR workflow (required checks):**
   - lint
   - typecheck
   - unit tests (Vitest)
   - integration tests (mocked Graph + test DB)

2. **Smoke workflow (optional/manual + scheduled):**
   - triggered by `workflow_dispatch`
   - optional nightly schedule
   - runs only if environment secrets are available

### 3.3 Data isolation

- Use dedicated test DB/schema per workflow execution.
- Rollback/teardown after each test suite.
- Ensure smoke tests operate in dedicated test tenant data/folders.

---

## 4. Tooling and framework recommendations

### 4.1 Core tooling

- **Unit tests:** Vitest
- **Assertions/mocks:** Vitest built-ins (`vi.fn`, `vi.mock`, fake timers)
- **HTTP mocking:** `nock` or `msw` (node mode) for Graph API simulation
- **Integration DB support:** migration runner + seed utilities
- **Coverage:** Vitest coverage provider (`v8`)

### 4.2 Project scripts (recommended)

Add/confirm scripts in `package.json`:

- `test:unit`: run unit tests only
- `test:integration`: run integration tests only
- `test:smoke`: run live smoke tests (guarded)
- `test`: run `test:unit` + `test:integration`
- `test:coverage`: coverage summary/report

### 4.3 Test file organization

- `tests/unit/**/*.test.ts`
- `tests/integration/**/*.test.ts`
- `tests/smoke/**/*.test.ts`
- `tests/fixtures/graph/**/*.json`

---

## 5. Functional coverage matrix

### 5.1 Graph delta processing

Must test:

- Initial delta sync flow.
- Incremental delta sync using stored token.
- Pagination via `@odata.nextLink`.
- Token refresh/update via `@odata.deltaLink`.
- Empty delta page handling.

### 5.2 Change operation handling

Must test:

- File/folder create.
- Rename (same parent, different name).
- Move (different parent/path).
- Delete/tombstone handling.
- Combined rename + move edge cases.

### 5.3 Database/state integrity

Must test:

- Correct upsert behavior for `DriveItem`.
- Accurate append-only history for `ChangeEvent`.
- Consistency of `DeltaState` updates.
- Concurrency safety for parallel/duplicate notifications.

### 5.4 Error handling and resilience

Must test:

- Graph API 429 throttling with backoff/retry.
- Graph API 5xx transient failures and retry caps.
- Non-retryable 4xx behavior.
- DB transient error handling.
- Partial-failure recovery without corrupting state.

### 5.5 Azure Function bindings/entry points

Must test:

- HTTP-trigger/webhook validation and routing.
- Queue/timer trigger orchestration behavior.
- Structured logging includes correlation context.

---

## 6. Non-functional quality gates

### 6.1 Coverage targets

Minimum targets:

- Overall line coverage: **70% minimum**.
- Core business modules (`src/services/`, `src/models/` validation logic): **80%+ preferred**.

### 6.2 PR quality gates

Require green status for:

- lint
- typecheck
- unit tests
- integration tests

Smoke tests should report status but remain non-blocking unless team later decides otherwise.

### 6.3 Determinism and speed

- Unit suite target runtime: under 2–3 minutes.
- Integration suite target runtime: under 10 minutes.
- Eliminate flaky tests before marking CI required.

---

## 7. Smoke testing with dedicated Microsoft account

### 7.1 Account and permissions

- Create a dedicated Microsoft account/tenant identity exclusively for testing.
- Use least-privilege Graph scopes needed for OneDrive delta + webhook flows.
- Separate test drive/folder namespace (e.g., `/OnedriveAudit-Test/`).

### 7.2 GitHub secret management

- Store credentials in **GitHub Environment secrets** (e.g., `test` environment).
- Protect environment with required reviewers if desired.
- Rotate secrets on a schedule.

Suggested secret names (example):

- `GRAPH_TENANT_ID`
- `GRAPH_CLIENT_ID`
- `GRAPH_CLIENT_SECRET`
- `GRAPH_TEST_USER`
- `GRAPH_TEST_PASSWORD` (only if needed by chosen auth flow)
- `TEST_WEBHOOK_BASE_URL`

### 7.3 Safety controls

- Prefix all smoke-created artifacts with run ID/timestamp.
- Always teardown created resources in `finally` blocks.
- Add timeout guards so tests fail fast and cleanly.

---

## 8. Test data and fixtures

### 8.1 Fixture principles

- Keep fixtures minimal and representative.
- Sanitize any real payload data.
- Version fixtures alongside tests.

### 8.2 Required fixture set (initial)

- Single-page delta response with create event.
- Multi-page delta with mixed operations.
- 429 response with retry-after.
- 5xx transient then success.
- Delete/tombstone payload.

---

## 9. Rollout plan (phased)

### Phase 1 (foundation)

- Establish Vitest configuration and unit test harness.
- Add baseline unit tests for core services.
- Add CI PR workflow with lint/typecheck/unit.

### Phase 2 (integration depth)

- Add mocked Graph integration workflows.
- Add PostgreSQL integration tests with isolated schema/DB.
- Enforce 70% coverage threshold.

### Phase 3 (live confidence)

- Add smoke workflow with dedicated Microsoft account secrets.
- Add nightly scheduled run.
- Tune reliability and cleanup logic.

### Phase 4 (hardening)

- Expand edge-case fixtures from production learnings.
- Track and reduce flaky test rate.
- Consider performance and chaos-style resilience tests.

---

## 10. Risks and mitigations

- **Risk:** Flaky tests due to timing/network assumptions.  
  **Mitigation:** Use deterministic clocks/mocks and strict retry test patterns.

- **Risk:** Graph API behavior changes break parsing.  
  **Mitigation:** Contract fixture tests + regular fixture refresh.

- **Risk:** Smoke tests modify unintended data.  
  **Mitigation:** Dedicated account/folder namespace + enforced cleanup.

- **Risk:** CI runtime grows too long.  
  **Mitigation:** Keep unit/integration split; run smoke separately.

---

## 11. Definition of done for testing maturity

Testing approach is considered production-ready when:

- Unit tests (Vitest) cover all critical business logic paths.
- Integration tests verify delta processing correctness and DB consistency.
- CI blocks merge on lint/typecheck/unit/integration failures.
- Smoke tests validate real Graph/Azure wiring using dedicated test account.
- Coverage and reliability targets are consistently met.

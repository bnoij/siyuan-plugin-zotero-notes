# Translation and Advanced Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add controlled pdf2zh translation, cross-document citations, connected Zotero collections, and stable Agent/eventBus interfaces to the plugin.

**Architecture:** Inject process execution behind a small runner for testability, use bounded translation queues with cancellation and original-file preservation, aggregate citations by document tree, and expose existing research operations through SiYuan Agent/eventBus APIs.

**Tech Stack:** JavaScript, SiYuan Plugin/Kernel APIs, Zotero Local API, pdf2zh CLI, Node.js built-in tests, temporary stub CLI for process verification.

**Spec:** `docs/superpowers/specs/2026-11-11-reference-integration-design.md`

## Global Constraints

- No automatic pdf2zh installation, deployment, secret persistence, or real translation claims without an actual engine.
- Original PDFs and Note content are never overwritten; outputs are separate attachments.
- Queues are bounded, cancellable, and cleaned up on unload; no unbounded background tasks.
- Advanced custom CSL and complex PDF recognition are not claimed as completed.
- Existing lifecycle, binding, locking, and conversion regressions must remain green.

## Review Focus

- Failed/cancelled processes must not be reported as successful translations.
- Multi-document citation renumbering must be deterministic and not delete unrelated content.
- Connected collection updates must not remove unrelated collections.
- Agent arguments and eventBus payloads must be validated and never expose secrets.
- Process crashes, missing executables, and partial outputs must preserve the original and return actionable errors.

### Task 1: Translation runner and attachment model

**Files:** `index.js`, `tests/translation.test.js`

- [ ] Write failing tests for CLI arguments, mono/dual output mapping, missing executables, nonzero exits, cancellation, and secret redaction.
- [ ] Implement `runPdf2zh(options)` with a configurable executable and injected process runner, bounded output, and separate output paths.
- [ ] Implement `translationAttachment(itemKey, mode)` to register translated files without changing the original attachment.
- [ ] Add settings for executable, source/target languages, and per-job concurrency.
- [ ] Run translation and full regression tests.

### Task 2: Bounded translation queue and lifecycle

**Files:** `index.js`, `index.css`, `tests/translation-queue.test.js`

- [ ] Write failing tests for bounded concurrency, per-item progress, cancellation, queue drain, failed jobs, and unload cleanup.
- [ ] Implement `queueTranslations(itemKeys, mode)` with progress state and per-job error isolation.
- [ ] Add Dock actions for mono/dual translation and cancellation, with progress/error display.
- [ ] Stop scheduling and terminate active processes on unload without deleting completed outputs.
- [ ] Run queue and full regression tests.

### Task 3: Cross-document citations and connected collections

**Files:** `index.js`, `tests/citation-tree.test.js`

- [ ] Write failing tests for deterministic document ordering, per-document registries, Reference child creation, and unrelated-content preservation.
- [ ] Implement `refreshCitationTree(rootDocId)` to renumber citations across a document tree and generate a managed Reference child bibliography.
- [ ] Implement `syncConnectedCollection(rootDocId)` to create/update a `【【Connected Documents】】→ …` collection without removing other memberships.
- [ ] Add a Dock action for tree citation refresh and connected collection sync.
- [ ] Run citation-tree and full regression tests.

### Task 4: Agent and eventBus interfaces

**Files:** `index.js`, `tests/agent-actions.test.js`

- [ ] Write failing tests for `ensure_papers`, `write_documents`, `refresh_library`, `translate_paper`, argument validation, and event unsubscription.
- [ ] Implement `addAgentAction` wrappers around existing validated operations.
- [ ] Implement compatible eventBus `GetFromPool` and `Refresh` handlers with bounded payloads and cleanup on unload.
- [ ] Run Agent/eventBus and full regression tests.

### Task 5: Verification and release

**Files:** `README.md`, `README_zh_CN.md`, `plugin.json`, `package.json`, `package.zip`

- [ ] Run all tests, real SiYuan/Zotero citation-tree and collection checks, and stub-CLI process verification.
- [ ] Document real pdf2zh prerequisites, output semantics, failure handling, and unverified engine limitations.
- [ ] Bump semver, rebuild the forward-slash ZIP without tests/docs, commit, push `main`, and publish a Latest Release only after verification.

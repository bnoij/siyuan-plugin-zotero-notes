# Interaction Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe Note/paper recovery, SiYuan-native command entry points, grouped settings, and responsive Dock/dialog interactions without changing existing data semantics.

**Architecture:** Keep the dependency-free CommonJS single-file runtime. Add a binding inspection/recovery layer in front of `createOrOpenExclusive`, route slash/command/context entry points through existing business operations, and use one custom tabbed Setting surface plus scoped responsive CSS.

**Tech Stack:** JavaScript, SiYuan Plugin/Kernel APIs, Zotero Local API, browser DOM/CSS, Node.js built-in tests via SiYuan Electron.

**Spec:** `docs/superpowers/specs/2026-11-12-interaction-recovery-design.md`

## Global Constraints

- Do not overwrite or delete existing Note/paper content or Zotero child notes during inspection, claiming, or recovery.
- Claim only exact-path documents after explicit user confirmation; documents bound to another item are never rebound.
- Preserve existing locks, startup persistence rules, cancellation, and multi-window behavior.
- No new runtime dependencies, frameworks, ZBridge, Better BibTeX, or debug-bridge.
- Do not create a package Release. Complete Git commits and push `main` only after verification.

## Review Focus

- A failed existence query must not be mistaken for a missing document and trigger duplicate creation; Task 1 covers it.
- Rebinding must preserve existing content and must not steal another binding's Note; Task 1 covers it.
- Slash callbacks and menu events with missing/invalid document IDs must be harmless; Task 2 covers them.
- Switching settings tabs must not save or lose a draft, and all existing settings must remain reachable; Task 3 covers them.
- Long titles, long paths, narrow Dock/dialogs, and short viewports must not hide primary actions; Tasks 4–5 cover them.

---

### Task 1: Binding inspection and safe recovery

**Files:**
- Modify: `index.js:1344-1416`
- Test: `tests/recovery.test.js`

**Interfaces:**
- Consumes: existing `bindings`, `saveBinding`, `ensureRoot`, `initialNoteMarkdown`, `metadataMarkdown`, operation/binding locks.
- Produces: `inspectBindingDocuments(binding)`, `openBindingRecovery(item, binding, inspection)`, `recoverBindingDocument(item, binding, action)`, and `createOrOpenExclusive` recovery statuses. Later Dock/menu tasks consume `{status:"recovery-required", inspection}`.

- [ ] **Step 1: Write failing recovery tests**

Cover: both documents exist; missing Note; missing paper; empty noteDocId with exact-path Note; query failure; exact-path Note already claimed by another binding; ordinary same-title paper requiring confirmation; other-item paper rejected; cancel performs no writes; rebuild Note preserves Zotero and parent content; concurrent recovery creates once.

- [ ] **Step 2: Run tests and verify expected failure**

Run: `ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --test tests/recovery.test.js`
Expected: FAIL because inspection/recovery methods do not exist and complete stale bindings open directly.

- [ ] **Step 3: Implement binding inspection and recovery actions**

`inspectBindingDocuments(binding)` returns `{parentExists, noteExists, parentAttrs, noteAttrs, parentPath, notePath}`. Only recognized not-found responses produce `false`; transport/kernel failures throw. Recovery actions are `rebuild-note`, `rebind-note`, `rebuild-paper`, `rebind-paper`. Rebind operations require exact path, no reverse-binding claimant, no foreign Zotero binding, and explicit dialog confirmation. Rebind does not rewrite content. Rebuild writes only new documents and saves binding after all writes succeed.

Interactive recovery opens a dialog with rebuild/rebind/open-parent/cancel as applicable. Background calls return `recovery-required` without opening UI or auto-creating. Existing bindings open normally only after both existence checks pass.

- [ ] **Step 4: Run recovery and full tests**

Run: `ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --test tests/recovery.test.js && ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --test "tests/**/*.test.js"`
Expected: all recovery tests and the existing suite pass.

- [ ] **Step 5: Commit**

```bash
git add index.js tests/recovery.test.js
git commit -m "feat: recover missing paper notes safely"
```

### Task 2: Slash commands, command palette, and document menus

**Files:**
- Modify: `index.js:340-410`, `index.js:1180-1310`, `index.js:2140-2200`
- Test: `tests/interaction-commands.test.js`

**Interfaces:**
- Consumes: Task 1 recovery statuses and `openBindingRecovery`.
- Produces: `openNotePicker()`, `registerDocumentMenus()`, `documentMenuHandlers`, and slash entries `/zotero`, `/znote`, `/zexport`.

- [ ] **Step 1: Write failing command/menu tests**

Assert slash filters and callbacks, invalid protyle safety, single-item Note selection, command error capture, document-type-specific menu items, recovery entry for broken bindings, and identity-based event unsubscription.

- [ ] **Step 2: Run tests and verify expected failure**

Run: `ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --test tests/interaction-commands.test.js`
Expected: FAIL because slash entries, Note picker, and document menu handlers are absent.

- [ ] **Step 3: Implement command entry points and context menus**

Register `/zotero` for the existing citation selector, `/znote` for a new single-select Note picker, and `/zexport` for export. Share the Dock filter logic and only retain valid protyle instances.

Add command-palette operations for Dock focus, Note picker, connected citations, imports, and Zotero connection check. Change top-bar primary click to the grouped main menu. Register `open-menu-content`, `click-editortitleicon`, and `open-menu-doctree` handlers; use event document IDs and show only matching ordinary/paper/Note actions. Unregister exact handlers on unload.

When opening a stale Note returns `recovery-required`, show the recovery dialog and update the Dock action from Open to Recover for that item without eager per-render queries.

- [ ] **Step 4: Run interaction and full tests**

Run: `ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --test tests/interaction-commands.test.js && ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --test "tests/**/*.test.js"`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add index.js tests/interaction-commands.test.js
git commit -m "feat: add native note commands and document menus"
```

### Task 3: Grouped settings and binding maintenance

**Files:**
- Modify: `index.js:500-522`, `index.js:889-1086`
- Test: `tests/settings-ui.test.js`

**Interfaces:**
- Consumes: all existing normalized settings and Task 1 inspection.
- Produces: a five-tab settings surface, `translationDualConcurrency` control, and on-demand binding issue list with recovery actions.

- [ ] **Step 1: Write failing settings tests**

Assert five tabs (`基础`, `同步`, `写作`, `翻译`, `高级`), ARIA selection, no save on tab switch, draft preservation, every previous setting key is saved, dual concurrency is clamped, connection test works, and binding issues open only on demand.

- [ ] **Step 2: Run tests and verify expected failure**

Run: `ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --test tests/settings-ui.test.js`
Expected: FAIL because the current Setting is a single stacked form and has no dual-concurrency control.

- [ ] **Step 3: Implement the grouped settings surface**

Use one custom Setting item containing tablist and panels. Keep a draft model and data-key controls; only save/confirm invokes the existing normalization and `saveData`. Preserve `settingControls` updates used by `onDataChanged` without resetting unsaved edits during active input.

Add basic/sync/writing/translation/advanced groups, translation request concurrency, secrets-settings link with fallback instructions, and an on-demand binding inspection list. Recovery actions reuse Task 1 dialogs; no background binding scans occur on load.

- [ ] **Step 4: Run settings and full tests**

Run: `ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --test tests/settings-ui.test.js && ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --test "tests/**/*.test.js"`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add index.js tests/settings-ui.test.js
git commit -m "refactor: group settings by workflow"
```

### Task 4: Responsive dialogs and Dock actions

**Files:**
- Modify: `index.css`
- Modify: `index.js` dialog creation and Dock item action rendering
- Test: `tests/dialog-layout.test.js`

**Interfaces:**
- Consumes: existing Dialog instances and Dock action model.
- Produces: scoped dialog layout classes and primary/overflow Dock actions.

- [ ] **Step 1: Write failing layout tests**

Check responsive width/max-height declarations, scrollable content and fixed footer rules, container-based single-column fallback, long-content wrapping, accessible icon-only Dock buttons, and overflow menu actions. Also test that existing dialog action callbacks remain registered.

- [ ] **Step 2: Run tests and verify expected failure**

Run: `ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --test tests/dialog-layout.test.js`
Expected: FAIL because current fixed-height lists and equally stretched Dock actions lack the responsive structure.

- [ ] **Step 3: Implement responsive layout and Dock overflow**

Apply a shared dialog namespace with viewport-bounded widths/heights, scrolling body, persistent action area, and container-query fallbacks. Preserve business DOM and callbacks. On narrow Dock items, keep Create/Open/Recover primary and move secondary operations into an accessible item menu; use text labels when space permits.

- [ ] **Step 4: Run layout and full tests**

Run: `ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --test tests/dialog-layout.test.js && ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --test "tests/**/*.test.js"`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add index.js index.css tests/dialog-layout.test.js
git commit -m "fix: adapt note dialogs and dock to narrow windows"
```

### Task 5: Documentation, real verification, review, and Git update

**Files:**
- Modify: `README.md`, `README_zh_CN.md`, `plugin.json`, `package.json`

**Interfaces:**
- Consumes: Tasks 1–4 behavior and tests.

- [ ] **Step 1: Update usage documentation and development version**

Document recovery choices, `/zotero`, `/znote`, `/zexport`, top-bar/context menus, settings groups, and narrow-window behavior. Set development metadata to `0.5.1`; do not create a Release or tag.

- [ ] **Step 2: Run syntax and full automated tests**

Run: `ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --check index.js && ELECTRON_RUN_AS_NODE=1 "/c/Program Files/SiYuan/SiYuan.exe" --test "tests/**/*.test.js"`
Expected: all tests pass.

- [ ] **Step 3: Perform real recovery and responsive verification**

In a temporary SiYuan test tree, verify missing Note rebuild, exact-path rebind with content preservation, cancel-without-writes, and missing-paper confirmation. Verify slash commands, document menus, settings tabs, and wide/narrow/short dialogs in the real desktop UI. Clean temporary documents and confirm no startup/onDataChanged writes or multi-window reload loop.

- [ ] **Step 4: Complete independent review and fix Critical/Important findings**

Request a fresh read-only review over the branch and address verified findings with failing tests first. Re-run the full suite and real recovery scenario after changes.

- [ ] **Step 5: Commit and push without publishing**

```bash
git add README.md README_zh_CN.md plugin.json package.json
git commit -m "docs: explain note recovery and native interactions"
git push origin main
```

Expected: `main` is synchronized, working tree is clean, and no Release or tag is created.

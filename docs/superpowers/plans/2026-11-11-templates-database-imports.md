# Templates, Database, and Import Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe templates, native SiYuan database synchronization, CSL/BibTeX/identifier imports, and local PDF metadata assistance to the existing Zotero plugin.

**Architecture:** Reuse the plugin's CommonJS client, locks, document binding, and Zotero write authorization. Use SiYuan native attribute views for structured data, small deterministic parsers for imports, and local PDF metadata/text extraction with explicit fallback instead of adding a PDF dependency.

**Tech Stack:** JavaScript, SiYuan Plugin/Kernel APIs, Zotero Local API, Crossref/arXiv/PubMed/OpenLibrary/Citoid, Node.js built-in tests.

**Spec:** `docs/superpowers/specs/2026-11-11-reference-integration-design.md`

## Global Constraints

- No ZBridge, debug-bridge, Better BibTeX, npm runtime dependency, or direct copying of restricted reference code.
- Templates use a whitelist of fields and conditionals, never arbitrary JavaScript evaluation.
- Database rows bind to existing paper document IDs; never delete rows or document subtrees.
- Duplicate DOI/arxiv/title matches require an explicit skip-or-create decision.
- Startup and `onDataChanged` do not write storage; every external operation is abortable and failure-preserving.
- PDF metadata confidence and fallbacks must be visible; never silently treat filename guesses as authoritative.

## Review Focus

- Template input containing JS, Markdown, quotes, braces, nulls, and Unicode must be handled literally and safely.
- Database sync must not create duplicate rows on repeat or cross-window sync.
- Reimporting the same DOI must not silently create duplicate Zotero items.
- Missing PDF metadata and malformed files must produce warnings without blocking later imports.
- Import errors must preserve valid entries and return partial results instead of rolling back user data.

### Task 1: Safe template renderer

**Files:** `index.js`, `tests/templates.test.js`

- [ ] Write failing tests for whitelist variables, dotted paths, conditionals, loops, literal escaping, nulls, and rejection of arbitrary JS.
- [ ] Implement `renderSafeTemplate(template, item, noteDocId)` using only field paths, `if`/`else`/`end`, and `range`/`end`.
- [ ] Use templates only for initial Note content and never overwrite existing Note content during metadata refresh.
- [ ] Add a configurable initial Note template setting with a safe default.
- [ ] Run template and full regression tests.

### Task 2: Native database mapping

**Files:** `index.js`, `tests/database.test.js`

- [ ] Write failing tests for column values, row binding, repeat sync, and missing-key creation.
- [ ] Implement a library document with a native attribute view and fields for title, authors, year, journal, DOI, tags, and URL.
- [ ] Implement `syncPaperDatabase(item)` to add/reuse the bound document row and update mapped cells without duplicate rows.
- [ ] Add an explicit Dock action to create/open the database and synchronize existing paper documents.
- [ ] Run database and full regression tests.

### Task 3: CSL-JSON and BibTeX imports

**Files:** `index.js`, `tests/import-formats.test.js`

- [ ] Write failing tests for CSL normalization, BibTeX braces, nested braces, escaped characters, multiple entries, and invalid input.
- [ ] Implement deterministic parsers and conversion to the existing research item model.
- [ ] Add a file-import dialog that imports valid entries, returns per-entry failures, and requires confirmation for duplicate DOI/arxiv/title matches.
- [ ] Run import-format and full regression tests.

### Task 4: Identifier and PDF metadata assistance

**Files:** `index.js`, `tests/import-identifiers.test.js`

- [ ] Write failing tests for DOI/arXiv/ISBN/PMID/PMCID/URL normalization, Crossref/arXiv/PubMed/Citoid mapping, duplicate selection, PDF XMP/text extraction, and malformed PDF warnings.
- [ ] Implement identifier lookup using Crossref, arXiv Atom, PubMed ESummary, OpenLibrary, and Citoid as appropriate.
- [ ] Implement local PDF XMP and text-stream extraction with bounded size, filename fallback, and confidence labels.
- [ ] Add a unified import dialog for identifiers and PDF files with editable confirmation before Zotero creation.
- [ ] Run identifier, PDF, and full regression tests.

### Task 5: Verification and release

**Files:** `README.md`, `README_zh_CN.md`, `plugin.json`, `package.json`, `package.zip`

- [ ] Run all tests, syntax checks, real SiYuan database sync, CSL/BibTeX import, identifier lookup, and PDF import checks.
- [ ] Update bilingual docs with source limitations, managed areas, duplicate rules, and privacy implications.
- [ ] Bump semver, rebuild the forward-slash ZIP without tests/docs, commit, push `main`, and publish a Latest Release only after verification.

# Citation, Annotation, and Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Zotero-backed citations, bibliographies, PDF annotation import, and static writing exports to the existing SiYuan plugin without introducing ZBridge.

**Architecture:** Extend the existing CommonJS plugin and Zotero Local API client. Store citations as stable Zotero links plus document attributes, format bibliographies through `format=bib&style=...`, keep annotations in a managed Note section, and use SiYuan/Lute/Pandoc for static exports.

**Tech Stack:** JavaScript, SiYuan Plugin/Kernel APIs, Zotero Local API, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-11-11-reference-integration-design.md`

## Global Constraints

- No ZBridge, debug-bridge, Better BibTeX, npm runtime dependency, or direct reference-bundle copying.
- Preserve all lifecycle and multi-window guarantees; no startup `saveData` and no `onDataChanged` writes.
- Only update plugin-managed bibliography/annotation blocks; never delete unrelated user content.
- Word/LaTeX/Markdown exports are static formatted output, not live Zotero fields.
- Zotero 10+ desktop only.

## Review Focus

- Bibliography updates must not remove text following the bibliography.
- Duplicate citations must not duplicate registry entries or corrupt numbering.
- Deleted/missing Zotero items must produce readable warnings rather than blank output.
- Annotation refresh must preserve other Note content.
- Multi-window citation insertion must merge document registries rather than overwrite them.

### Task 1: Citation model and Local API formatting

**Files:** `index.js`, `tests/citations.test.js`

- [ ] Write failing tests for numeric/author-date/narrative text, registry deduplication, missing items, and bibliography parsing.
- [ ] Implement citation link helpers, document registry serialization, and `formatBibliography(itemKeys, style)` using Local API.
- [ ] Run citation tests and syntax checks.

### Task 2: Selector, insertion, and bibliography refresh

**Files:** `index.js`, `index.css`, `i18n/en.json`, `i18n/zh_CN.json`, `tests/citation-ui.test.js`

- [ ] Write failing tests for registry merge, block-scoped bibliography refresh, and duplicate insertion.
- [ ] Add a searchable multi-select dialog and editor command; insert stable citation links using the active Protyle editor.
- [ ] Track citation order/style in document attributes and refresh only marked bibliography blocks.
- [ ] Add settings for default style and citation form.
- [ ] Run tests.

### Task 3: PDF annotation import

**Files:** `index.js`, `tests/annotations.test.js`

- [ ] Write failing tests for text/comment/page/link conversion and preservation of unrelated Note content.
- [ ] Read annotations through Local API parent-child relationships and write a managed `PDF 标注` section in Note.
- [ ] Verify refresh updates only marked annotation blocks.
- [ ] Run tests.

### Task 4: Static citation and document export

**Files:** `index.js`, `tests/export.test.js`

- [ ] Write failing tests for BibTeX/BibLaTeX/Typst/LaTeX escaping and export filenames.
- [ ] Add citation export for GB/T 7714, APA, IEEE, BibTeX/BibLaTeX, Typst, and LaTeX.
- [ ] Add Markdown download and Pandoc Word/LaTeX conversion through SiYuan APIs.
- [ ] Run tests.

### Task 5: Integration, documentation, and release

**Files:** `README.md`, `README_zh_CN.md`, `plugin.json`, `package.json`, `package.zip`

- [ ] Run all old and new tests, syntax checks, and real SiYuan/Zotero insertion, refresh, annotation, export, and multi-window checks.
- [ ] Update bilingual documentation with supported behavior and limitations.
- [ ] Bump the semver version, rebuild the forward-slash ZIP without tests, commit, push `main`, and publish a Latest Release only after checks pass.

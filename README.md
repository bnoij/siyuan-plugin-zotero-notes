# Zotero Notes for SiYuan

[简体中文](README_zh_CN.md)

A SiYuan desktop plugin for browsing a Zotero 10+ library, creating paper notes on demand, and syncing a SiYuan `Note` document back to the corresponding Zotero item.

> **Release 0.6.0**
>
> This release is prepared for public distribution: download `package.zip` from the repository [Releases](https://github.com/bnoij/siyuan-plugin-zotero-notes/releases). Keep an independent backup of your SiYuan workspace and Zotero data, and report reproduction steps or ideas through [GitHub Issues](https://github.com/bnoij/siyuan-plugin-zotero-notes/issues).

![Zotero Notes preview](preview.png)

## Features

- Imports all personal-library items, nested collections, and attachment indexes automatically.
- Preserves the Zotero collection hierarchy in a searchable SiYuan Dock.
- Filters items by title, author, year, or tag.
- Creates documents only when requested; importing the library does not create documents in bulk.
- Creates a plugin-managed paper document and a writable `Note` child document.
- Generates basic metadata, abstract, tags, and local/Zotero attachment links.
- Refreshes paper metadata without changing `Note`.
- Exports standard Markdown and converts it into a sanitized, editable Zotero rich-text note.
- Shows a rendered sync preview and lists formats that may be lost on upload; later syncs update the same child note, with version preconditions to avoid overwriting conflicting edits.
- Limits the number of authors shown per item, replacing the rest with "et al." to keep long author lists from overflowing.
- Offers separate auto-sync intervals for the library and for note uploads (in minutes, 0 disables), uploading only notes whose content changed.
- Library refreshes are incremental by default: Zotero local versions are compared first, so only changed items are fetched and deletions are detected; a full-sync mode is available in the settings.
- Paper documents carry `custom-zotero-*` attribute markers; bindings and automatic migration are resolved through SiYuan's database using those markers.
- Migrates existing paper notes under a new root document automatically when the notebook or root document name changes, renaming same-title documents with an itemKey suffix.
- Uses SiYuan theme variables for the Dock panel and buttons so it adapts to light, dark, and third-party themes.
- Inserts numeric, author-date, or narrative citations from a multi-item selector and maintains a refreshable bibliography.
- Adds a right-click menu on citations: edit the citation (add or remove items), switch the form, switch the style, locate the entry in the bibliography, and refresh the citations of the current document.
- Keeps an undo stack for citation operations (20 steps per document, `Ctrl+Alt+Z`), covering the writes that the editor `Ctrl+Z` cannot reach.
- Stores the last rendered text of every cited item as a document snapshot, so entries deleted from Zotero or missing on another machine are still shown from the snapshot and explicitly reported.
- Makes the bibliography heading configurable and appends a ↗ link that selects the entry in Zotero.
- Shows a four-step getting started guide on first use, replayable from the settings.
- Offers "merge (fill empty fields only)" when importing, so duplicates do not have to be recreated.
- Applies default tags to every paper document after saving, keeping the tags you already set.
- Adds a citation key column to the paper database, with an optional `{author}{year}{title}` template used by the exports.
- Provides an environment check that reports the Zotero connection, the pdf2zh executable, and the secret configuration in one view.
- Shows live translation progress and failure reasons in the bottom-left status bar.
- Imports PDF highlights, comments, page numbers, and Zotero deep links into a managed Note annotation section without changing other content.
- Exports GB/T 7714, APA, IEEE, BibTeX/BibLaTeX, Typst, and LaTeX citations, plus Markdown, Word, and LaTeX documents.
- Provides safe initial Note templates with whitelisted metadata and if/range controls, never arbitrary JavaScript evaluation.
- Maps papers to native SiYuan database rows bound by paper document ID without duplicate rows on repeat sync.
- Imports CSL-JSON and BibTeX files, and retrieves metadata from DOI, arXiv, ISBN, PMID/PMCID, and URLs.
- Extracts XMP and limited text streams from local PDFs, showing metadata source and confidence; filenames are only low-confidence fallbacks.
- Uses an existing pdf2zh installation to create mono or dual PDF attachments while preserving originals, with bounded concurrency, per-item cancellation, failure cleanup, and process timeouts.
- Renumbers citations across a document tree, builds a managed `Reference` child document, and assigns cited papers to a stable Connected Documents collection.
- Exposes `ensure_papers`, `write_documents`, `refresh_library`, and `translate_paper` Agent Actions plus bounded eventBus library payloads.

## Requirements

- SiYuan 3.7.0 or later on Windows, macOS, or Linux desktop.
- Zotero 10 or later.
- Zotero must be running during import and synchronization.
- Enable **Allow other applications on this computer to communicate with Zotero** in Zotero **Settings → Advanced**.

Zotero 7, group libraries, mobile frontends, and the Zotero cloud Web API are not currently supported. Better BibTeX and debug-bridge are not required.

## Installation

### Manual installation

1. Download `package.zip` from this repository's [Releases](https://github.com/bnoij/siyuan-plugin-zotero-notes/releases).
2. Extract it into `data/plugins/siyuan-plugin-zotero-notes/` in your SiYuan workspace.
3. Restart SiYuan and enable **Zotero Notes** under **Settings → Marketplace → Downloaded**.

The plugin is being submitted to the SiYuan bazaar. Until it is listed there, install it from the Releases archive as described above.

## Usage

1. Open the plugin settings and select a destination notebook.
2. Keep the default root document name `Zotero`, or choose another name (existing notes migrate to the new root automatically).
3. Open the **Zotero Notes** Dock and refresh the library. This imports only the library index.
4. Click **Create note** on an item to create:
   - `Zotero/Paper title`: the plugin-managed metadata document;
   - `Zotero/Paper title/Note`: your writable note document.
5. Write in `Note`, click **Sync Note** in the button row below the item, review the Markdown preview, and confirm; or enable note auto-sync in the settings to upload changed notes automatically at the chosen interval.
6. On the first sync, approve the write request in Zotero. Choose **Always Allow** if you want Zotero to remember the local authorization.

Each item offers **Create/Open note**, **Refresh metadata**, **Sync Note**, **Import PDF annotations**, and **Select in Zotero**. Actions requiring an existing document stay disabled until it exists.

The top-bar plugin menu opens the multi-item citation selector and export dialog. Citation links keep stable itemKeys, bibliographies are formatted by the Zotero Local API, and refreshes update only plugin-marked bibliography blocks. Bibliographies and the PDF annotation section are managed regions rebuilt on refresh; do not write content there that you need to preserve. Exports are static output, not editable Zotero fields in Word; complex custom CSL in-text rules are not guaranteed to be reproduced exactly.

## Citation workflow (0.6.0)

- A citation is a link carrying the `zotero://` scheme: `[Author (2024)](zotero://select/library/items/KEY?f=author-date&zkeys=KEY)`. The `f=` parameter records the form of that site (`csl` for numeric, plus `author-date` and `narrative`), and `zkeys=` records every item cited there.
- Right-clicking a citation opens the menu: edit the citation (add or remove items), switch the form, switch the global style, locate the entry in the bibliography, refresh the citations of this document, or open the plugin settings.
- Numbers follow the order in which the citations first appear in the text. After removing a citation, run "refresh citations in this document" so the bibliography drops the entry as well.
- The bibliography is a managed region like the PDF annotation section: it is rebuilt on refresh, so do not keep content there that you need to preserve.
- When an item was deleted from Zotero or is missing on another machine, the bibliography falls back to the stored snapshot and marks the entry as "no longer in the Zotero library".
- Kernel writes do not enter the editor undo stack. Use "Undo the last citation operation" in the command palette, or `Ctrl+Alt+Z`, to step back through citation changes (20 steps kept per document).

## Interaction and recovery (0.5.1)

- In the editor, use `/zotero` to insert a citation, `/znote` to create or open a paper Note, and `/zexport` to export. The top-bar menu, command palette, document-title menu, and document-tree menu expose the same workflows.
- When a Note is missing, opening the item shows a recovery dialog. Rebuild the Note, claim an exact-path Note not owned by another item, or open only the paper page. Claiming preserves existing content and never changes the Zotero child note.
- When a paper page is missing, explicitly confirm rebuilding it with a new Note. An ordinary same-title document is claimed only after confirmation; documents bound to another item are never rebound. Deleted content cannot be restored by the plugin.
- **Advanced → Check broken bindings** inspects only on demand and opens the recovery flow for each issue; no background binding scan runs.
- Settings are grouped into Basic, Sync, Writing, Translation, and Advanced. Switching tabs does not save. Translation now exposes per-document request concurrency.
- The Dock keeps one primary action and moves secondary operations into **More**. Settings and dialogs use scrolling content, persistent actions, and single-column fields in narrow containers.

Version 0.5.2 adds two stability fixes: the document-creation lock falls back to an in-process mutex where Web Locks are unavailable, so recovering the same Note concurrently creates it only once; and the translation queue wait no longer uses an `unref` timer, so the timeout path settles reliably.

## Synchronization and conversion

Synchronization is **SiYuan `Note` → Zotero child note**, not real-time two-way sync.

SiYuan first exports standard Markdown and then converts it with Lute. Kramdown block attributes and `.sy` JSON are never sent to Zotero. Headings, lists, quotes, code, tables, and links use SiYuan's converter. Scripts, iframes, event handlers, and unsafe URLs are removed before writing.

Local PNG, JPEG, GIF, and WebP images are embedded into the Zotero note. Each image is limited to 5 MiB, with a 20 MiB total per sync. Missing or oversized images are removed and reported in the preview.

Zotero stores native notes as rich-text HTML; Markdown is the interchange format shown in the preview. If the Zotero note changes before a sync, the plugin reports a conflict instead of automatically overwriting it. Removing an item from Zotero never deletes its SiYuan documents.

Write personal content in `Note`; the paper document is maintained by the plugin. Reserved path characters in titles are replaced, and distinct same-title items receive an itemKey suffix.

## Privacy and data safety

Zotero traffic stays on `127.0.0.1:23119`. Settings, the library cache, document bindings, and remembered local write keys use SiYuan's private plugin storage. They are excluded from the release package and are not logged. Uninstalling the plugin does not delete paper documents or Zotero items. Your pdf2zh model provider is configured separately and may receive PDF content; review its privacy policy before translating.

Even with these safeguards, maintain independent backups while the plugin is in internal testing.

## Translation and advanced workflows (0.5.0)

Translation is optional. Install and configure a compatible pdf2zh yourself, then set its executable path, source/target languages, and 1–8 concurrent jobs in the plugin settings. The plugin does not install pdf2zh or deploy a model service. Items with paper notes offer **Translate** with mono or dual output. Translated files are written beside the source PDF and uploaded as new attachments; the original PDF and `Note` are never overwritten, and the same item cannot run twice concurrently.

When a model secret is needed, store it in SiYuan **Settings → Secrets and Variables**, then list only its environment variable name under **Translation secret names** (for example, `OPENAI_API_KEY`; separate names with commas). Only names are persisted in plugin settings. Values are read at runtime with `getSecret` and are never written to settings, logs, or eventBus payloads. Unlisted key/token/secret-like environment variables are not forwarded to the process.

**Cancel this translation** affects only the selected item; unloading the plugin stops scheduling and terminates every active process. Processes time out after 30 minutes, and Agent queue waits time out after 31 minutes. A failed upload deletes the newly created empty attachment with a version precondition; completed outputs are not deleted when another task fails. Automated tests use a stub CLI to verify real process creation, mono/dual outputs, nonzero exits, cancellation, and recovery. They do not establish that a particular pdf2zh release or translation model has passed real-engine validation.

The top-bar **Connected citations** action uses the active top-level document as its root, orders documents by path, renumbers their citations, and rebuilds a managed `Reference` child document. Do not write manual content in that document or its bibliography. The action then synchronizes `【【Connected Documents】】→ rootDocumentID`, adding only missing memberships and preserving all other collections. Missing Zotero keys are reported explicitly, and a database-version change triggers one refresh and retry.

Agent Actions are `ensure_papers`, `write_documents`, `refresh_library`, and `translate_paper`. Document conflict policies are `report` and `overwrite`; translation failures return the job error. The eventBus `GetFromPool` event returns at most 200 compact items and reports the full count separately as `total`; `Refresh` triggers a library refresh. Translation tasks and event listeners are cleaned up on unload.

## Templates, database, and import enhancements (0.4.0)

The **initial Note template** setting applies only to newly created Notes. Supported fields are `title`, `authors`, `year`, `journal`, `DOI`, `abstract`, `tags`, `noteLink`, and `itemKey`, plus `if`/`range` controls. Property chains and JavaScript evaluation are not supported. Existing Notes are never overwritten by template or metadata refreshes.

The top-bar **Paper database** action creates or opens a native database and synchronizes existing paper documents. Rows bind title, authors, year, journal, DOI, tags, and URL by paper document ID; repeat sync updates rather than duplicates or deletes rows.

**Import papers** accepts CSL-JSON and BibTeX files. **Retrieve / PDF import** accepts DOI, arXiv, ISBN, PMID/PMCID, URLs, and local PDFs. Results are previewed and editable before creation. Duplicates are skipped by default; selecting **Create duplicate** creates a real new item. Per-entry failures are reported without blocking valid imports.

PDF recognition uses XMP first, limited text streams second, and filenames only as low-confidence fallbacks. Review low-confidence results manually. Image-only PDFs do not receive OCR. arXiv DOIs missing from Crossref fall back to the arXiv Atom API. External metadata requests time out after 15 seconds.

## Kimi research workflow import (0.2.0)

The plugin exposes two generic operations: `ensure_papers` ensures that Zotero items, paper documents, `Note` documents, and bindings exist; `write_documents` writes caller-provided Markdown unchanged. Kimi Work remains responsible for recommendations, candidate deduplication, report/analysis content, and conflict policy. The plugin does not generate daily reports or overwrite conflicts on its own.

Kimi Work submits jobs through `/api/file/putFile` under `data/storage/petal/siyuan-plugin-zotero-notes/jobs/pending/`. The plugin claims jobs every 2 seconds and writes results through `processing/` into `completed/` or `failed/`. Disable **Kimi research import queue** in the settings to turn off this channel. Job files never contain the Zotero write key.

`write_documents` checks `expectedHash` before writing. A changed document returns `conflict` unless the caller explicitly sets `onConflict: "overwrite"`. `custom-research-content-hash` stores the normalized hash after import. The existing `custom-zotero-server-id`, `custom-zotero-item-key`, `custom-zotero-note-doc-id`, and `custom-zotero-note-key` attributes remain the source of truth for item binding and Note synchronization.

Background imports reuse `createOrOpenExclusive({openTab:false})`, producing the same `Zotero/Paper title/Note` structure as manual creation. AI analysis written into `Note` can therefore use the existing preview, sync, and auto-sync features.

Every `ensure_papers` run first ensures that the personal library has a `daily` collection, creating it when absent. New items are assigned immediately; existing items missing the collection are updated with PATCH without duplication or removing their other collections.

## Development

The plugin is directly loadable CommonJS with no npm dependencies and no build step. Runtime files are located at the repository root.

A release archive mirrors the repository layout: `plugin.json`, `index.js`, `index.css`, `i18n/`, both README files, `icon.png`, `preview.png`, `LICENSE`, `package.json`, and the `tests/` suite at its root.

### Automated checks

With Node.js 22 or later, run `npm test` for lifecycle and multi-window regressions, or `npm run check` for both syntax and tests. The tests cover startup persistence, unchanged-cache writes, `onDataChanged`, background imports, cross-window binding merges, origin-wide document-creation locks, and the citation interaction (right-click actions, renumbering, snapshot fallback, undo). The `tests/` suite ships with the archive so the checks can be reproduced from the downloaded package; the plugin never loads those files at runtime.

### Development notes

[docs/development-lessons.zh_CN.md](docs/development-lessons.zh_CN.md) records the engineering lessons accumulated across the 0.1.x–0.5.x cycles: reproducing issues from real exported data before changing code, verifying external API parameters against official docs, the incremental-sync approach for Zotero, the export sanitising layer, rendered previews with explicit format-loss warnings, in-process locking fallbacks, and the per-release delivery checklist (version bump, tests, repackage, reload in SiYuan, commit and push).

## Feedback

Please use [GitHub Issues](https://github.com/bnoij/siyuan-plugin-zotero-notes/issues) for bug reports and suggestions. Include your SiYuan and Zotero versions, reproduction steps, expected behavior, and actual behavior. Do not attach private library data, API keys, or authorization tokens.

## References

- [Zotero Local API](https://www.zotero.org/support/dev/web_api/v3/local_api)
- [SiYuan API](https://github.com/siyuan-note/siyuan/blob/master/API.md)
- [SiYuan Plugin Sample](https://github.com/siyuan-note/plugin-sample)

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

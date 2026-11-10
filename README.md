# Zotero Notes for SiYuan

[简体中文](README_zh_CN.md)

A SiYuan desktop plugin for browsing a Zotero 10+ library, creating paper notes on demand, and syncing a SiYuan `Note` document back to the corresponding Zotero item.

> **Internal testing preview**
>
> This plugin is still undergoing internal testing. Back up your SiYuan workspace and Zotero data before use, and avoid using it as the only copy of important notes. Please test first in a non-production workspace. Bug reports, reproduction steps, and feature suggestions are welcome through [GitHub Issues](https://github.com/bnoij/siyuan-plugin-zotero-notes/issues).

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

The plugin is not yet listed in the SiYuan bazaar. Marketplace availability will be announced after the testing and release process is complete.

## Usage

1. Open the plugin settings and select a destination notebook.
2. Keep the default root document name `Zotero`, or choose another name (existing notes migrate to the new root automatically).
3. Open the **Zotero Notes** Dock and refresh the library. This imports only the library index.
4. Click **Create note** on an item to create:
   - `Zotero/Paper title`: the plugin-managed metadata document;
   - `Zotero/Paper title/Note`: your writable note document.
5. Write in `Note`, click **Sync Note** in the button row below the item, review the Markdown preview, and confirm; or enable note auto-sync in the settings to upload changed notes automatically at the chosen interval.
6. On the first sync, approve the write request in Zotero. Choose **Always Allow** if you want Zotero to remember the local authorization.

Each item has the same row of four framed buttons below it: **Create/Open note**, **Refresh metadata**, **Sync Note**, and **Select in Zotero**. The last two are disabled until a note exists; clicking the item title also opens its document. Clicking the plugin icon in the top bar opens the settings page.

## Synchronization and conversion

Synchronization is **SiYuan `Note` → Zotero child note**, not real-time two-way sync.

SiYuan first exports standard Markdown and then converts it with Lute. Kramdown block attributes and `.sy` JSON are never sent to Zotero. Headings, lists, quotes, code, tables, and links use SiYuan's converter. Scripts, iframes, event handlers, and unsafe URLs are removed before writing.

Local PNG, JPEG, GIF, and WebP images are embedded into the Zotero note. Each image is limited to 5 MiB, with a 20 MiB total per sync. Missing or oversized images are removed and reported in the preview.

Zotero stores native notes as rich-text HTML; Markdown is the interchange format shown in the preview. If the Zotero note changes before a sync, the plugin reports a conflict instead of automatically overwriting it. Removing an item from Zotero never deletes its SiYuan documents.

Write personal content in `Note`; the paper document is maintained by the plugin. Reserved path characters in titles are replaced, and distinct same-title items receive an itemKey suffix.

## Privacy and data safety

Zotero traffic stays on `127.0.0.1:23119`. Settings, the library cache, document bindings, and remembered local write keys use SiYuan's private plugin storage. They are excluded from the release package and are not logged. Uninstalling the plugin does not delete paper documents or Zotero items.

Even with these safeguards, maintain independent backups while the plugin is in internal testing.

## Kimi research workflow import (0.2.0)

The plugin exposes two generic operations: `ensure_papers` ensures that Zotero items, paper documents, `Note` documents, and bindings exist; `write_documents` writes caller-provided Markdown unchanged. Kimi Work remains responsible for recommendations, candidate deduplication, report/analysis content, and conflict policy. The plugin does not generate daily reports or overwrite conflicts on its own.

Kimi Work submits jobs through `/api/file/putFile` under `data/storage/petal/siyuan-plugin-zotero-notes/jobs/pending/`. The plugin claims jobs every 2 seconds and writes results through `processing/` into `completed/` or `failed/`. Disable **Kimi research import queue** in the settings to turn off this channel. Job files never contain the Zotero write key.

`write_documents` checks `expectedHash` before writing. A changed document returns `conflict` unless the caller explicitly sets `onConflict: "overwrite"`. `custom-research-content-hash` stores the normalized hash after import. The existing `custom-zotero-server-id`, `custom-zotero-item-key`, `custom-zotero-note-doc-id`, and `custom-zotero-note-key` attributes remain the source of truth for item binding and Note synchronization.

Background imports reuse `createOrOpenExclusive({openTab:false})`, producing the same `Zotero/Paper title/Note` structure as manual creation. AI analysis written into `Note` can therefore use the existing preview, sync, and auto-sync features.

Every `ensure_papers` run first ensures that the personal library has a `daily` collection, creating it when absent. New items are assigned immediately; existing items missing the collection are updated with PATCH without duplication or removing their other collections.

## Development

The plugin is directly loadable CommonJS with no npm dependencies and no build step. Runtime files are located at the repository root.

A release archive contains `plugin.json`, `index.js`, `index.css`, `i18n/`, both README files, `icon.png`, `preview.png`, and `LICENSE` at its root.

### Automated checks

With Node.js 22 or later, run `npm test` for lifecycle and multi-window regressions, or `npm run check` for both syntax and tests. The tests cover startup persistence, unchanged-cache writes, `onDataChanged`, background imports, cross-window binding merges, and origin-wide document-creation locks. Development-only test files are excluded from `package.zip`.

## Feedback

Please use [GitHub Issues](https://github.com/bnoij/siyuan-plugin-zotero-notes/issues) for bug reports and suggestions. Include your SiYuan and Zotero versions, reproduction steps, expected behavior, and actual behavior. Do not attach private library data, API keys, or authorization tokens.

## References

- [Zotero Local API](https://www.zotero.org/support/dev/web_api/v3/local_api)
- [SiYuan API](https://github.com/siyuan-note/siyuan/blob/master/API.md)
- [SiYuan Plugin Sample](https://github.com/siyuan-note/plugin-sample)

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

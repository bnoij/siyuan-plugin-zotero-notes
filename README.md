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
- Shows a sync preview, updates the same child note on later syncs, and uses version preconditions to avoid overwriting conflicting edits.

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
2. Keep the default root document name `Zotero`, or choose another name.
3. Open the **Zotero Notes** Dock and refresh the library. This imports only the library index.
4. Click **Create note** on an item to create:
   - `Zotero/Paper title`: the plugin-managed metadata document;
   - `Zotero/Paper title/Note`: your writable note document.
5. Write in `Note`, click **Sync Note** (`⇧`), review the Markdown preview, and confirm.
6. On the first sync, approve the write request in Zotero. Choose **Always Allow** if you want Zotero to remember the local authorization.

Click an item title to open its document, `↻` to refresh metadata, or `Z` to select the item in Zotero.

## Synchronization and conversion

Synchronization is **SiYuan `Note` → Zotero child note**, not real-time two-way sync.

SiYuan first exports standard Markdown and then converts it with Lute. Kramdown block attributes and `.sy` JSON are never sent to Zotero. Headings, lists, quotes, code, tables, and links use SiYuan's converter. Scripts, iframes, event handlers, and unsafe URLs are removed before writing.

Local PNG, JPEG, GIF, and WebP images are embedded into the Zotero note. Each image is limited to 5 MiB, with a 20 MiB total per sync. Missing or oversized images are removed and reported in the preview.

Zotero stores native notes as rich-text HTML; Markdown is the interchange format shown in the preview. If the Zotero note changes before a sync, the plugin reports a conflict instead of automatically overwriting it. Removing an item from Zotero never deletes its SiYuan documents.

Write personal content in `Note`; the paper document is maintained by the plugin. Reserved path characters in titles are replaced, and distinct same-title items receive an itemKey suffix.

## Privacy and data safety

Zotero traffic stays on `127.0.0.1:23119`. Settings, the library cache, document bindings, and remembered local write keys use SiYuan's private plugin storage. They are excluded from the release package and are not logged. Uninstalling the plugin does not delete paper documents or Zotero items.

Even with these safeguards, maintain independent backups while the plugin is in internal testing.

## Development

The plugin is directly loadable CommonJS with no npm dependencies and no build step. Runtime files are located at the repository root.

A release archive contains `plugin.json`, `index.js`, `index.css`, `i18n/`, both README files, `icon.png`, `preview.png`, and `LICENSE` at its root.

## Feedback

Please use [GitHub Issues](https://github.com/bnoij/siyuan-plugin-zotero-notes/issues) for bug reports and suggestions. Include your SiYuan and Zotero versions, reproduction steps, expected behavior, and actual behavior. Do not attach private library data, API keys, or authorization tokens.

## References

- [Zotero Local API](https://www.zotero.org/support/dev/web_api/v3/local_api)
- [SiYuan API](https://github.com/siyuan-note/siyuan/blob/master/API.md)
- [SiYuan Plugin Sample](https://github.com/siyuan-note/plugin-sample)

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

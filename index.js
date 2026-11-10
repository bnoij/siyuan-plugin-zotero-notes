const { Plugin, Dialog, Setting, showMessage, openTab } = require("siyuan");

const PLUGIN_NAME = "siyuan-plugin-zotero-notes";
const ZOTERO_API = "http://127.0.0.1:23119/api";
const USER_PREFIX = "/users/0";
const PAGE_SIZE = 100;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 20 * 1024 * 1024;
const ATTR_SERVER = "custom-zotero-server-id";
const ATTR_ITEM = "custom-zotero-item-key";
const ATTR_NOTE_DOC = "custom-zotero-note-doc-id";
const ATTR_NOTE_KEY = "custom-zotero-note-key";
const DEFAULT_SETTINGS = {
    notebook: "",
    rootName: "Zotero",
    autoImport: true,
    authorLimit: 0,
    librarySyncInterval: 0,
    noteSyncInterval: 0,
    syncMode: "incremental",
    workflowQueueEnabled: true
};
const FALLBACK = {
    pluginName: "Zotero 笔记",
    library: "我的文库",
    refresh: "刷新文库",
    search: "搜索标题、作者、年份或标签",
    settings: "设置",
    notebook: "笔记存放笔记本",
    notebookTip: "论文文档将创建在所选笔记本的 Zotero 根文档下。",
    rootName: "根文档名称",
    rootNameTip: "默认是 Zotero；修改后，已有的论文笔记会自动迁移到新的根文档下。",
    autoImport: "启动时自动导入",
    autoImportTip: "自动读取 Zotero 文库索引，不会批量创建思源文档。",
    authorLimit: "作者显示数量",
    authorLimitTip: "文献列表中最多显示的作者数，超出的作者以“等”省略；0 表示不限制。",
    etAl: "等",
    librarySyncInterval: "文库自动同步间隔（分钟）",
    librarySyncIntervalTip: "每隔多少分钟自动从 Zotero 刷新文库索引；0 表示关闭自动同步。",
    noteSyncInterval: "Note 自动回传间隔（分钟）",
    noteSyncIntervalTip: "每隔多少分钟自动把内容有变化的 Note 回传到 Zotero；0 表示关闭。",
    syncMode: "文库同步方式",
    syncModeTip: "增量同步先比对 Zotero 本地版本号，只拉取有变化的条目并识别删除，大幅减少刷新耗时；全量同步每次拉取整个文库。",
    workflowQueueEnabled: "Kimi 研究导入队列",
    workflowQueueEnabledTip: "允许 Kimi Work 通过插件私有任务目录导入文献与 AI 内容；插件不会自行生成日报或覆盖冲突文档。",
    syncIncremental: "增量同步（推荐）",
    syncFull: "全量同步",
    testConnection: "测试 Zotero 连接",
    newNote: "新建笔记",
    openNote: "打开笔记",
    refreshMetadata: "刷新元数据",
    syncNote: "回传 Note",
    openZotero: "在 Zotero 中选中",
    uncategorized: "未分类条目",
    empty: "暂无文献，请点击刷新或检查 Zotero 连接。",
    loading: "正在从 Zotero 导入…",
    ready: "篇文献",
    cached: "缓存",
    stale: "已从 Zotero 移除",
    selectNotebook: "请先在插件设置中选择笔记本。",
    connectionSuccess: "Zotero 10+ 连接成功。",
    connectionFailed: "无法连接 Zotero 10+，请启动 Zotero 并在设置 → 高级中允许其他应用通信。",
    noteCreated: "论文文档和 Note 已创建。",
    metadataRefreshed: "元数据已刷新，Note 内容未修改。",
    syncPreview: "回传预览",
    syncPreviewTip: "以下为实际回传内容的渲染效果预览；下方列出上传后可能丢失的格式。",
    cancel: "取消",
    confirmSync: "确认回传",
    emptyNote: "Note 为空；继续回传会创建或更新为空笔记。",
    syncSuccess: "Note 已回传到 Zotero。",
    syncConflict: "Zotero 笔记已被其他操作修改。为避免覆盖，本次已停止；请处理冲突后重试。",
    authorizationDenied: "未获得 Zotero 写入授权。",
    unsupported: "部分内容未能转换",
    noTitle: "无标题",
    operationFailed: "操作失败",
    autoSyncDone: "Note 自动回传完成",
    migrationDone: "笔记迁移完成",
    migrationFailed: "失败",
    lossTitle: "上传后可能丢失的格式",
    lossNone: "未检测到可能丢失的格式。",
    lossMath: "数学公式（LaTeX）：公式渲染将丢失，仅保留源码文本",
    lossTaskList: "任务列表：勾选框将丢失，仅保留文字",
    lossEmbed: "嵌入内容（iframe、音视频等）：播放器将被移除",
    lossDetails: "折叠块：折叠交互将丢失，内容保留",
    lossHighlight: "高亮文本（==文字==）：高亮样式将丢失，文字保留",
    lossCodeHighlight: "代码块语法高亮：代码内容保留，高亮配色丢失",
    lossInlineStyle: "文字颜色等行内样式：样式将丢失，文字保留",
    lossImageStyle: "图片尺寸与对齐属性：仅保留图片本身与替代文字",
    lossIndent: "段落缩进：缩进样式将丢失，文字保留",
    lossBlockRef: "思源块引用与思源链接：在 Zotero 中无法跳转回思源"
};
const PLUGIN_ICONS = `
<symbol id="zoteroNotesIconNote" viewBox="0 0 16 16"><path d="M4 1.5h5.3L13 5.2v8.3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M9.3 1.5V5.2H13" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M5.8 11.4h4.4M5.8 8.7h4.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></symbol>
<symbol id="zoteroNotesIconRefresh" viewBox="0 0 16 16"><path d="M13.4 8a5.4 5.4 0 1 1-1.58-3.82" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M13.6 1.7v2.8h-2.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="zoteroNotesIconUpload" viewBox="0 0 16 16"><path d="M8 10.4V3.4M5 6.4l3-3 3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.6 10.8v1.7a1 1 0 0 0 1 1h8.8a1 1 0 0 0 1-1v-1.7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></symbol>
<symbol id="zoteroNotesIconZotero" viewBox="0 0 16 16"><path d="M3.2 2.5h9.6v1.9L7 12.4h5.8v1.9H3.2v-1.9L9 4.4H3.2z" fill="currentColor"/></symbol>`;

function element(tag, className, content) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (content !== undefined && content !== null) result.textContent = String(content);
    return result;
}

function errorMessage(error) {
    if (error instanceof Error) return error.message;
    return String(error || "Unknown error");
}

function cleanText(value) {
    return String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
}

function markdownText(value) {
    return cleanText(value)
        .replace(/\\/g, "\\\\")
        .replace(/([`*_[\]<>])/g, "\\$1")
        .replace(/\r?\n/g, " ");
}

function tableText(value) {
    return markdownText(value).replace(/\|/g, "\\|");
}

function markdownLinkText(value) {
    return tableText(value);
}

function safeDocumentTitle(value, itemKey) {
    const title = cleanText(value)
        .replace(/[\\/:*?"<>|]/g, " - ")
        .replace(/\s+/g, " ")
        .replace(/[. ]+$/g, "")
        .slice(0, 160)
        .trim();
    return title || `Untitled ${itemKey}`;
}

function clampInteger(value, min, max, fallback) {
    const number = Number.parseInt(value, 10);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
}

function authorList(item) {
    return (item?.data?.creators || [])
        .filter((creator) => !creator.creatorType || creator.creatorType === "author")
        .map((creator) => cleanText(creator.name) || cleanText(`${creator.firstName || ""} ${creator.lastName || ""}`))
        .filter(Boolean);
}

function itemTitle(item) {
    return cleanText(item?.data?.title) || cleanText(item?.meta?.creatorSummary) || item?.key || "Untitled";
}

function itemYear(item) {
    const match = cleanText(item?.data?.date).match(/(?:19|20)\d{2}/);
    return match ? match[0] : "";
}

function itemAuthors(item) {
    return authorList(item).join(", ");
}

function isRegularItem(item) {
    const data = item?.data || {};
    return !data.parentItem && !["note", "attachment", "annotation"].includes(data.itemType);
}

function safeExternalURL(value) {
    const url = cleanText(value);
    return /^(?:https?|zotero|siyuan|file|mailto):/i.test(url) ? url : "";
}

function createWriteToken() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
}

function libraryFingerprint(library) {
    const collections = [...(library.collections || [])].sort((a, b) => a.key.localeCompare(b.key));
    const items = [...(library.items || [])].sort((a, b) => a.key.localeCompare(b.key));
    return stableStringify({ serverID: library.serverID, collections, items });
}

function diffObjectVersions(cachedObjects, newVersions) {
    const cached = cachedObjects || {};
    const versions = newVersions && typeof newVersions === "object" ? newVersions : {};
    const changed = [];
    const deleted = [];
    Object.entries(versions).forEach(([key, version]) => {
        if (!cached[key] || cached[key].version !== version) changed.push(key);
    });
    Object.keys(cached).forEach((key) => {
        if (!(key in versions)) deleted.push(key);
    });
    return { changed, deleted };
}

function composeLibraryFromObjects(serverID, itemObjects, collectionObjects, importedAt) {
    const allItems = Object.values(itemObjects || {});
    const items = allItems.filter(isRegularItem).map((item) => ({
        ...item,
        attachments: allItems.filter((child) => child?.data?.parentItem === item.key && child?.data?.itemType === "attachment"),
        stale: false
    }));
    items.sort((a, b) => itemTitle(a).localeCompare(itemTitle(b), undefined, { sensitivity: "base" }));
    const latest = allItems.reduce((result, item) => {
        const modified = Date.parse(item.data?.dateModified || "");
        return Number.isFinite(modified) ? Math.max(result, modified) : result;
    }, importedAt || 0);
    return {
        serverID: serverID || "",
        itemObjects: itemObjects || {},
        collectionObjects: collectionObjects || {},
        collections: Object.values(collectionObjects || {}),
        items,
        importedAt: latest
    };
}

function cacheToLibrary(cache) {
    if (!cache || typeof cache !== "object") return null;
    if (cache.itemObjects && cache.collectionObjects) {
        const library = composeLibraryFromObjects(cache.serverID, cache.itemObjects, cache.collectionObjects, 0);
        library.importedAt = cache.importedAt || 0;
        return library;
    }
    if (Array.isArray(cache.items) && Array.isArray(cache.collections)) {
        const itemObjects = {};
        cache.items.forEach((item) => {
            if (!item?.key) return;
            const { attachments, ...rest } = item;
            itemObjects[item.key] = rest;
            (attachments || []).forEach((attachment) => {
                if (attachment?.key) itemObjects[attachment.key] = attachment;
            });
        });
        const collectionObjects = {};
        cache.collections.forEach((collection) => {
            if (collection?.key) collectionObjects[collection.key] = collection;
        });
        const library = composeLibraryFromObjects(cache.serverID, itemObjects, collectionObjects, 0);
        library.importedAt = cache.importedAt || 0;
        return library;
    }
    return null;
}

function stableHash(value) {
    const text = String(value || "");
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
}

function isDirectChildOfRoot(hpath, rootHPath) {
    if (!hpath || !rootHPath) return false;
    const prefix = `${rootHPath}/`;
    if (!hpath.startsWith(prefix)) return false;
    return !hpath.slice(prefix.length).includes("/");
}

function collisionTitle(title, itemKey) {
    const suffix = `[${itemKey}]`;
    return title.endsWith(suffix) ? title : `${title} ${suffix}`;
}

function prepareNoteMarkdown(exported) {
    return String(exported || "")
        .replace(/^# Note(?:\r?\n){2}/, "")
        .replace(/<p class="indent--\d+">([\s\S]*?)<\/p>/g, "$1")
        .replace(/[​-‍﻿]/g, "")
        .split(/\r?\n/)
        .map((line) => /^[\s　]*$/.test(line) ? "" : line)
        .join("\n");
}

function analyzeFormatLosses(markdown, html) {
    const md = String(markdown || "");
    const markup = String(html || "");
    const losses = [];
    if (/<math[\s>]|<svg[\s>]|language-math/i.test(markup)
        || /\$\$[\s\S]+?\$\$|\\\(|\\\[/.test(md)
        || /(^|[^\w$])\$[^\s$][^$\n]*?\$/.test(md)) losses.push("Math");
    if (/<input[^>]*type="checkbox"/i.test(markup) || /^\s*[-*]\s+\[[ xX]\]/m.test(md)) losses.push("TaskList");
    if (/<(?:iframe|video|audio|object|embed)[\s>]/i.test(markup)) losses.push("Embed");
    if (/<(?:details|summary)[\s>]/i.test(markup)) losses.push("Details");
    if (/==[^=\n]+==/.test(md)) losses.push("Highlight");
    if (/<pre[\s>]|<code[\s>]/i.test(markup)) losses.push("CodeHighlight");
    if (/<(?:span|div|p|font)[^>]*\sstyle=/i.test(markup)) losses.push("InlineStyle");
    if (/<img[^>]*\s(?:width|height|style)=/i.test(markup)) losses.push("ImageStyle");
    if (/<p class="indent--\d+"/i.test(md)) losses.push("Indent");
    if (/siyuan:\/\//i.test(markup) || /\(\(/.test(md)) losses.push("BlockRef");
    return losses;
}

class ZoteroNotesPlugin extends Plugin {
    async onload() {
        this.abortController = new AbortController();
        this.library = { serverID: "", collections: [], items: [], importedAt: 0 };
        this.bindings = {};
        this.writeKeys = {};
        this.expanded = new Set();
        this.searchQuery = "";
        this.operationQueue = Promise.resolve();
        this.refreshing = false;
        this.dockElement = null;
        this.librarySyncTimer = null;
        this.noteSyncTimer = null;
        this.addIcons(PLUGIN_ICONS);
        const [settings, cache, bindings, writeKeys] = await Promise.all([
            this.loadData("settings.json"),
            this.loadData("library-cache.json"),
            this.loadData("bindings.json"),
            this.loadData("zotero-write-keys.json")
        ]);
        this.settings = this.normalizeSettings(settings);
        this.bindings = bindings && typeof bindings === "object" ? bindings : {};
        this.writeKeys = writeKeys && typeof writeKeys === "object" ? writeKeys : {};
        const cachedLibrary = cacheToLibrary(cache);
        if (cachedLibrary) this.library = cachedLibrary;
        this.initSetting();
        this.addDock({
            config: {
                position: "LeftTop",
                size: { width: 320, height: 0 },
                icon: "iconBookmark",
                title: this.t("pluginName")
            },
            data: {},
            type: "zotero-notes-dock",
            init: (dock) => {
                this.dockElement = dock.element;
                this.buildDock();
                this.render();
            },
            destroy: () => {
                this.dockElement = null;
            }
        });
        this.addTopBar({
            icon: "iconBookmark",
            title: this.t("pluginName"),
            position: "right",
            contextMenu: (menu) => {
                menu.addItem({ icon: "iconRefresh", label: this.t("refresh"), click: () => this.refreshLibrary(true) });
                menu.addItem({ icon: "iconSettings", label: this.t("settings"), click: () => this.openSetting() });
            },
            callback: () => this.openSetting()
        });
        this.startAutoSync();
    }

    async onLayoutReady() {
        await this.rebuildBindings();
        this.startWorkflowQueue();
        if (this.settings.autoImport) {
            this.refreshLibrary(false).catch((error) => {
                if (error.name !== "AbortError") this.renderStatus(errorMessage(error));
            });
        } else this.render();
    }

    async onDataChanged() {
        const revision = (this.dataChangeRevision || 0) + 1;
        this.dataChangeRevision = revision;
        const [settings, cache, bindings, writeKeys] = await Promise.all([
            this.loadData("settings.json"),
            this.loadData("library-cache.json"),
            this.loadData("bindings.json"),
            this.loadData("zotero-write-keys.json")
        ]);
        if (revision !== this.dataChangeRevision) return;
        this.settings = this.normalizeSettings(settings);
        this.bindings = { ...this.bindings, ...(bindings && typeof bindings === "object" ? bindings : {}) };
        this.writeKeys = writeKeys && typeof writeKeys === "object" ? writeKeys : {};
        this.library = cacheToLibrary(cache) || { serverID: "", collections: [], items: [], importedAt: 0 };
        if (this.settingControls) {
            this.settingControls.notebookSelect.value = this.settings.notebook;
            this.settingControls.rootInput.value = this.settings.rootName;
            this.settingControls.autoImport.checked = this.settings.autoImport;
            this.settingControls.authorLimitInput.value = this.settings.authorLimit;
            this.settingControls.librarySyncInput.value = this.settings.librarySyncInterval;
            this.settingControls.noteSyncInput.value = this.settings.noteSyncInterval;
            this.settingControls.syncModeSelect.value = this.settings.syncMode;
            this.settingControls.workflowQueueEnabled.checked = this.settings.workflowQueueEnabled;
        }
        this.startAutoSync();
        this.stopWorkflowQueue();
        this.startWorkflowQueue();
        this.render();
    }

    onunload() {
        this.dataChangeRevision = (this.dataChangeRevision || 0) + 1;
        this.abortController.abort();
        this.stopAutoSync();
        this.stopWorkflowQueue();
        this.dockElement = null;
    }

    normalizeSettings(settings) {
        const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
        merged.notebook = typeof merged.notebook === "string" ? merged.notebook : "";
        merged.rootName = cleanText(merged.rootName) || DEFAULT_SETTINGS.rootName;
        merged.autoImport = !!merged.autoImport;
        merged.authorLimit = clampInteger(merged.authorLimit, 0, 99, DEFAULT_SETTINGS.authorLimit);
        merged.librarySyncInterval = clampInteger(merged.librarySyncInterval, 0, 1440, DEFAULT_SETTINGS.librarySyncInterval);
        merged.noteSyncInterval = clampInteger(merged.noteSyncInterval, 0, 1440, DEFAULT_SETTINGS.noteSyncInterval);
        merged.syncMode = merged.syncMode === "full" ? "full" : "incremental";
        merged.workflowQueueEnabled = merged.workflowQueueEnabled !== false;
        return merged;
    }

    formatAuthors(authors, limit, etAl) {
        const list = Array.isArray(authors) ? authors.filter(Boolean) : [];
        if (limit > 0 && list.length > limit) {
            return `${list.slice(0, limit).join(", ")}, ${etAl || "et al."}`;
        }
        return list.join(", ");
    }

    t(key) {
        return this.i18n?.[key] || FALLBACK[key] || key;
    }

    bindingKey(itemKey, serverID = this.library.serverID) {
        return `${serverID || "unknown"}:${itemKey}`;
    }

    startAutoSync() {
        this.stopAutoSync();
        if (this.settings.librarySyncInterval > 0) {
            this.librarySyncTimer = setInterval(() => {
                this.refreshLibrary(false);
            }, this.settings.librarySyncInterval * 60 * 1000);
        }
        if (this.settings.noteSyncInterval > 0) {
            this.noteSyncTimer = setInterval(() => {
                this.enqueue(() => this.autoSyncNotes());
            }, this.settings.noteSyncInterval * 60 * 1000);
        }
    }

    stopAutoSync() {
        if (this.librarySyncTimer) {
            clearInterval(this.librarySyncTimer);
            this.librarySyncTimer = null;
        }
        if (this.noteSyncTimer) {
            clearInterval(this.noteSyncTimer);
            this.noteSyncTimer = null;
        }
    }

    async autoSyncNotes() {
        if (!this.library.serverID || this.refreshing) return;
        try {
            await this.zoteroPage(`${USER_PREFIX}/items?limit=1`);
        } catch {
            return;
        }
        const entries = Object.values(this.bindings).filter((binding) =>
            binding?.noteDocId
            && binding.serverID === this.library.serverID
            && !binding.stale
            && this.library.items.some((item) => item.key === binding.itemKey));
        let uploaded = 0;
        let failed = 0;
        for (const binding of entries) {
            try {
                const changed = await this.withOperationLock(binding.itemKey, async () => {
                    const item = this.library.items.find((candidate) => candidate.key === binding.itemKey);
                    const exported = String(await this.request("/api/lute/copyStdMarkdown", { id: binding.noteDocId }) || "");
                    const markdown = prepareNoteMarkdown(exported);
                    const hash = stableHash(markdown);
                    if (hash === binding.noteHash) return false;
                    const converted = await this.request("/api/lute/md2html", { markdown, mode: "" });
                    const sanitized = await this.sanitizeNoteHTML(converted?.html || "");
                    await this.syncNote(item, binding, sanitized.html);
                    binding.noteHash = hash;
                    await this.saveBinding(binding);
                    return true;
                });
                if (changed) uploaded++;
            } catch (error) {
                if (error.status === 412) continue;
                failed++;
            }
        }
        if (uploaded || failed) {
            showMessage(`${this.t("autoSyncDone")} · ${uploaded} ✓${failed ? ` · ${failed} ✗` : ""}`, 6000);
        }
    }

    async migrateBindings() {
        if (!this.settings.notebook) return;
        return this.withExclusiveLock(`${PLUGIN_NAME}:migrate`, async () => {
            let migrated = 0;
            let failed = 0;
            try {
                await this.rebuildBindings();
                const root = await this.ensureRoot();
                const rootHPath = await this.request("/api/filetree/getHPathByID", { id: root.id });
                for (const binding of Object.values(this.bindings)) {
                    if (!binding?.parentDocId) continue;
                    try {
                        const hpath = await this.request("/api/filetree/getHPathByID", { id: binding.parentDocId });
                        if (!hpath || isDirectChildOfRoot(hpath, rootHPath)) continue;
                        const segments = hpath.split("/").filter(Boolean);
                        const title = segments[segments.length - 1] || "";
                        if (!title) {
                            failed++;
                            continue;
                        }
                        const existing = await this.request("/api/filetree/getIDsByHPath", {
                            notebook: this.settings.notebook,
                            path: `${rootHPath}/${title}`
                        });
                        if (existing?.length && !existing.includes(binding.parentDocId)) {
                            await this.request("/api/filetree/renameDocByID", {
                                id: binding.parentDocId,
                                title: collisionTitle(title, binding.itemKey)
                            });
                        }
                        await this.request("/api/filetree/moveDocsByID", {
                            fromIDs: [binding.parentDocId],
                            toID: root.id
                        });
                        migrated++;
                    } catch {
                        failed++;
                    }
                }
            } catch (error) {
                if (error.name !== "AbortError") {
                    showMessage(`${this.t("migrationFailed")}: ${errorMessage(error)}`, 8000);
                }
                return;
            }
            if (migrated || failed) {
                showMessage(`${this.t("migrationDone")} · ${migrated} ✓${failed ? ` · ${failed} ✗` : ""}`, 6000);
            }
        });
    }

    async reloadBindingsFromStorage() {
        const bindings = await this.loadData("bindings.json");
        this.bindings = { ...this.bindings, ...(bindings && typeof bindings === "object" ? bindings : {}) };
        this.render();
    }

    withExclusiveLock(name, operation) {
        if (globalThis.navigator?.locks?.request) {
            return globalThis.navigator.locks.request(name, {
                mode: "exclusive",
                signal: this.abortController.signal
            }, operation);
        }
        return operation();
    }

    withOperationLock(itemKey, operation) {
        return this.withExclusiveLock(`${PLUGIN_NAME}:item:${itemKey}`, operation);
    }

    withBindingsLock(operation) {
        return this.withExclusiveLock(`${PLUGIN_NAME}:bindings`, operation);
    }

    async request(url, data = {}, options = {}) {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            signal: options.signal || this.abortController.signal
        });
        if (!response.ok) throw new Error(`SiYuan ${response.status}: ${await response.text()}`);
        const result = await response.json();
        if (result.code !== 0) throw new Error(result.msg || `SiYuan API ${url} failed`);
        return result.data;
    }

    async zoteroRequest(path, options = {}) {
        const headers = {
            Accept: "application/json",
            "Zotero-API-Version": "3",
            "Zotero-Allowed-Request": "true",
            ...(options.headers || {})
        };
        if ((options.serverID || this.library.serverID) && options.allowServerChange !== true) {
            headers["Zotero-Server-ID"] = options.serverID || this.library.serverID;
        }
        if (options.apiKey) headers["Zotero-API-Key"] = options.apiKey;
        if (options.body !== undefined) headers["Content-Type"] = "application/json";
        const response = await fetch(`${ZOTERO_API}${path}`, {
            method: options.method || "GET",
            headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: options.signal || this.abortController.signal
        });
        const serverID = response.headers.get("Zotero-Server-ID") || "";
        if (serverID && this.library.serverID && serverID !== this.library.serverID && options.allowServerChange !== true) {
            const error = new Error("Zotero database changed; refresh the library before continuing.");
            error.status = 412;
            throw error;
        }
        const text = await response.text();
        let data = null;
        if (text) {
            try { data = JSON.parse(text); }
            catch { data = text; }
        }
        if (!response.ok) {
            const error = new Error(cleanText(data?.message || data || response.statusText));
            error.status = response.status;
            error.data = data;
            throw error;
        }
        return { data, response, serverID };
    }

    async zoteroPage(path) {
        const result = await this.zoteroRequest(path, { allowServerChange: true });
        if (result.serverID) this.library.serverID = result.serverID;
        return result;
    }

    async fetchAll(path) {
        const rows = [];
        let start = 0;
        while (true) {
            const separator = path.includes("?") ? "&" : "?";
            const { data, response } = await this.zoteroPage(`${path}${separator}start=${start}&limit=${PAGE_SIZE}`);
            if (!Array.isArray(data)) throw new Error("Unexpected Zotero response.");
            rows.push(...data);
            const total = Number(response.headers.get("Total-Results"));
            if (data.length < PAGE_SIZE || (Number.isFinite(total) && total > 0 && rows.length >= total)) break;
            start += PAGE_SIZE;
        }
        return rows;
    }

    async fullLibrary(serverID) {
        const [collections, allItems] = await Promise.all([
            this.fetchAll(`${USER_PREFIX}/collections`),
            this.fetchAll(`${USER_PREFIX}/items`)
        ]);
        const itemObjects = {};
        allItems.forEach((item) => {
            if (item?.key) itemObjects[item.key] = item;
        });
        const collectionObjects = {};
        collections.forEach((collection) => {
            if (collection?.key) collectionObjects[collection.key] = collection;
        });
        return composeLibraryFromObjects(serverID, itemObjects, collectionObjects, 0);
    }

    async incrementalLibrary(serverID) {
        const [itemVersions, collectionVersions] = await Promise.all([
            this.zoteroPage(`${USER_PREFIX}/items?format=versions`),
            this.zoteroPage(`${USER_PREFIX}/collections?format=versions`)
        ]);
        const itemDiff = diffObjectVersions(this.library.itemObjects, itemVersions.data);
        const collectionDiff = diffObjectVersions(this.library.collectionObjects, collectionVersions.data);
        const itemObjects = { ...this.library.itemObjects };
        const collectionObjects = { ...this.library.collectionObjects };
        itemDiff.deleted.forEach((key) => { delete itemObjects[key]; });
        collectionDiff.deleted.forEach((key) => { delete collectionObjects[key]; });
        if (itemDiff.changed.length) {
            const changedItems = await this.fetchObjectsByKeys(`${USER_PREFIX}/items`, "itemKey", itemDiff.changed);
            changedItems.forEach((item) => { itemObjects[item.key] = item; });
        }
        if (collectionDiff.changed.length) {
            const changedCollections = await this.fetchObjectsByKeys(`${USER_PREFIX}/collections`, "collectionKey", collectionDiff.changed);
            changedCollections.forEach((collection) => { collectionObjects[collection.key] = collection; });
        }
        return composeLibraryFromObjects(serverID, itemObjects, collectionObjects, 0);
    }

    async fetchObjectsByKeys(path, param, keys) {
        const rows = [];
        for (let start = 0; start < keys.length; start += 50) {
            const chunk = keys.slice(start, start + 50);
            const result = await this.zoteroPage(`${path}?${param}=${chunk.join(",")}`);
            if (!Array.isArray(result.data)) throw new Error("Unexpected Zotero response.");
            rows.push(...result.data);
        }
        return rows;
    }

    async refreshLibrary(notify) {
        if (this.refreshing) return;
        this.refreshing = true;
        this.renderStatus(this.t("loading"));
        try {
            const probe = await this.zoteroPage(`${USER_PREFIX}/items?limit=1`);
            if (!probe.serverID) throw new Error("Zotero 10+ is required; Zotero-Server-ID is missing.");
            const canIncremental = this.settings.syncMode !== "full"
                && this.library.serverID
                && this.library.serverID === probe.serverID
                && this.library.itemObjects;
            const nextLibrary = canIncremental
                ? await this.incrementalLibrary(probe.serverID)
                : await this.fullLibrary(probe.serverID);
            const nextBindings = Object.fromEntries(Object.entries(this.bindings).map(([key, binding]) => [key, { ...binding }]));
            const knownKeys = new Set(nextLibrary.items.map((item) => item.key));
            Object.values(nextBindings).forEach((binding) => {
                if (binding.serverID === probe.serverID) binding.stale = !knownKeys.has(binding.itemKey);
            });
            const changed = libraryFingerprint(nextLibrary) !== libraryFingerprint(this.library)
                || stableStringify(nextBindings) !== stableStringify(this.bindings);
            nextLibrary.importedAt = changed
                ? Math.max(nextLibrary.importedAt, this.library.importedAt || 0)
                : this.library.importedAt;
            this.library = nextLibrary;
            this.bindings = nextBindings;
            if (changed) {
                await this.withBindingsLock(async () => {
                    const stored = await this.loadData("bindings.json");
                    this.bindings = { ...this.bindings, ...(stored && typeof stored === "object" ? stored : {}) };
                    await Promise.all([
                        this.saveData("library-cache.json", {
                            serverID: this.library.serverID,
                            importedAt: this.library.importedAt,
                            itemObjects: this.library.itemObjects,
                            collectionObjects: this.library.collectionObjects
                        }),
                        this.saveData("bindings.json", this.bindings)
                    ]);
                });
            }
            this.render();
            if (notify) showMessage(`${this.t("importSuccess")}: ${items.length}`);
        } catch (error) {
            if (error.name !== "AbortError") {
                this.renderStatus(errorMessage(error));
                if (notify) showMessage(`${this.t("connectionFailed")} ${errorMessage(error)}`, 8000);
            }
        } finally {
            this.refreshing = false;
        }
    }

    initSetting() {
        const notebookSelect = document.createElement("select");
        notebookSelect.className = "b3-select fn__block";
        const rootInput = document.createElement("input");
        rootInput.className = "b3-text-field fn__block";
        rootInput.value = this.settings.rootName;
        const autoImport = document.createElement("input");
        autoImport.type = "checkbox";
        autoImport.checked = this.settings.autoImport;
        const authorLimitInput = document.createElement("input");
        authorLimitInput.type = "number";
        authorLimitInput.min = "0";
        authorLimitInput.max = "99";
        authorLimitInput.className = "b3-text-field fn__block";
        authorLimitInput.value = this.settings.authorLimit;
        const librarySyncInput = document.createElement("input");
        librarySyncInput.type = "number";
        librarySyncInput.min = "0";
        librarySyncInput.max = "1440";
        librarySyncInput.className = "b3-text-field fn__block";
        librarySyncInput.value = this.settings.librarySyncInterval;
        const noteSyncInput = document.createElement("input");
        noteSyncInput.type = "number";
        noteSyncInput.min = "0";
        noteSyncInput.max = "1440";
        noteSyncInput.className = "b3-text-field fn__block";
        noteSyncInput.value = this.settings.noteSyncInterval;
        const workflowQueueEnabled = document.createElement("input");
        workflowQueueEnabled.type = "checkbox";
        workflowQueueEnabled.checked = this.settings.workflowQueueEnabled;
        const syncModeSelect = document.createElement("select");
        syncModeSelect.className = "b3-select fn__block";
        [["incremental", this.t("syncIncremental")], ["full", this.t("syncFull")]].forEach(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            syncModeSelect.append(option);
        });
        syncModeSelect.value = this.settings.syncMode;
        this.settingControls = { notebookSelect, rootInput, autoImport, authorLimitInput, librarySyncInput, noteSyncInput, syncModeSelect, workflowQueueEnabled };
        const save = async () => {
            const previous = { notebook: this.settings.notebook, rootName: this.settings.rootName };
            this.settings = this.normalizeSettings({
                ...this.settings,
                notebook: notebookSelect.value,
                rootName: rootInput.value,
                autoImport: autoImport.checked,
                authorLimit: authorLimitInput.value,
                librarySyncInterval: librarySyncInput.value,
                noteSyncInterval: noteSyncInput.value,
                syncMode: syncModeSelect.value,
                workflowQueueEnabled: workflowQueueEnabled.checked
            });
            authorLimitInput.value = this.settings.authorLimit;
            librarySyncInput.value = this.settings.librarySyncInterval;
            noteSyncInput.value = this.settings.noteSyncInterval;
            await this.saveData("settings.json", this.settings);
            this.startAutoSync();
            this.stopWorkflowQueue();
            this.startWorkflowQueue();
            if (previous.notebook !== this.settings.notebook || previous.rootName !== this.settings.rootName) {
                this.enqueue(() => this.migrateBindings());
            }
        };
        this.setting = new Setting({ confirmCallback: save });
        this.setting.addItem({
            title: this.t("notebook"),
            description: this.t("notebookTip"),
            createActionElement: () => notebookSelect
        });
        this.setting.addItem({
            title: this.t("rootName"),
            description: this.t("rootNameTip"),
            actionElement: rootInput
        });
        this.setting.addItem({
            title: this.t("autoImport"),
            description: this.t("autoImportTip"),
            actionElement: autoImport
        });
        this.setting.addItem({
            title: this.t("authorLimit"),
            description: this.t("authorLimitTip"),
            actionElement: authorLimitInput
        });
        this.setting.addItem({
            title: this.t("librarySyncInterval"),
            description: this.t("librarySyncIntervalTip"),
            actionElement: librarySyncInput
        });
        this.setting.addItem({
            title: this.t("noteSyncInterval"),
            description: this.t("noteSyncIntervalTip"),
            actionElement: noteSyncInput
        });
        this.setting.addItem({
            title: this.t("syncMode"),
            description: this.t("syncModeTip"),
            actionElement: syncModeSelect
        });
        this.setting.addItem({
            title: this.t("workflowQueueEnabled"),
            description: this.t("workflowQueueEnabledTip"),
            actionElement: workflowQueueEnabled
        });
        const testButton = element("button", "b3-button b3-button--outline", this.t("testConnection"));
        testButton.addEventListener("click", async () => {
            testButton.disabled = true;
            try {
                const result = await this.zoteroPage(`${USER_PREFIX}/items?limit=1`);
                if (!result.serverID) throw new Error("Zotero 10+ required");
                await this.refreshLibrary(false);
                showMessage(this.t("connectionSuccess"));
            } catch (error) {
                showMessage(`${this.t("connectionFailed")} ${errorMessage(error)}`, 8000);
            } finally {
                testButton.disabled = false;
            }
        });
        this.setting.addItem({ title: this.t("testConnection"), actionElement: testButton });
        this.loadNotebooks(notebookSelect).catch((error) => showMessage(errorMessage(error)));
        notebookSelect.addEventListener("change", save);
        rootInput.addEventListener("change", save);
        autoImport.addEventListener("change", save);
        authorLimitInput.addEventListener("change", save);
        librarySyncInput.addEventListener("change", save);
        noteSyncInput.addEventListener("change", save);
        syncModeSelect.addEventListener("change", save);
        workflowQueueEnabled.addEventListener("change", save);
    }

    async loadNotebooks(select) {
        const data = await this.request("/api/notebook/lsNotebooks");
        const notebooks = (data?.notebooks || []).filter((notebook) => !notebook.closed);
        select.replaceChildren();
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "—";
        select.append(placeholder);
        notebooks.forEach((notebook) => {
            const option = document.createElement("option");
            option.value = notebook.id;
            option.textContent = notebook.name;
            select.append(option);
        });
        select.value = this.settings.notebook;
    }

    buildDock() {
        this.dockElement.replaceChildren();
        this.dockElement.classList.add("siyuan-plugin-zotero-notes__dock");
        const root = element("div", "siyuan-plugin-zotero-notes fn__flex-1 fn__flex-column");
        const toolbar = element("div", "siyuan-plugin-zotero-notes__toolbar");
        this.searchInput = document.createElement("input");
        this.searchInput.className = "b3-text-field siyuan-plugin-zotero-notes__search";
        this.searchInput.placeholder = this.t("search");
        this.searchInput.setAttribute("aria-label", this.t("search"));
        this.searchInput.value = this.searchQuery;
        this.searchInput.addEventListener("input", () => {
            this.searchQuery = this.searchInput.value;
            this.renderTree();
        });
        const refresh = element("button", "b3-button b3-button--outline siyuan-plugin-zotero-notes__icon", "↻");
        refresh.title = this.t("refresh");
        refresh.setAttribute("aria-label", this.t("refresh"));
        refresh.addEventListener("click", () => this.refreshLibrary(true));
        toolbar.append(this.searchInput, refresh);
        this.statusElement = element("div", "siyuan-plugin-zotero-notes__status");
        this.statusElement.setAttribute("role", "status");
        this.treeElement = element("div", "siyuan-plugin-zotero-notes__tree");
        root.append(toolbar, this.statusElement, this.treeElement);
        this.dockElement.append(root);
    }

    renderStatus(message) {
        if (this.statusElement) this.statusElement.textContent = message;
    }

    render() {
        if (!this.treeElement) return;
        const cacheSuffix = this.library.importedAt && !this.library.serverID ? ` · ${this.t("cached")}` : "";
        this.renderStatus(`${this.library.items.length} ${this.t("ready")}${cacheSuffix}`);
        this.renderTree();
    }

    renderTree() {
        if (!this.treeElement) return;
        this.treeElement.replaceChildren();
        const list = element("ul");
        list.setAttribute("role", "tree");
        const rootRow = element("li");
        const header = element("div", "siyuan-plugin-zotero-notes__collection");
        header.append(
            element("span", "siyuan-plugin-zotero-notes__toggle", "▾"),
            element("span", "siyuan-plugin-zotero-notes__folder", this.t("library")),
            element("span", "siyuan-plugin-zotero-notes__count", this.library.items.length)
        );
        rootRow.append(header);
        const content = element("ul");
        const query = this.searchQuery.trim().toLocaleLowerCase();
        if (query) {
            this.library.items.filter((item) => this.matches(item, query)).forEach((item) => content.append(this.renderItem(item)));
        } else {
            const collections = this.library.collections || [];
            const roots = collections.filter((collection) => !collection.data?.parentCollection);
            roots.sort((a, b) => cleanText(a.data?.name).localeCompare(cleanText(b.data?.name), undefined, { sensitivity: "base" }));
            roots.forEach((collection) => content.append(this.renderCollection(collection, collections)));
            const unclassified = this.library.items.filter((item) => !(item.data?.collections || []).length);
            if (unclassified.length) content.append(this.renderVirtualCollection(this.t("uncategorized"), unclassified));
        }
        rootRow.append(content);
        list.append(rootRow);
        this.treeElement.append(list);
        if (!this.library.items.length) this.treeElement.append(element("div", "siyuan-plugin-zotero-notes__empty", this.t("empty")));
        if (query && !content.children.length) this.treeElement.append(element("div", "siyuan-plugin-zotero-notes__empty", "0"));
    }

    matches(item, query) {
        const tags = (item.data?.tags || []).map((tag) => tag.tag).join(" ");
        return `${itemTitle(item)} ${itemAuthors(item)} ${itemYear(item)} ${tags}`.toLocaleLowerCase().includes(query);
    }

    renderCollection(collection, allCollections) {
        const key = collection.key;
        const children = allCollections.filter((candidate) => candidate.data?.parentCollection === key);
        const items = this.library.items.filter((item) => (item.data?.collections || []).includes(key));
        const row = element("li");
        const header = element("div", "siyuan-plugin-zotero-notes__collection");
        const toggle = element("button", "siyuan-plugin-zotero-notes__toggle", this.expanded.has(key) ? "▾" : "▸");
        toggle.setAttribute("aria-label", cleanText(collection.data?.name));
        toggle.setAttribute("aria-expanded", String(this.expanded.has(key)));
        const content = element("ul");
        content.hidden = !this.expanded.has(key);
        toggle.addEventListener("click", () => {
            if (this.expanded.has(key)) this.expanded.delete(key);
            else this.expanded.add(key);
            this.renderTree();
        });
        header.append(
            toggle,
            element("span", "siyuan-plugin-zotero-notes__folder", cleanText(collection.data?.name) || key),
            element("span", "siyuan-plugin-zotero-notes__count", items.length)
        );
        children.sort((a, b) => cleanText(a.data?.name).localeCompare(cleanText(b.data?.name), undefined, { sensitivity: "base" }));
        children.forEach((child) => content.append(this.renderCollection(child, allCollections)));
        items.forEach((item) => content.append(this.renderItem(item)));
        row.append(header, content);
        return row;
    }

    renderVirtualCollection(name, items) {
        const key = "__uncategorized__";
        const row = element("li");
        const header = element("div", "siyuan-plugin-zotero-notes__collection");
        const toggle = element("button", "siyuan-plugin-zotero-notes__toggle", this.expanded.has(key) ? "▾" : "▸");
        toggle.setAttribute("aria-expanded", String(this.expanded.has(key)));
        toggle.addEventListener("click", () => {
            if (this.expanded.has(key)) this.expanded.delete(key);
            else this.expanded.add(key);
            this.renderTree();
        });
        const content = element("ul");
        content.hidden = !this.expanded.has(key);
        items.forEach((item) => content.append(this.renderItem(item)));
        header.append(toggle, element("span", "siyuan-plugin-zotero-notes__folder", name), element("span", "siyuan-plugin-zotero-notes__count", items.length));
        row.append(header, content);
        return row;
    }

    renderItem(item) {
        const binding = this.bindings[this.bindingKey(item.key)];
        const row = element("li", "siyuan-plugin-zotero-notes__item");
        row.setAttribute("role", "treeitem");
        const text = element("div", "siyuan-plugin-zotero-notes__item-text");
        const title = element("button", "siyuan-plugin-zotero-notes__title", itemTitle(item));
        title.title = itemTitle(item);
        title.addEventListener("click", () => this.enqueue(() => this.createOrOpen(item)));
        const authors = this.formatAuthors(authorList(item), this.settings.authorLimit, this.t("etAl"));
        const meta = [authors, itemYear(item)].filter(Boolean).join(" · ");
        text.append(title, element("div", "siyuan-plugin-zotero-notes__meta", meta || item.key));
        const tools = element("div", "siyuan-plugin-zotero-notes__item-tools");
        tools.append(
            this.itemButton({
                icon: "#zoteroNotesIconNote",
                label: binding ? this.t("openNote") : this.t("newNote"),
                title: binding ? this.t("openNote") : this.t("newNote"),
                onClick: () => this.enqueue(() => this.createOrOpen(item))
            }),
            this.itemButton({
                icon: "#zoteroNotesIconRefresh",
                label: this.t("refreshMetadata"),
                title: this.t("refreshMetadata"),
                disabled: !binding,
                onClick: () => this.enqueue(() => this.refreshMetadata(item))
            }),
            this.itemButton({
                icon: "#zoteroNotesIconUpload",
                label: this.t("syncNote"),
                title: this.t("syncNote"),
                disabled: !binding?.noteDocId,
                onClick: () => this.enqueue(() => this.previewNoteSync(item))
            }),
            this.itemButton({
                icon: "#zoteroNotesIconZotero",
                label: this.t("openZotero"),
                title: this.t("openZotero"),
                onClick: () => window.open(`zotero://select/library/items/${item.key}`)
            })
        );
        row.append(text, tools);
        return row;
    }

    itemButton({ icon, label, title, onClick, disabled }) {
        const button = element("button", "b3-button b3-button--outline siyuan-plugin-zotero-notes__action");
        button.title = title;
        button.setAttribute("aria-label", title);
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "siyuan-plugin-zotero-notes__action-icon");
        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.setAttribute("href", icon);
        use.setAttribute("xlink:href", icon);
        svg.append(use);
        button.append(svg, element("span", "siyuan-plugin-zotero-notes__action-label", label));
        if (disabled) button.disabled = true;
        button.addEventListener("click", onClick);
        return button;
    }

    enqueue(operation) {
        this.operationQueue = this.operationQueue.then(operation).catch((error) => {
            if (error.name !== "AbortError") showMessage(`${this.t("operationFailed")}: ${errorMessage(error)}`, 8000);
        });
        return this.operationQueue;
    }

    async rebuildBindings() {
        const names = [ATTR_SERVER, ATTR_ITEM, ATTR_NOTE_DOC, ATTR_NOTE_KEY].map((name) => `'${name}'`).join(",");
        const rows = await this.request("/api/query/sql", {
            stmt: `SELECT block_id, name, value FROM attributes WHERE name IN (${names})`
        });
        const found = {};
        (rows || []).forEach((row) => {
            const binding = found[row.block_id] || (found[row.block_id] = {});
            if (row.name === ATTR_SERVER) binding.serverID = row.value;
            if (row.name === ATTR_ITEM) binding.itemKey = row.value;
            if (row.name === ATTR_NOTE_DOC) binding.noteDocId = row.value;
            if (row.name === ATTR_NOTE_KEY) binding.noteKey = row.value;
        });
        Object.entries(found).forEach(([parentDocId, binding]) => {
            if (!binding.itemKey || !binding.serverID) return;
            binding.parentDocId = parentDocId;
            const key = this.bindingKey(binding.itemKey, binding.serverID);
            this.bindings[key] = { ...this.bindings[key], ...binding };
        });
        this.render();
    }

    async ensureRoot() {
        if (!this.settings.notebook) throw new Error(this.t("selectNotebook"));
        const rootName = safeDocumentTitle(this.settings.rootName || "Zotero", "root");
        const path = `/${rootName}`;
        const ids = await this.request("/api/filetree/getIDsByHPath", { notebook: this.settings.notebook, path });
        if (ids?.length) return { id: ids[0], path };
        const id = await this.request("/api/filetree/createDocWithMd", {
            notebook: this.settings.notebook,
            path,
            markdown: ""
        });
        return { id, path };
    }

    async createOrOpen(item, options = {}) {
        return this.withOperationLock(item.key, () => this.createOrOpenExclusive(item, options));
    }

    async createOrOpenExclusive(item, options = {}) {
        const shouldOpenTab = options.openTab !== false;
        await this.reloadBindingsFromStorage();
        const existing = this.bindings[this.bindingKey(item.key)];
        if (existing?.parentDocId && existing?.noteDocId) {
            if (shouldOpenTab) await openTab({ app: this.app, doc: { id: existing.parentDocId } });
            return { parentDocId: existing.parentDocId, noteDocId: existing.noteDocId, path: existing.path || "" };
        }
        if (!this.settings.notebook) {
            showMessage(this.t("selectNotebook"));
            this.openSetting();
            return;
        }
        const binding = existing || {
            serverID: this.library.serverID,
            itemKey: item.key,
            parentDocId: "",
            noteDocId: "",
            noteKey: ""
        };
        let path = "";
        if (!binding.parentDocId) {
            const root = await this.ensureRoot();
            let title = safeDocumentTitle(itemTitle(item), item.key);
            path = `${root.path}/${title}`;
            const existingIDs = await this.request("/api/filetree/getIDsByHPath", { notebook: this.settings.notebook, path });
            if (existingIDs?.length) {
                title = `${title} [${item.key}]`;
                path = `${root.path}/${title}`;
            }
            binding.parentDocId = await this.request("/api/filetree/createDocWithMd", {
                notebook: this.settings.notebook,
                path,
                markdown: ""
            });
            await this.saveBinding(binding);
        } else {
            path = await this.request("/api/filetree/getHPathByID", { id: binding.parentDocId });
        }
        if (!binding.noteDocId) {
            const notePath = `${path}/Note`;
            const noteIDs = await this.request("/api/filetree/getIDsByHPath", {
                notebook: this.settings.notebook,
                path: notePath
            });
            binding.noteDocId = noteIDs?.length ? noteIDs[0] : await this.request("/api/filetree/createDocWithMd", {
                notebook: this.settings.notebook,
                path: notePath,
                markdown: ""
            });
        }
        await this.request("/api/block/updateBlock", {
            dataType: "markdown",
            data: await this.metadataMarkdown(item, binding.noteDocId),
            id: binding.parentDocId
        });
        await this.saveBinding(binding);
        showMessage(this.t("noteCreated"));
        if (shouldOpenTab) await openTab({ app: this.app, doc: { id: binding.noteDocId } });
        return { parentDocId: binding.parentDocId, noteDocId: binding.noteDocId, path };
    }

    async saveBinding(binding) {
        return this.withBindingsLock(async () => {
            const stored = await this.loadData("bindings.json");
            this.bindings = {
                ...this.bindings,
                ...(stored && typeof stored === "object" ? stored : {}),
                [this.bindingKey(binding.itemKey, binding.serverID)]: binding
            };
            await this.request("/api/attr/setBlockAttrs", {
                id: binding.parentDocId,
                attrs: {
                    [ATTR_SERVER]: binding.serverID,
                    [ATTR_ITEM]: binding.itemKey,
                    [ATTR_NOTE_DOC]: binding.noteDocId,
                    [ATTR_NOTE_KEY]: binding.noteKey || ""
                }
            });
            await this.saveData("bindings.json", this.bindings);
            this.render();
        });
    }

    async metadataMarkdown(item, noteDocId) {
        const data = item.data || {};
        const attachments = await Promise.all((item.attachments || []).map(async (attachment) => {
            let path = "";
            try {
                const result = await this.zoteroRequest(`${USER_PREFIX}/items/${attachment.key}/file/view/url`);
                path = cleanText(result.data);
            } catch {}
            return { attachment, path };
        }));
        const lines = [];
        if (noteDocId) lines.push(`[Note](siyuan://blocks/${noteDocId})`, "");
        lines.push("# 基本信息", "");
        lines.push(`> - **标题：**  ${markdownText(itemTitle(item))}`);
        lines.push(`> - **作者：**  ${markdownText(itemAuthors(item))}`);
        lines.push(`> - **年份：**  ${markdownText(itemYear(item))}`);
        const journal = data.publicationTitle || data.journalAbbreviation || data.conferenceName || data.bookTitle || "";
        lines.push(`> - **期刊：**  ${markdownText(journal)}`);
        lines.push(`> - **DOI：**  ${markdownText(data.DOI || data.doi || "")}`);
        lines.push("", "## 概要", "", cleanText(data.abstractNote) || "", "", "## 标签", "");
        (data.tags || []).forEach((tag) => lines.push(`- ${markdownText(tag.tag)}`));
        lines.push("", "## 文件", "");
        lines.push("| 文件名 | 本地绝对路径 | 在 Zotero 中选中附件 | 在 Zotero 中直接打开 |");
        lines.push("| --- | --- | --- | --- |");
        attachments.forEach(({ attachment, path }) => {
            const name = cleanText(attachment.data?.title || attachment.data?.filename) || attachment.key;
            const local = path ? `[${markdownLinkText(name)}](${path})` : markdownText(attachment.data?.url || "");
            const select = `[选中](zotero://select/library/items/${attachment.key})`;
            const isPDF = attachment.data?.contentType === "application/pdf" || /\.pdf$/i.test(attachment.data?.filename || "");
            const open = isPDF ? `[打开](zotero://open-pdf/library/items/${attachment.key})` : "-";
            lines.push(`| ${tableText(name)} | ${local} | ${select} | ${open} |`);
        });
        if (!attachments.length) lines.push("| - | - | - | - |");
        return lines.join("\n");
    }

    async refreshMetadata(item) {
        const binding = this.bindings[this.bindingKey(item.key)];
        if (!binding) return;
        const markdown = await this.metadataMarkdown(item, binding.noteDocId);
        await this.request("/api/block/updateBlock", {
            dataType: "markdown",
            data: markdown,
            id: binding.parentDocId
        });
        showMessage(this.t("metadataRefreshed"));
    }

    async previewNoteSync(item) {
        const binding = this.bindings[this.bindingKey(item.key)];
        if (!binding?.noteDocId) throw new Error(this.t("openParentFirst"));
        const exported = String(await this.request("/api/lute/copyStdMarkdown", { id: binding.noteDocId }) || "");
        const rawMarkdown = exported.replace(/^# Note(?:\r?\n){2}/, "");
        const markdown = prepareNoteMarkdown(rawMarkdown);
        const converted = await this.request("/api/lute/md2html", { markdown, mode: "" });
        const sanitized = await this.sanitizeNoteHTML(converted?.html || "");
        const dialog = new Dialog({
            title: this.t("syncPreview"),
            content: `<div class="b3-dialog__content"><p>${this.t("syncPreviewTip")}</p><div class="b3-typography siyuan-plugin-zotero-notes__render"></div><div class="siyuan-plugin-zotero-notes__warnings"></div><div class="siyuan-plugin-zotero-notes__losses"></div></div><div class="b3-dialog__action"><button class="b3-button b3-button--cancel"></button><div class="fn__space"></div><button class="b3-button b3-button--text"></button></div>`,
            width: "720px",
            height: "620px"
        });
        const render = dialog.element.querySelector(".siyuan-plugin-zotero-notes__render");
        render.innerHTML = sanitized.html;
        const warnings = dialog.element.querySelector(".siyuan-plugin-zotero-notes__warnings");
        const messages = [...sanitized.warnings];
        if (!markdown.trim()) messages.unshift(this.t("emptyNote"));
        warnings.textContent = messages.join("\n");
        const lossBox = dialog.element.querySelector(".siyuan-plugin-zotero-notes__losses");
        lossBox.append(element("div", "siyuan-plugin-zotero-notes__losses-title", this.t("lossTitle")));
        const losses = analyzeFormatLosses(rawMarkdown, converted?.html || "");
        if (losses.length) {
            const list = element("ul");
            losses.forEach((key) => list.append(element("li", "", this.t(`loss${key}`))));
            lossBox.append(list);
        } else {
            lossBox.append(element("div", "siyuan-plugin-zotero-notes__losses-none", this.t("lossNone")));
        }
        const buttons = dialog.element.querySelectorAll("button");
        buttons[0].textContent = this.t("cancel");
        buttons[1].textContent = this.t("confirmSync");
        buttons[0].addEventListener("click", () => dialog.destroy());
        buttons[1].addEventListener("click", async () => {
            buttons[1].disabled = true;
            try {
                await this.syncNote(item, binding, sanitized.html);
                binding.noteHash = stableHash(markdown);
                await this.saveBinding(binding);
                dialog.destroy();
                showMessage(this.t("syncSuccess"));
            } catch (error) {
                if (error.status === 412) showMessage(this.t("syncConflict"), 8000);
                else showMessage(`${this.t("operationFailed")}: ${errorMessage(error)}`, 8000);
            } finally {
                buttons[1].disabled = false;
            }
        });
    }

    async syncNote(item, binding, sanitizedHTML) {
        const note = `<h1>SiYuan Note</h1>${sanitizedHTML}`;
        if (!this.library.serverID) throw new Error(this.t("connectionFailed"));
        await this.withWriteKey(async (apiKey) => {
            if (binding.noteKey) {
                try {
                    const current = await this.zoteroRequest(`${USER_PREFIX}/items/${binding.noteKey}`);
                    const version = current.data?.data?.version ?? current.data?.version;
                    await this.zoteroRequest(`${USER_PREFIX}/items/${binding.noteKey}`, {
                        method: "PATCH",
                        apiKey,
                        serverID: this.library.serverID,
                        headers: { "If-Unmodified-Since-Version": String(version) },
                        body: { note }
                    });
                    return;
                } catch (error) {
                    if (error.status !== 404) throw error;
                    binding.noteKey = "";
                }
            }
            const created = await this.zoteroRequest(`${USER_PREFIX}/items`, {
                method: "POST",
                apiKey,
                serverID: this.library.serverID,
                headers: { "Zotero-Write-Token": createWriteToken() },
                body: [{ itemType: "note", parentItem: item.key, note, tags: [], collections: [] }]
            });
            const saved = created.data?.successful?.["0"];
            const noteKey = saved?.key || saved?.data?.key;
            if (!noteKey) throw new Error("Zotero did not return the created note key.");
            binding.noteKey = noteKey;
            await this.saveBinding(binding);
        });
    }

    async withWriteKey(operation) {
        let apiKey = this.writeKeys[this.library.serverID] || "";
        if (!apiKey) apiKey = await this.authorizeWrite();
        try {
            return await operation(apiKey);
        } catch (error) {
            if (error.status !== 401) throw error;
            delete this.writeKeys[this.library.serverID];
            await this.saveData("zotero-write-keys.json", this.writeKeys);
            apiKey = await this.authorizeWrite();
            return operation(apiKey);
        }
    }

    async authorizeWrite() {
        const result = await this.zoteroRequest("/local/authorize", {
            method: "POST",
            serverID: this.library.serverID,
            body: { appName: "SiYuan Zotero Notes" }
        });
        if (!result.data?.key) throw new Error(this.t("authorizationDenied"));
        if (result.data.remember) {
            this.writeKeys[this.library.serverID] = result.data.key;
            await this.saveData("zotero-write-keys.json", this.writeKeys);
        }
        return result.data.key;
    }

    researchPaperIdentity(paper) {
        const arxiv = cleanText(paper?.arxiv_id || paper?.arxivId).replace(/^arxiv:\s*/i, "").replace(/v\d+$/i, "").toLowerCase();
        const doi = cleanText(paper?.doi || paper?.DOI).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").toLowerCase();
        const title = cleanText(paper?.title).toLocaleLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ").trim();
        return { arxiv, doi, title };
    }

    researchItemMatches(item, paper) {
        const expected = this.researchPaperIdentity(paper);
        const data = item?.data || {};
        const actual = this.researchPaperIdentity({
            arxiv_id: data.archiveID || data.extra?.match(/arxiv:\s*([^\s;]+)/i)?.[1] || data.url?.match(/arxiv\.org\/(?:abs|pdf)\/([^\s/]+)/i)?.[1] || "",
            doi: data.DOI || data.doi,
            title: data.title
        });
        if (expected.arxiv && actual.arxiv) return expected.arxiv === actual.arxiv;
        if (expected.doi && actual.doi) return expected.doi === actual.doi;
        return !!expected.title && expected.title === actual.title;
    }

    researchItemData(paper, itemType = "preprint") {
        const identity = this.researchPaperIdentity(paper);
        const data = {
            itemType,
            title: cleanText(paper.title),
            creators: (Array.isArray(paper.authors) ? paper.authors : []).filter(Boolean).map((name) => ({ creatorType: "author", name: cleanText(name) })),
            abstractNote: cleanText(paper.abstract || paper.summary),
            date: cleanText(paper.published || paper.date),
            url: cleanText(paper.url) || (identity.arxiv ? `https://arxiv.org/abs/${identity.arxiv}` : ""),
            DOI: cleanText(paper.doi || paper.DOI),
            extra: identity.arxiv ? `arXiv: ${identity.arxiv}` : "",
            tags: (Array.isArray(paper.tags) ? paper.tags : []).filter(Boolean).map((tag) => ({ tag: cleanText(tag) })),
            collections: []
        };
        if (itemType === "preprint") {
            data.repository = identity.arxiv ? "arXiv" : cleanText(paper.venue);
            data.archiveID = identity.arxiv;
        } else {
            data.publicationTitle = cleanText(paper.venue);
        }
        return data;
    }

    async createResearchItem(paper) {
        return this.withWriteKey(async (apiKey) => {
            let created;
            try {
                created = await this.zoteroRequest(`${USER_PREFIX}/items`, {
                    method: "POST",
                    apiKey,
                    headers: { "Zotero-Write-Token": createWriteToken() },
                    body: [this.researchItemData(paper)]
                });
            } catch (error) {
                if (error.status !== 400 || !/itemtype|preprint/i.test(errorMessage(error))) throw error;
                created = await this.zoteroRequest(`${USER_PREFIX}/items`, {
                    method: "POST",
                    apiKey,
                    headers: { "Zotero-Write-Token": createWriteToken() },
                    body: [this.researchItemData(paper, "journalArticle")]
                });
            }
            const saved = created.data?.successful?.["0"];
            const key = saved?.key || saved?.data?.key;
            if (!key) throw new Error("Zotero did not return the created item key.");
            return { key, data: { ...saved.data, key } };
        });
    }

    async createResearchAttachment(itemKey, paper) {
        const url = cleanText(paper.pdf_url || paper.pdfUrl);
        if (!url || !/^https?:\/\//i.test(url)) return null;
        return this.withWriteKey((apiKey) => this.zoteroRequest(`${USER_PREFIX}/items`, {
            method: "POST",
            apiKey,
            headers: { "Zotero-Write-Token": createWriteToken() },
            body: [{
                itemType: "attachment",
                linkMode: "linked_url",
                parentItem: itemKey,
                title: "PDF",
                url,
                contentType: "application/pdf",
                tags: [],
                collections: []
            }]
        }));
    }

    async ensurePapers(papers) {
        if (!Array.isArray(papers) || papers.length > 50) throw new Error("papers must be an array of at most 50 items.");
        if (!papers.length) return [];
        if (!this.settings.notebook) throw new Error(this.t("selectNotebook"));
        await this.refreshLibrary(false);
        const results = [];
        let changed = false;
        for (const paper of papers) {
            try {
                if (!cleanText(paper?.title)) throw new Error("Paper title is required.");
                let item = this.library.items.find((candidate) => this.researchItemMatches(candidate, paper));
                let itemStatus = "existing";
                if (!item) {
                    item = await this.createResearchItem(paper);
                    itemStatus = "created";
                    changed = true;
                    this.library.items.push(item);
                    if (this.library.itemObjects) this.library.itemObjects[item.key] = item;
                    await this.createResearchAttachment(item.key, paper);
                }
                const documents = await this.createOrOpen(item, { openTab: false });
                results.push({
                    arxivId: this.researchPaperIdentity(paper).arxiv,
                    title: cleanText(paper.title),
                    itemKey: item.key,
                    itemStatus,
                    ...documents
                });
            } catch (error) {
                results.push({
                    arxivId: this.researchPaperIdentity(paper).arxiv,
                    title: cleanText(paper?.title),
                    itemStatus: "error",
                    error: errorMessage(error)
                });
            }
        }
        if (changed) await this.refreshLibrary(false);
        return results;
    }

    researchDocumentPath(path) {
        const value = cleanText(path);
        if (!value.startsWith("/") || value.includes("\\") || value.split("/").some((part) => part === "..")) {
            throw new Error("Invalid document path.");
        }
        const segments = value.split("/").filter(Boolean).map((part) => safeDocumentTitle(part, "doc"));
        if (!segments.length) throw new Error("Invalid document path.");
        return `/${segments.join("/")}`;
    }

    researchContentHash(exported) {
        const withoutTitle = String(exported || "").replace(/^# [^\n]+(?:\r?\n){2}/, "");
        return stableHash(prepareNoteMarkdown(withoutTitle));
    }

    validateResearchWrite(operation) {
        if (cleanText(operation?.markdown).length > 2 * 1024 * 1024) throw new Error("Markdown is too large.");
        Object.keys(operation?.attrs || {}).forEach((name) => {
            if (!name.startsWith("custom-research-")) throw new Error("Unsupported document attribute.");
        });
        if (operation?.path) this.researchDocumentPath(operation.path);
        if (operation?.onConflict && !["report", "overwrite"].includes(operation.onConflict)) {
            throw new Error("Unsupported conflict policy.");
        }
    }

    async writeDocuments(documents) {
        if (!Array.isArray(documents) || documents.length > 50) throw new Error("documents must be an array of at most 50 items.");
        documents.forEach((operation) => this.validateResearchWrite(operation));
        const results = [];
        for (const operation of documents) {
            try {
                let docId = cleanText(operation.docId);
                let path = operation.path ? this.researchDocumentPath(operation.path) : "";
                if (!docId && path) {
                    const ids = await this.request("/api/filetree/getIDsByHPath", { notebook: this.settings.notebook, path });
                    docId = ids?.[0] || "";
                }
                if (!docId && !path) throw new Error("docId or path is required.");
                if (!docId) {
                    if (operation.expectedHash !== null && operation.onConflict !== "overwrite") {
                        results.push({ path, status: "conflict", error: "Document does not exist." });
                        continue;
                    }
                    docId = await this.request("/api/filetree/createDocWithMd", {
                        notebook: this.settings.notebook,
                        path,
                        markdown: String(operation.markdown || "")
                    });
                } else {
                    const current = await this.request("/api/lute/copyStdMarkdown", { id: docId });
                    const currentHash = this.researchContentHash(current);
                    if (operation.onConflict !== "overwrite" && currentHash !== operation.expectedHash) {
                        results.push({ docId, path, status: "conflict", contentHash: currentHash });
                        continue;
                    }
                    await this.request("/api/block/updateBlock", {
                        dataType: "markdown",
                        data: String(operation.markdown || ""),
                        id: docId
                    });
                }
                const exported = await this.request("/api/lute/copyStdMarkdown", { id: docId });
                const contentHash = this.researchContentHash(exported);
                await this.request("/api/attr/setBlockAttrs", {
                    id: docId,
                    attrs: {
                        ...(operation.attrs || {}),
                        "custom-research-content-hash": contentHash
                    }
                });
                results.push({ docId, path, status: "written", contentHash });
            } catch (error) {
                results.push({ docId: operation.docId || "", path: operation.path || "", status: "error", error: errorMessage(error) });
            }
        }
        return results;
    }

    workflowJobPath(directory, name) {
        if (!/^[a-zA-Z0-9_.-]+\.json$/.test(name)) throw new Error("Invalid workflow job name.");
        return `/data/storage/petal/${PLUGIN_NAME}/jobs/${directory}/${name}`;
    }

    async listWorkflowJobs(directory) {
        const rows = await this.request("/api/file/readDir", {
            path: `/data/storage/petal/${PLUGIN_NAME}/jobs/${directory}`
        });
        return (rows || []).filter((row) => !row.isDir && /\.json$/.test(row.name)).map((row) => ({
            name: row.name,
            updated: Number(row.updated || 0)
        })).sort((a, b) => a.updated - b.updated || a.name.localeCompare(b.name));
    }

    async readWorkflowJob(directory, name) {
        const response = await fetch("/api/file/getFile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: this.workflowJobPath(directory, name) }),
            signal: this.abortController.signal
        });
        if (!response.ok) throw new Error(`Unable to read workflow job: ${response.status}`);
        return response.json();
    }

    async writeWorkflowJob(directory, name, value) {
        const body = new FormData();
        const path = this.workflowJobPath(directory, name);
        body.append("path", path);
        body.append("isDir", "false");
        body.append("modTime", String(Math.floor(Date.now() / 1000)));
        body.append("file", new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }), name);
        const response = await fetch("/api/file/putFile", {
            method: "POST",
            body,
            signal: this.abortController.signal
        });
        if (!response.ok) throw new Error(`Unable to write workflow job: ${response.status}`);
        const result = await response.json();
        if (result.code !== 0) throw new Error(result.msg || "Unable to write workflow job.");
    }

    async moveWorkflowJob(from, to) {
        await this.request("/api/file/renameFile", { path: from, newPath: to });
    }

    async removeWorkflowJob(directory, name) {
        await this.request("/api/file/removeFile", { path: this.workflowJobPath(directory, name) });
    }

    async claimWorkflowJob() {
        return this.withExclusiveLock(`${PLUGIN_NAME}:workflow-jobs`, async () => {
            const jobs = await this.listWorkflowJobs("pending");
            if (!jobs.length) return null;
            const name = jobs[0].name;
            const job = await this.readWorkflowJob("pending", name);
            await this.moveWorkflowJob(
                this.workflowJobPath("pending", name),
                this.workflowJobPath("processing", name)
            );
            return { ...job, _name: name };
        });
    }

    async recoverWorkflowJobs(now = Date.now()) {
        const jobs = await this.listWorkflowJobs("processing");
        const staleBefore = now - 15 * 60 * 1000;
        for (const job of jobs) {
            const updated = job.updated > 0 && job.updated < 1000000000000 ? job.updated * 1000 : job.updated;
            if (updated > staleBefore) continue;
            await this.moveWorkflowJob(
                this.workflowJobPath("processing", job.name),
                this.workflowJobPath("pending", job.name)
            );
        }
    }

    async processWorkflowJob(job) {
        try {
            if (!cleanText(job?.id)) throw new Error("Job id is required.");
            let result;
            if (job.type === "ensure_papers") {
                const papers = await this.ensurePapers(job.payload?.papers);
                result = { papers };
                const failures = papers.filter((paper) => paper.itemStatus === "error");
                return {
                    status: failures.length === papers.length ? "failed" : failures.length ? "partial" : "completed",
                    result,
                    error: failures.length ? `${failures.length} paper operation(s) failed.` : undefined
                };
            }
            if (job.type === "write_documents") {
                const documents = await this.writeDocuments(job.payload?.documents);
                result = { documents };
                const failures = documents.filter((document) => document.status === "error");
                return {
                    status: failures.length === documents.length ? "failed" : failures.length ? "partial" : "completed",
                    result,
                    error: failures.length ? `${failures.length} document operation(s) failed.` : undefined
                };
            }
            return { status: "failed", error: `Unsupported workflow job type: ${job.type}` };
        } catch (error) {
            return { status: "failed", error: errorMessage(error) };
        }
    }

    async finishWorkflowJob(job, outcome) {
        const directory = outcome.status === "failed" ? "failed" : "completed";
        await this.writeWorkflowJob(directory, job._name, {
            id: job.id,
            type: job.type,
            status: outcome.status,
            result: outcome.result || null,
            error: outcome.error || "",
            completedAt: new Date().toISOString()
        });
        await this.removeWorkflowJob("processing", job._name);
    }

    async processWorkflowQueue() {
        if (this.workflowQueueRunning) return;
        this.workflowQueueRunning = true;
        try {
            const job = await this.claimWorkflowJob();
            if (!job) return;
            const outcome = await this.processWorkflowJob(job);
            await this.finishWorkflowJob(job, outcome);
        } finally {
            this.workflowQueueRunning = false;
        }
    }

    startWorkflowQueue() {
        if (this.settings.workflowQueueEnabled === false || this.workflowQueueTimer) return;
        this.recoverWorkflowJobs().catch(() => {});
        this.processWorkflowQueue().catch(() => {});
        this.workflowQueueTimer = setInterval(() => {
            this.processWorkflowQueue().catch(() => {});
        }, 2000);
    }

    stopWorkflowQueue() {
        if (this.workflowQueueTimer) clearInterval(this.workflowQueueTimer);
        this.workflowQueueTimer = null;
        this.workflowQueueRunning = false;
    }

    async sanitizeNoteHTML(html) {
        const documentNode = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
        const allowed = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "STRONG", "B", "EM", "I", "DEL", "S", "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "CODE", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "A", "IMG", "HR", "BR", "SUP", "SUB", "DIV", "SPAN"]);
        const removeWithContent = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH"]);
        const walk = (node) => {
            Array.from(node.children).forEach((child) => {
                walk(child);
                if (removeWithContent.has(child.tagName)) {
                    child.remove();
                    return;
                }
                if (!allowed.has(child.tagName)) {
                    child.replaceWith(...Array.from(child.childNodes));
                    return;
                }
                Array.from(child.attributes).forEach((attribute) => {
                    const name = attribute.name.toLowerCase();
                    const keep = (child.tagName === "A" && ["href", "title"].includes(name))
                        || (child.tagName === "IMG" && ["src", "alt", "title"].includes(name))
                        || (["TD", "TH"].includes(child.tagName) && ["colspan", "rowspan"].includes(name));
                    if (!keep) child.removeAttribute(attribute.name);
                });
                if (child.tagName === "A") {
                    const href = safeExternalURL(child.getAttribute("href"));
                    if (href) child.setAttribute("href", href);
                    else child.removeAttribute("href");
                }
            });
        };
        walk(documentNode.body);
        const warnings = [];
        let totalBytes = 0;
        const images = Array.from(documentNode.body.querySelectorAll("img"));
        for (const image of images) {
            const src = image.getAttribute("src") || "";
            if (/^data:/i.test(src)) {
                if (!/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(src)) image.remove();
                continue;
            }
            if (/^https?:\/\//i.test(src)) continue;
            let normalized;
            try {
                normalized = decodeURIComponent(src.replace(/^\//, ""));
            } catch {
                warnings.push(`${src}: invalid image path encoding`);
                image.remove();
                continue;
            }
            if (!/^assets\/[a-zA-Z0-9_.?=&%\/-]+$/.test(normalized) || normalized.includes("..")) {
                warnings.push(`${src}: unsupported image path`);
                image.remove();
                continue;
            }
            try {
                const response = await fetch("/api/file/getFile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ path: `/data/${normalized}` }),
                    signal: this.abortController.signal
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                if (blob.size > MAX_IMAGE_BYTES || totalBytes + blob.size > MAX_TOTAL_IMAGE_BYTES) {
                    throw new Error("image size limit exceeded");
                }
                if (!/^image\/(?:png|jpeg|gif|webp)$/.test(blob.type)) throw new Error(`unsupported image type ${blob.type}`);
                totalBytes += blob.size;
                image.setAttribute("src", await this.blobToDataURL(blob));
            } catch (error) {
                warnings.push(`${src}: ${errorMessage(error)}`);
                image.remove();
            }
        }
        return { html: documentNode.body.innerHTML, warnings };
    }

    blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }
}

ZoteroNotesPlugin.isDirectChildOfRoot = isDirectChildOfRoot;
ZoteroNotesPlugin.collisionTitle = collisionTitle;
ZoteroNotesPlugin.stableHash = stableHash;
ZoteroNotesPlugin.diffObjectVersions = diffObjectVersions;
ZoteroNotesPlugin.composeLibraryFromObjects = composeLibraryFromObjects;
ZoteroNotesPlugin.cacheToLibrary = cacheToLibrary;
ZoteroNotesPlugin.analyzeFormatLosses = analyzeFormatLosses;
ZoteroNotesPlugin.prepareNoteMarkdown = prepareNoteMarkdown;

module.exports = ZoteroNotesPlugin;

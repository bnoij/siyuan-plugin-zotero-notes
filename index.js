const { Plugin, Dialog, Setting, showMessage, openTab, getActiveEditor } = require("siyuan");

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
const ATTR_CITES = "custom-zotero-cites";
const ATTR_STYLE = "custom-zotero-style";
const ATTR_BIB = "custom-zotero-bib";
const ATTR_ANNOTATIONS = "custom-zotero-annotations";
const ATTR_LIBRARY_DATA = "custom-zotero-library-data";
const DEFAULT_SETTINGS = {
    notebook: "",
    rootName: "Zotero",
    autoImport: true,
    authorLimit: 0,
    librarySyncInterval: 0,
    noteSyncInterval: 0,
    syncMode: "incremental",
    workflowQueueEnabled: true,
    noteTemplate: "# {{title}}\n\n{{if authors}}**作者：** {{authors}}\n\n{{end}}{{if year}}**年份：** {{year}}\n\n{{end}}{{if DOI}}**DOI：** {{DOI}}\n\n{{end}}{{if abstract}}## 摘要\n\n{{abstract}}\n\n{{end}}{{range tags}}- {{.}}\n{{end}}",
    pdf2zhPath: "pdf2zh",
    translationSource: "en",
    translationTarget: "zh",
    translationConcurrency: 1,
    translationDualConcurrency: 4,
    translationSecretNames: [],
    citationStyle: "ieee",
    citationForm: "numeric"
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
    lossBlockRef: "思源块引用与思源链接：在 Zotero 中无法跳转回思源",
    insertCitation: "插入文献引用",
    importAnnotations: "导入 PDF 标注",
    exportContent: "导出引用或当前文档"
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
        this.initTranslationState();
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
                menu.addItem({ icon: "iconLink", label: this.t("insertCitation"), click: () => this.openCitationSelector() });
                menu.addItem({ icon: "iconDownload", label: this.t("exportContent"), click: () => this.openExportDialog() });
                menu.addItem({ icon: "iconDatabase", label: "文献数据库 / Paper database", click: () => this.enqueue(() => this.openPaperDatabase()) });
                menu.addItem({ icon: "iconList", label: "统一多页引用 / Connected citations", click: () => this.enqueue(() => this.syncCurrentCitationTree()) });
                menu.addItem({ icon: "iconUpload", label: "导入文献 / Import papers", click: () => this.openImportDialog() });
                menu.addItem({ icon: "iconSearch", label: "检索 / PDF 导入", click: () => this.openAdvancedImportDialog() });
                menu.addItem({ icon: "iconSettings", label: this.t("settings"), click: () => this.openSetting() });
            },
            callback: () => this.openSetting()
        });
        this.addCommand({
            langKey: "insertCitation",
            hotkey: "",
            callback: () => this.openCitationSelector()
        });
        this.addCommand({
            langKey: "exportContent",
            hotkey: "",
            callback: () => this.openExportDialog()
        });
        this.registerAgentActions();
        this.startAutoSync();
    }

    registerAgentActions() {
        this.addAgentAction({
            name: "ensure_papers",
            description: "Ensure Zotero items and linked SiYuan paper documents exist. Args: {papers:[{title,doi,arxiv_id,creators,tags,url}]}",
            handler: async (args) => {
                if (!Array.isArray(args?.papers) || args.papers.length > 50) return { error: "papers must be an array of at most 50 items" };
                try {
                    const results = await this.ensurePapers(args.papers);
                    return { result: JSON.stringify(results) };
                } catch (error) {
                    return { error: errorMessage(error) };
                }
            }
        });
        this.addAgentAction({
            name: "write_documents",
            description: "Write Markdown documents with conflict protection. Args: {documents:[{path,content,expectedHash,onConflict}]}",
            handler: async (args) => {
                if (!Array.isArray(args?.documents) || args.documents.length > 50) return { error: "documents must be an array of at most 50 items" };
                for (const document of args.documents) {
                    if (typeof document?.path !== "string" || typeof document?.content !== "string" || (document.onConflict && !["report", "overwrite"].includes(document.onConflict))) {
                        return { error: "Invalid document path or conflict policy / 文档路径或冲突策略无效" };
                    }
                }
                try {
                    return { result: JSON.stringify(await this.writeDocuments(args.documents)) };
                } catch (error) {
                    return { error: errorMessage(error) };
                }
            }
        });
        this.addAgentAction({
            name: "refresh_library",
            description: "Refresh the Zotero library cache and return the item count",
            handler: async () => {
                try {
                    await this.refreshLibrary(false);
                    return { result: `${this.library.items.length} items` };
                } catch (error) {
                    return { error: errorMessage(error) };
                }
            }
        });
        this.addAgentAction({
            name: "translate_paper",
            description: "Translate a paper PDF using an existing pdf2zh executable. Args: {itemKey,mode:'mono'|'dual'}",
            handler: async (args) => {
                if (typeof args?.itemKey !== "string" || !["mono", "dual"].includes(args.mode)) return { error: "itemKey and mode are required" };
                if (!this.library.items.some((item) => item.key === args.itemKey)) return { error: `文献 ${args.itemKey} 不存在于当前文库` };
                try {
                    this.initTranslationState();
                    await this.queueTranslations([args.itemKey], args.mode);
                    await this.waitForTranslationIdle();
                    const job = this.translationJobs.get(args.itemKey);
                    if (!job) return { error: `未能创建文献 ${args.itemKey} 的翻译任务` };
                    if (job.status === "error") return { error: job.error || "pdf2zh 翻译失败" };
                    if (job.status === "cancelled") return { error: `翻译 ${args.itemKey} 已取消` };
                    if (job.status !== "completed") return { error: `翻译 ${args.itemKey} 未完成：${job.status}` };
                    return { result: `翻译 ${args.itemKey}: ${job.status}` };
                } catch (error) {
                    return { error: errorMessage(error) };
                }
            }
        });
        const getFromPool = (event) => {
            if (typeof event?.detail?.triggerFn !== "function") return;
            const items = this.library.items.slice(0, 200).map((item) => ({ key: item.key, title: itemTitle(item), authors: itemAuthors(item), year: itemYear(item) }));
            event.detail.triggerFn("total", this.library.items.length);
            event.detail.triggerFn("all", items);
        };
        const refresh = async (event) => {
            if (event?.detail?.type === "database") return this.refreshLibrary(false);
            const item = this.library.items[0];
            if (item) return this.refreshMetadata(item);
        };
        this.agentEventHandlers = { GetFromPool: getFromPool, Refresh: refresh };
        this.eventBus.on("GetFromPool", getFromPool);
        this.eventBus.on("Refresh", refresh);
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
            this.settingControls.citationStyleSelect.value = this.settings.citationStyle;
            this.settingControls.citationFormSelect.value = this.settings.citationForm;
            this.settingControls.noteTemplateInput.value = this.settings.noteTemplate;
            this.settingControls.pdf2zhPathInput.value = this.settings.pdf2zhPath;
            this.settingControls.translationSourceInput.value = this.settings.translationSource;
            this.settingControls.translationTargetInput.value = this.settings.translationTarget;
            this.settingControls.translationConcurrencyInput.value = this.settings.translationConcurrency;
            this.settingControls.translationSecretNamesInput.value = this.settings.translationSecretNames.join(", ");
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
        this.cancelTranslations();
        this.eventBus?.off?.("GetFromPool", this.agentEventHandlers?.GetFromPool);
        this.eventBus?.off?.("Refresh", this.agentEventHandlers?.Refresh);
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
        merged.translationConcurrency = clampInteger(merged.translationConcurrency, 1, 8, DEFAULT_SETTINGS.translationConcurrency);
        merged.translationDualConcurrency = clampInteger(merged.translationDualConcurrency, 1, 128, DEFAULT_SETTINGS.translationDualConcurrency);
        const secretNames = Array.isArray(merged.translationSecretNames) ? merged.translationSecretNames : String(merged.translationSecretNames || "").split(",");
        merged.translationSecretNames = [...new Set(secretNames.map((name) => String(name).trim()).filter((name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)))];
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
        if (options.body !== undefined && options.rawBody === undefined) headers["Content-Type"] = "application/json";
        const endpoint = /^https?:\/\//i.test(path) ? path : `${ZOTERO_API}${path}`;
        const response = await fetch(endpoint, {
            method: options.method || "GET",
            headers,
            body: options.rawBody !== undefined ? options.rawBody : options.body === undefined ? undefined : JSON.stringify(options.body),
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
        const citationStyleSelect = document.createElement("select");
        citationStyleSelect.className = "b3-select fn__block";
        [["ieee", "IEEE"], ["apa", "APA 7"], ["china-national-standard-gb-t-7714-2015-numeric", "GB/T 7714"]].forEach(([value, label]) => {
            citationStyleSelect.append(new Option(label, value));
        });
        citationStyleSelect.value = this.settings.citationStyle;
        const citationFormSelect = document.createElement("select");
        citationFormSelect.className = "b3-select fn__block";
        [["numeric", "Numeric"], ["author-date", "Author-date"], ["narrative", "Narrative"]].forEach(([value, label]) => {
            citationFormSelect.append(new Option(label, value));
        });
        citationFormSelect.value = this.settings.citationForm;
        const noteTemplateInput = document.createElement("textarea");
        noteTemplateInput.className = "b3-text-field fn__block";
        noteTemplateInput.rows = 6;
        noteTemplateInput.value = this.settings.noteTemplate;
        const pdf2zhPathInput = document.createElement("input");
        pdf2zhPathInput.className = "b3-text-field fn__block";
        pdf2zhPathInput.value = this.settings.pdf2zhPath;
        const translationSourceInput = document.createElement("input");
        translationSourceInput.className = "b3-text-field fn__block";
        translationSourceInput.value = this.settings.translationSource;
        const translationTargetInput = document.createElement("input");
        translationTargetInput.className = "b3-text-field fn__block";
        translationTargetInput.value = this.settings.translationTarget;
        const translationConcurrencyInput = document.createElement("input");
        translationConcurrencyInput.type = "number";
        translationConcurrencyInput.min = "1";
        translationConcurrencyInput.max = "8";
        translationConcurrencyInput.className = "b3-text-field fn__block";
        translationConcurrencyInput.value = this.settings.translationConcurrency;
        const translationSecretNamesInput = document.createElement("input");
        translationSecretNamesInput.className = "b3-text-field fn__block";
        translationSecretNamesInput.placeholder = "OPENAI_API_KEY, GEMINI_API_KEY";
        translationSecretNamesInput.value = this.settings.translationSecretNames.join(", ");
        this.settingControls = { notebookSelect, rootInput, autoImport, authorLimitInput, librarySyncInput, noteSyncInput, syncModeSelect, workflowQueueEnabled, citationStyleSelect, citationFormSelect, noteTemplateInput, pdf2zhPathInput, translationSourceInput, translationTargetInput, translationConcurrencyInput, translationSecretNamesInput };
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
                workflowQueueEnabled: workflowQueueEnabled.checked,
                citationStyle: citationStyleSelect.value,
                citationForm: citationFormSelect.value,
                noteTemplate: noteTemplateInput.value,
                pdf2zhPath: pdf2zhPathInput.value,
                translationSource: translationSourceInput.value,
                translationTarget: translationTargetInput.value,
                translationConcurrency: translationConcurrencyInput.value,
                translationSecretNames: translationSecretNamesInput.value
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
            title: "Citation style / 引用样式",
            actionElement: citationStyleSelect
        });
        this.setting.addItem({
            title: "Citation form / 正文引用形式",
            actionElement: citationFormSelect
        });
        this.setting.addItem({
            title: this.t("workflowQueueEnabled"),
            description: this.t("workflowQueueEnabledTip"),
            actionElement: workflowQueueEnabled
        });
        this.setting.addItem({
            title: "Note 初始模板",
            description: "仅支持 {{title}}、{{authors}}、{{year}}、{{journal}}、{{DOI}}、{{abstract}}、{{tags}}、{{noteLink}}、{{itemKey}} 及 if/range 控制结构；只用于新建 Note。",
            actionElement: noteTemplateInput
        });
        this.setting.addItem({ title: "pdf2zh 可执行文件", actionElement: pdf2zhPathInput });
        this.setting.addItem({ title: "翻译源语言", actionElement: translationSourceInput });
        this.setting.addItem({ title: "翻译目标语言", actionElement: translationTargetInput });
        this.setting.addItem({ title: "同时翻译篇数", description: "1–8 篇，批量任务按此并发运行", actionElement: translationConcurrencyInput });
        this.setting.addItem({ title: "翻译密钥名称", description: "逗号分隔的环境变量名；密钥值只从思源「设置 → 密钥和变量」读取，不保存在插件设置中。", actionElement: translationSecretNamesInput });
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
        citationStyleSelect.addEventListener("change", save);
        citationFormSelect.addEventListener("change", save);
        noteTemplateInput.addEventListener("change", save);
        pdf2zhPathInput.addEventListener("change", save);
        translationSourceInput.addEventListener("change", save);
        translationTargetInput.addEventListener("change", save);
        translationConcurrencyInput.addEventListener("change", save);
        translationSecretNamesInput.addEventListener("change", save);
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
                icon: "#zoteroNotesIconNote",
                label: this.t("importAnnotations"),
                title: this.t("importAnnotations"),
                disabled: !binding?.noteDocId,
                onClick: () => this.enqueue(() => this.importAnnotations(item))
            }),
            this.itemButton({
                icon: "#zoteroNotesIconRefresh",
                label: "翻译 / Translate",
                title: "使用 pdf2zh 翻译 PDF",
                disabled: !binding?.noteDocId,
                onClick: () => this.openTranslationDialog(item)
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
            const isNewNote = !noteIDs?.length;
            binding.noteDocId = noteIDs?.length ? noteIDs[0] : await this.request("/api/filetree/createDocWithMd", {
                notebook: this.settings.notebook,
                path: notePath,
                markdown: ""
            });
            if (isNewNote) {
                await this.request("/api/block/updateBlock", {
                    dataType: "markdown",
                    data: this.initialNoteMarkdown(item, binding.noteDocId),
                    id: binding.noteDocId
                });
            }
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

    templateItemContext(item, noteDocId) {
        const data = item?.data || {};
        return {
            title: itemTitle(item),
            authors: itemAuthors(item),
            year: itemYear(item),
            journal: data.publicationTitle || data.journalAbbreviation || data.conferenceName || data.bookTitle || "",
            DOI: data.DOI || data.doi || "",
            abstract: data.abstractNote || "",
            tags: (data.tags || []).map((tag) => tag.tag).filter(Boolean),
            noteLink: `[Note](siyuan://blocks/${noteDocId})`,
            itemKey: item?.key || ""
        };
    }

    templateFieldValue(context, path) {
        if (path === ".") return context.current;
        if (!Object.hasOwn(context.root, path)) return undefined;
        return context.root[path];
    }

    templateEscape(value) {
        if (value === undefined || value === null) return "";
        return markdownText(value);
    }

    renderSafeTemplate(template, item, noteDocId) {
        const root = this.templateItemContext(item, noteDocId);
        const renderNodes = (source, context) => {
            let output = "";
            let position = 0;
            while (position < source.length) {
                const start = source.indexOf("{{", position);
                if (start < 0) {
                    output += source.slice(position);
                    break;
                }
                output += source.slice(position, start);
                const finish = source.indexOf("}}", start + 2);
                if (finish < 0) {
                    output += source.slice(start);
                    break;
                }
                const expression = source.slice(start + 2, finish).trim();
                position = finish + 2;
                if (expression.startsWith("if ") || expression.startsWith("range ")) {
                    const kind = expression.startsWith("if ") ? "if" : "range";
                    const path = expression.slice(kind.length).trim();
                    const block = this.templateBlock(source, position, kind);
                    const value = this.templateFieldValue(context, path);
                    if (kind === "if") {
                        const truthy = Array.isArray(value) ? value.length > 0 : Boolean(value);
                        output += truthy ? renderNodes(block.truthy, context) : renderNodes(block.falsy, context);
                    } else {
                        const values = Array.isArray(value) ? value : [];
                        for (const current of values) {
                            output += renderNodes(block.truthy, { root: context.root, current });
                        }
                    }
                    position = block.next;
                } else {
                    const value = this.templateFieldValue(context, expression);
                    output += expression === "noteLink" ? (value || "") : this.templateEscape(value);
                }
            }
            return output;
        };
        return renderNodes(String(template || ""), { root });
    }

    templateBlock(source, start, kind) {
        let depth = 1;
        let elseIndex = -1;
        let elseEnd = -1;
        let position = start;
        while (position < source.length) {
            const startTag = source.indexOf("{{", position);
            if (startTag < 0) throw new Error(`模板缺少 {{end}}`);
            const finish = source.indexOf("}}", startTag + 2);
            if (finish < 0) throw new Error("模板表达式未闭合");
            const expression = source.slice(startTag + 2, finish).trim();
            if (/^(?:if|range)\s/.test(expression)) depth++;
            if (expression === "else" && depth === 1 && elseIndex < 0) {
                elseIndex = startTag;
                elseEnd = finish + 2;
            }
            if (expression === "end") {
                depth--;
                if (depth === 0) {
                    return {
                        truthy: source.slice(start, elseIndex >= 0 ? elseIndex : startTag),
                        falsy: elseIndex >= 0 ? source.slice(elseEnd, startTag) : "",
                        next: finish + 2
                    };
                }
            }
            position = finish + 2;
        }
        throw new Error(`模板缺少 {{end}}`);
    }

    initialNoteMarkdown(item, noteDocId) {
        return this.renderSafeTemplate(this.settings.noteTemplate, item, noteDocId);
    }

    newBlockId() {
        const now = new Date();
        const timestamp = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()]
            .map((value, index) => String(value).padStart(index === 0 ? 4 : 2, "0")).join("");
        const random = new Uint32Array(1);
        crypto.getRandomValues(random);
        return `${timestamp}-${random[0].toString(36).padStart(7, "0").slice(-7)}`;
    }

    databaseSchema() {
        return [
            ["title", "标题"],
            ["authors", "作者"],
            ["year", "年份"],
            ["journal", "期刊"],
            ["doi", "DOI"],
            ["tags", "标签"],
            ["url", "链接"]
        ];
    }

    databaseCellValue(field, item) {
        if (field === "tags") {
            return { type: "mSelect", mSelect: (item.data?.tags || []).map((tag, index) => ({ content: tag.tag, color: String(index % 14 + 1) })).filter((value) => value.content) };
        }
        if (field === "url") return { type: "url", url: { content: cleanText(item.data?.url) } };
        const values = {
            title: itemTitle(item),
            authors: itemAuthors(item),
            year: itemYear(item),
            journal: item.data?.publicationTitle || item.data?.journalAbbreviation || item.data?.conferenceName || item.data?.bookTitle || "",
            doi: item.data?.DOI || item.data?.doi || ""
        };
        return { type: "text", text: { content: cleanText(values[field]) } };
    }

    databaseLibraryData(docId) {
        return this.request("/api/attr/getBlockAttrs", { id: docId }).then((attrs) => {
            const raw = attrs?.[ATTR_LIBRARY_DATA];
            if (!raw) return null;
            try {
                const data = JSON.parse(raw);
                if (!data.avID || !data.avBlockId) return null;
                return data;
            } catch {
                return null;
            }
        });
    }

    async ensurePaperDatabase() {
        const root = await this.ensureRoot();
        const path = `${root.path}/文献数据库`;
        const ids = await this.request("/api/filetree/getIDsByHPath", { notebook: this.settings.notebook, path });
        const docId = ids?.[0] || await this.request("/api/filetree/createDocWithMd", {
            notebook: this.settings.notebook,
            path,
            markdown: ""
        });
        const existing = await this.databaseLibraryData(docId);
        if (existing) return { docId, ...existing };
        const avID = this.newBlockId();
        const avBlockId = this.newBlockId();
        await this.request("/api/block/appendBlock", {
            dataType: "dom",
            data: `<div class="av" data-node-id="${avBlockId}" data-av-id="${avID}" data-type="NodeAttributeView" data-av-type="table"></div>`,
            parentID: docId
        });
        await this.request("/api/av/renderAttributeView", { id: avID, blockID: avBlockId, page: 1, pageSize: 100, query: "", groupPaging: {}, createIfNotExist: true });
        const fieldKeyIds = {};
        let previousKeyID = "";
        for (const [field, label] of this.databaseSchema()) {
            const keyID = this.newBlockId();
            const keyType = field === "tags" ? "mSelect" : field === "url" ? "url" : "text";
            await this.request("/api/av/addAttributeViewKey", { avID, keyID, keyName: label, keyType, keyIcon: "", previousKeyID });
            fieldKeyIds[field] = keyID;
            previousKeyID = keyID;
        }
        await this.request("/api/attr/setBlockAttrs", {
            id: docId,
            attrs: { [ATTR_LIBRARY_DATA]: JSON.stringify({ avID, avBlockId, fieldKeyIds }) }
        });
        return { docId, avID, avBlockId, fieldKeyIds };
    }

    async syncPaperDatabase(item) {
        return this.withExclusiveLock(`${PLUGIN_NAME}:database`, async () => {
            const database = await this.ensurePaperDatabase();
            let keyChanged = false;
            let previousKeyID = "";
            for (const [field, label] of this.databaseSchema()) {
                if (!database.fieldKeyIds[field]) {
                    const keyID = this.newBlockId();
                    await this.request("/api/av/addAttributeViewKey", {
                        avID: database.avID,
                        keyID,
                        keyName: label,
                        keyType: field === "tags" ? "mSelect" : field === "url" ? "url" : "text",
                        keyIcon: "",
                        previousKeyID
                    });
                    database.fieldKeyIds[field] = keyID;
                    keyChanged = true;
                }
                previousKeyID = database.fieldKeyIds[field];
            }
            if (keyChanged) {
                await this.request("/api/attr/setBlockAttrs", {
                    id: database.docId,
                    attrs: { [ATTR_LIBRARY_DATA]: JSON.stringify({ avID: database.avID, avBlockId: database.avBlockId, fieldKeyIds: database.fieldKeyIds }) }
                });
            }
            const paperDocId = this.bindings[this.bindingKey(item.key)]?.parentDocId || item.key;
            const binding = { avID: database.avID, blockIDs: [paperDocId] };
            let ids = await this.request("/api/av/getAttributeViewItemIDsByBoundIDs", binding);
            let itemID = ids?.[paperDocId];
            if (!itemID) {
                await this.request("/api/av/addAttributeViewBlocks", {
                    avID: database.avID,
                    blockID: database.avBlockId,
                    viewID: "",
                    groupID: "",
                    previousID: "",
                    srcs: [{ id: paperDocId, content: itemTitle(item), isDetached: false }],
                    ignoreDefaultFill: true
                });
                ids = await this.request("/api/av/getAttributeViewItemIDsByBoundIDs", binding);
                itemID = ids?.[paperDocId];
            }
            if (!itemID) throw new Error("Unable to bind the Zotero database row");
            for (const [field] of this.databaseSchema()) {
                await this.request("/api/av/setAttributeViewBlockAttr", {
                    avID: database.avID,
                    keyID: database.fieldKeyIds[field],
                    itemID,
                    value: this.databaseCellValue(field, item)
                });
            }
            return itemID;
        });
    }

    async syncAllPaperDatabases() {
        const errors = [];
        for (const item of this.library.items) {
            const binding = this.bindings[this.bindingKey(item.key)];
            if (!binding?.parentDocId) continue;
            try {
                await this.syncPaperDatabase(item);
            } catch (error) {
                errors.push(`${itemTitle(item)}：${errorMessage(error)}`);
            }
        }
        if (errors.length) showMessage(`部分数据库同步失败：${errors.slice(0, 3).join("；")}`, 8000);
    }

    async openPaperDatabase() {
        const database = await this.withExclusiveLock(`${PLUGIN_NAME}:database`, () => this.ensurePaperDatabase());
        await this.syncAllPaperDatabases();
        await openTab({ app: this.app, doc: { id: database.docId } });
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

    citationText(item, form = "numeric", number, locator = "") {
        const creators = (item?.data?.creators || []).filter((creator) => !creator.creatorType || creator.creatorType === "author");
        const names = creators.map((creator) => cleanText(creator.lastName) || cleanText(creator.name).split(/\s+/).at(-1)).filter(Boolean);
        const authors = names.length > 2 ? `${names[0]} et al.` : names.join(" & ") || "Unknown";
        const year = itemYear(item) || "n.d.";
        const suffix = locator ? `, ${cleanText(locator)}` : "";
        if (form === "numeric") return `[${number || 1}${suffix}]`;
        if (form === "narrative") return `${authors} (${year}${suffix})`;
        return `(${authors}, ${year}${suffix})`;
    }

    citationLink(keys, text) {
        const unique = [...new Set(keys)].filter(Boolean);
        const query = `?f=csl&zkeys=${encodeURIComponent(unique.join(","))}`;
        return `[${text}](zotero://select/library/items/${unique[0]}${query})`;
    }

    renumberCitationMarkdown(markdown, entries) {
        return String(markdown || "").replace(/\[([^\]\n]*)\]\((zotero:\/\/select\/library\/items\/[^)\s]+)\)/g, (match, label, url) => {
            let keys;
            try {
                const parsed = new URL(url);
                keys = (parsed.searchParams.get("zkeys") || "").split(",").filter(Boolean);
            } catch {
                return match;
            }
            if (!keys.length) return match;
            const citations = keys.map((key) => entries.find((entry) => entry.key === key));
            if (citations.some((entry) => !entry || entry.form !== "numeric")) return match;
            return `[${citations.map((entry) => entry.number).join(",")}](${url})`;
        });
    }

    mergeCitationEntries(existing, incoming) {
        const result = (existing || []).map((entry) => ({ ...entry }));
        (incoming || []).forEach((entry) => {
            const index = result.findIndex((candidate) => candidate.key === entry.key);
            if (index >= 0) result[index] = { ...result[index], ...entry, locator: entry.locator || result[index].locator || "" };
            else result.push({ ...entry });
        });
        return result;
    }

    plainTextFromHTML(html) {
        return String(html || "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;|&apos;/g, "'")
            .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
            .replace(/\s+/g, " ")
            .replace(/\s+([.,;:!?])/g, "$1")
            .trim();
    }

    bibliographyEntries(html) {
        const source = String(html || "");
        const tagPattern = /<\/?div\b[^>]*>/gi;
        const entries = [];
        let match;
        while ((match = tagPattern.exec(source))) {
            if (!/^<div\b/i.test(match[0]) || !/class=["'][^"']*csl-entry/i.test(match[0])) continue;
            const entryStart = match.index;
            let depth = 1;
            let end = -1;
            while (depth > 0 && (match = tagPattern.exec(source))) {
                if (/^<div\b/i.test(match[0])) depth++;
                else depth--;
                if (depth === 0) end = match.index;
            }
            if (end >= 0) {
                const start = source.indexOf(">", entryStart) + 1;
                const text = this.plainTextFromHTML(source.slice(start, end));
                if (text) entries.push(text);
            }
        }
        return entries;
    }

    async formatBibliography(itemKeys, style = "apa") {
        const keys = [...new Set(itemKeys)];
        if (!keys.length) return [];
        try {
            const query = encodeURIComponent(keys.join(","));
            const existing = await this.zoteroRequest(`${USER_PREFIX}/items?itemKey=${query}`);
            const existingKeys = keys.filter((key) => (existing.data || []).some((item) => item.key === key));
            let entries = [];
            if (existingKeys.length) {
                const result = await this.zoteroRequest(`${USER_PREFIX}/items?itemKey=${encodeURIComponent(existingKeys.join(","))}&format=bib&style=${encodeURIComponent(style)}&linkwrap=1`);
                entries = this.bibliographyEntries(result.data);
            }
            return keys.map((key) => {
                const index = existingKeys.indexOf(key);
                if (index < 0 || !entries[index]) return { key, text: `[Missing Zotero item: ${key}]`, missing: true };
                return { key, text: entries[index], missing: false };
            });
        } catch {
            return keys.map((key) => ({ key, text: `[Missing Zotero item: ${key}]`, missing: true }));
        }
    }

    citationRegistryFromAttrs(attrs) {
        try {
            const entries = JSON.parse(attrs?.[ATTR_CITES] || "[]");
            return Array.isArray(entries) ? entries.filter((entry) => entry?.key) : [];
        } catch {
            return [];
        }
    }

    async saveCitationRegistry(docId, entries, style = this.settings.citationStyle) {
        return this.withExclusiveLock(`${PLUGIN_NAME}:document:${docId}`, async () => {
            const attrs = await this.request("/api/attr/getBlockAttrs", { id: docId });
            const merged = this.mergeCitationEntries(this.citationRegistryFromAttrs(attrs), entries);
            await this.request("/api/attr/setBlockAttrs", {
                id: docId,
                attrs: { [ATTR_CITES]: JSON.stringify(merged), [ATTR_STYLE]: style }
            });
            return merged;
        });
    }

    async refreshBibliography(docId) {
        return this.withExclusiveLock(`${PLUGIN_NAME}:bibliography:${docId}`, async () => {
            const attrs = await this.request("/api/attr/getBlockAttrs", { id: docId });
            const registry = this.citationRegistryFromAttrs(attrs);
            if (!registry.length) {
                const rows = await this.request("/api/query/sql", {
                    stmt: `SELECT a.block_id FROM attributes a JOIN blocks b ON a.block_id = b.id WHERE a.name = '${ATTR_BIB}' AND b.root_id = '${docId}'`
                });
                for (const row of Array.isArray(rows) ? rows : []) {
                    await this.request("/api/block/deleteBlock", { id: row.block_id });
                }
                return;
            }
            const style = attrs[ATTR_STYLE] || this.settings.citationStyle;
            const entries = await this.formatBibliography(registry.map((entry) => entry.key), style);
            const markdown = `{{{row\n# 参考文献\n\n${entries.map((entry) => `- ${markdownText(entry.text)}`).join("\n")}\n}}}`;
            const rows = await this.request("/api/query/sql", {
                stmt: `SELECT a.block_id FROM attributes a JOIN blocks b ON a.block_id = b.id WHERE a.name = '${ATTR_BIB}' AND b.root_id = '${docId}' LIMIT 1`
            });
            let blockId = rows?.[0]?.block_id;
            if (blockId) {
                await this.request("/api/block/updateBlock", { dataType: "markdown", data: markdown, id: blockId });
            } else {
                const inserted = await this.request("/api/block/appendBlock", { dataType: "markdown", data: markdown, parentID: docId });
                blockId = inserted?.flatMap((result) => result.doOperations || []).find((operation) => operation.action === "insert")?.id;
            }
            if (!blockId) throw new Error("Unable to locate bibliography block");
            await this.request("/api/attr/setBlockAttrs", { id: blockId, attrs: { [ATTR_BIB]: "true" } });
        });
    }

    async refreshCitationTree(rootDocId) {
        return this.withExclusiveLock(`${PLUGIN_NAME}:citation-tree:${rootDocId}`, async () => {
            const pathInfo = await this.request("/api/filetree/getPathByID", { id: rootDocId });
            const rootHPath = await this.request("/api/filetree/getHPathByID", { id: rootDocId });
            const referencePath = `${rootHPath}/Reference`;
            const escapedRootHPath = rootHPath.replace(/'/g, "''").replace(/[%_]/g, "\\$&");
            const descendants = await this.request("/api/query/sql", {
                stmt: `SELECT id, hpath FROM blocks WHERE type = 'd' AND hpath LIKE '${escapedRootHPath}/%' ESCAPE '\\' ORDER BY hpath`
            });
            const documents = [{ id: rootDocId, hpath: rootHPath }, ...(descendants || []).filter((document) => document.hpath !== referencePath)];
            const allEntries = [];
            const citationNumbers = new Map();
            let style = this.settings.citationStyle;
            for (const document of documents) {
                const attrs = await this.request("/api/attr/getBlockAttrs", { id: document.id });
                const entries = this.citationRegistryFromAttrs(attrs).map((entry) => {
                    if (!citationNumbers.has(entry.key)) citationNumbers.set(entry.key, citationNumbers.size + 1);
                    return { ...entry, number: citationNumbers.get(entry.key) };
                });
                allEntries.push(...entries);
                style = attrs[ATTR_STYLE] || style;
                await this.request("/api/attr/setBlockAttrs", {
                    id: document.id,
                    attrs: { [ATTR_CITES]: JSON.stringify(entries), [ATTR_STYLE]: style }
                });
                const citationRows = await this.request("/api/query/sql", {
                    stmt: `SELECT id, markdown FROM blocks WHERE root_id = '${document.id}' AND markdown LIKE '%zotero://select/library/items/%'`
                });
                for (const row of Array.isArray(citationRows) ? citationRows : []) {
                    const markdown = this.renumberCitationMarkdown(row.markdown, entries);
                    if (markdown !== row.markdown) {
                        await this.request("/api/block/updateBlock", { dataType: "markdown", data: markdown, id: row.id });
                    }
                }
                const oldBibs = await this.request("/api/query/sql", {
                    stmt: `SELECT a.block_id FROM attributes a JOIN blocks b ON a.block_id = b.id WHERE a.name = '${ATTR_BIB}' AND b.root_id = '${document.id}'`
                });
                for (const row of oldBibs || []) {
                    await this.request("/api/block/deleteBlock", { id: row.block_id });
                }
            }
            const registry = this.mergeCitationEntries([], allEntries);
            const existing = await this.request("/api/filetree/getIDsByHPath", { notebook: pathInfo.notebook, path: referencePath });
            const referenceId = existing?.[0] || await this.request("/api/filetree/createDocWithMd", {
                notebook: pathInfo.notebook,
                path: referencePath,
                markdown: ""
            });
            await this.request("/api/attr/setBlockAttrs", {
                id: referenceId,
                attrs: { [ATTR_CITES]: JSON.stringify(registry), [ATTR_STYLE]: style }
            });
            await this.refreshBibliography(referenceId);
            return registry.map((entry) => entry.key);
        });
    }

    async syncConnectedCollection(rootDocId) {
        await this.refreshLibrary(false);
        const itemKeys = await this.refreshCitationTree(rootDocId);
        const synchronize = async () => {
            const collectionKey = await this.ensureResearchCollection(`【【Connected Documents】】→ ${rootDocId}`);
            const missingItemKeys = [];
            for (const key of new Set(itemKeys)) {
                const item = this.library.items.find((candidate) => candidate.key === key);
                if (!item) missingItemKeys.push(key);
                else await this.assignResearchCollection(item, collectionKey);
            }
            if (missingItemKeys.length) {
                const error = new Error(`以下引用在 Zotero 文库中不存在：${missingItemKeys.join(", ")}`);
                error.missingItemKeys = missingItemKeys;
                throw error;
            }
            return collectionKey;
        };
        try {
            return await synchronize();
        } catch (error) {
            if (error.status !== 412) throw error;
            await this.refreshLibrary(false);
            return synchronize();
        }
    }

    async syncCurrentCitationTree() {
        const editor = getActiveEditor();
        const rootDocId = editor?.protyle?.block?.rootID;
        if (!rootDocId) throw new Error("请先打开顶层文档");
        await this.syncConnectedCollection(rootDocId);
    }

    citationMarkdown(items, form = this.settings.citationForm, registry = []) {
        const keys = items.map((item) => item.key);
        if (form === "numeric") {
            const text = items.map((item, index) => {
                const foundIndex = registry.findIndex((entry) => entry.key === item.key);
                const found = registry[foundIndex];
                return found?.number || (foundIndex >= 0 ? foundIndex + 1 : registry.length + index + 1);
            }).join(",");
            return this.citationLink(keys, text);
        }
        const text = items.map((item) => this.citationText(item, form, registry.findIndex((entry) => entry.key === item.key) + 1)).join("; ");
        return this.citationLink(keys, text);
    }

    async insertCitations(items, options = {}) {
        const editor = getActiveEditor();
        const docId = editor?.protyle?.block?.rootID;
        if (!docId) throw new Error("Please open a document before inserting citations.");
        return this.withExclusiveLock(`${PLUGIN_NAME}:document:${docId}`, async () => {
            const form = options.form || this.settings.citationForm;
            const style = options.style || this.settings.citationStyle;
            const attrs = await this.request("/api/attr/getBlockAttrs", { id: docId });
            const existing = this.citationRegistryFromAttrs(attrs);
            const incoming = items.map((item) => ({ key: item.key, form, locator: options.locator || "" }));
            const merged = this.mergeCitationEntries(existing, incoming);
            await this.request("/api/attr/setBlockAttrs", {
                id: docId,
                attrs: { [ATTR_CITES]: JSON.stringify(merged), [ATTR_STYLE]: style }
            });
            try {
                editor.protyle.insert(this.citationMarkdown(items, form, merged), true);
            } catch (error) {
                await this.request("/api/attr/setBlockAttrs", {
                    id: docId,
                    attrs: { [ATTR_CITES]: attrs[ATTR_CITES] || "[]", [ATTR_STYLE]: attrs[ATTR_STYLE] || style }
                });
                throw error;
            }
            await this.refreshBibliography(docId);
        });
    }

    openCitationSelector() {
        const dialog = new Dialog({
            title: this.t("insertCitation"),
            content: `<div class="b3-dialog__content"><input class="b3-text-field fn__block" data-citation-search placeholder="${this.t("search")}"><div class="siyuan-plugin-zotero-notes__citation-list"></div><div class="fn__hr"></div><select class="b3-select" data-citation-form><option value="numeric">Numeric</option><option value="author-date">Author-date</option><option value="narrative">Narrative</option></select><select class="b3-select" data-citation-style><option value="ieee">IEEE</option><option value="apa">APA 7</option><option value="china-national-standard-gb-t-7714-2015-numeric">GB/T 7714</option></select></div><div class="b3-dialog__action"><button class="b3-button b3-button--text" data-citation-insert>${this.t("insertCitation")}</button></div>`,
            width: "680px",
            height: "600px"
        });
        const search = dialog.element.querySelector("[data-citation-search]");
        const list = dialog.element.querySelector(".siyuan-plugin-zotero-notes__citation-list");
        const form = dialog.element.querySelector("[data-citation-form]");
        const style = dialog.element.querySelector("[data-citation-style]");
        form.value = this.settings.citationForm;
        style.value = this.settings.citationStyle;
        const selected = new Set();
        const renderItems = () => {
            const query = search.value.trim().toLocaleLowerCase();
            const items = this.library.items.filter((item) => !query || this.matches(item, query));
            list.replaceChildren();
            items.forEach((item) => {
                const label = element("label", "siyuan-plugin-zotero-notes__citation-choice");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = item.key;
                checkbox.checked = selected.has(item.key);
                checkbox.addEventListener("change", () => {
                    if (checkbox.checked) selected.add(item.key);
                    else selected.delete(item.key);
                });
                label.append(checkbox, element("span", "", `${itemTitle(item)} (${itemYear(item)})`));
                list.append(label);
            });
        };
        search.addEventListener("input", renderItems);
        renderItems();
        dialog.element.querySelector("[data-citation-insert]").addEventListener("click", () => {
            const keys = Array.from(selected);
            const items = keys.map((key) => this.library.items.find((item) => item.key === key)).filter(Boolean);
            if (!items.length) return;
            this.enqueue(async () => {
                await this.insertCitations(items, { form: form.value, style: style.value });
                dialog.destroy();
            });
        });
    }

    annotationMarkdown(annotations) {
        return annotations.map((annotation) => {
            const data = annotation.data || {};
            const page = cleanText(data.pageLabel || data.annotationPageLabel) || (data.position?.pageIndex >= 0 ? String(data.position.pageIndex + 1) : "?");
            const text = cleanText(data.annotationText || data.text || data.annotationType);
            const comment = cleanText(data.annotationComment || data.comment);
            const link = `zotero://open-pdf/library/items/${annotation.attachmentKey}?page=${encodeURIComponent(page)}&annotation=${annotation.key}`;
            return `- **第 ${markdownText(page)} 页：** ${markdownText(text)}\n  ${comment ? `批注：${markdownText(comment)}\n  ` : ""}[打开标注](${link})`;
        }).join("\n");
    }

    async fetchAnnotations(item) {
        const attachments = (item.attachments || []).filter((attachment) => attachment.data?.contentType === "application/pdf");
        const groups = await Promise.all(attachments.map(async (attachment) => {
            const result = await this.zoteroRequest(`${USER_PREFIX}/items?parentItem=${attachment.key}`);
            return (result.data || []).filter((child) => child.data?.itemType === "annotation").map((annotation) => ({
                ...annotation,
                attachmentKey: attachment.key
            }));
        }));
        return groups.flat();
    }

    async importAnnotations(item) {
        const binding = this.bindings[this.bindingKey(item.key)];
        if (!binding?.noteDocId) throw new Error(this.t("openParentFirst"));
        return this.withExclusiveLock(`${PLUGIN_NAME}:annotations:${binding.noteDocId}`, async () => {
            const annotations = await this.fetchAnnotations(item);
            if (!annotations.length) return;
            const markdown = `{{{row\n## PDF 标注\n\n${this.annotationMarkdown(annotations)}\n}}}`;
            const rows = await this.request("/api/query/sql", {
                stmt: `SELECT a.block_id FROM attributes a JOIN blocks b ON a.block_id = b.id WHERE a.name = '${ATTR_ANNOTATIONS}' AND b.root_id = '${binding.noteDocId}' LIMIT 1`
            });
            let blockId = rows?.[0]?.block_id;
            if (blockId) {
                await this.request("/api/block/updateBlock", { dataType: "markdown", data: markdown, id: blockId });
            } else {
                const inserted = await this.request("/api/block/appendBlock", { dataType: "markdown", data: markdown, parentID: binding.noteDocId });
                blockId = inserted?.flatMap((result) => result.doOperations || []).find((operation) => operation.action === "insert")?.id;
            }
            if (!blockId) throw new Error("Unable to locate annotation section");
            await this.request("/api/attr/setBlockAttrs", { id: blockId, attrs: { [ATTR_ANNOTATIONS]: "true" } });
            showMessage(`已导入 ${annotations.length} 条标注`);
        });
    }

    bibEntry(item) {
        const data = item.data || {};
        const key = cleanText(data.citationKey || data["citation-key"]) || item.key;
        const type = data.itemType === "book" ? "book" : data.itemType === "conferencePaper" ? "inproceedings" : data.itemType === "thesis" ? "thesis" : "article";
        const authors = (data.creators || []).map((creator) => cleanText(creator.name) || `${cleanText(creator.lastName)}, ${cleanText(creator.firstName)}`).filter(Boolean).join(" and ");
        const escape = (value) => cleanText(value).replace(/\\/g, "\\textbackslash ").replace(/([{}])/g, "\\$1");
        const fields = [
            ["title", data.title],
            ["author", authors],
            ["year", itemYear(item)],
            ["journal", data.publicationTitle],
            ["publisher", data.publisher],
            ["doi", data.DOI || data.doi],
            ["url", data.url]
        ].filter(([, value]) => cleanText(value));
        return `@${type}{${key},\n${fields.map(([name, value]) => `  ${name} = {${escape(value)}}`).join(",\n")}\n}`;
    }

    async exportCitations(items, format) {
        const keys = items.map((item) => item.key);
        if (["gbt", "apa", "ieee"].includes(format)) {
            const style = format === "gbt" ? "china-national-standard-gb-t-7714-2015-numeric" : format;
            const entries = await this.formatBibliography(keys, style);
            return entries.map((entry) => entry.text).join("\n\n");
        }
        if (format === "typst") return items.map((item) => `#cite(<${item.data.citationKey || item.key}>)`).join("\n");
        if (format === "latex") return items.map((item) => `\\cite{${item.data.citationKey || item.key}}`).join("\n");
        return items.map((item) => this.bibEntry(item)).join("\n\n");
    }

    getExportEditor() {
        return getActiveEditor();
    }

    async downloadBlob(filename, blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async downloadText(filename, content, mime = "text/plain;charset=utf-8") {
        await this.downloadBlob(filename, new Blob([content], { type: mime }));
    }

    async exportDocument(format) {
        const editor = this.getExportEditor();
        const docId = editor?.protyle?.block?.rootID;
        if (!docId) throw new Error("Please open a document before exporting.");
        const exported = await this.request("/api/export/exportMdContent", { id: docId });
        const title = safeDocumentTitle(exported.hPath.split("/").at(-1) || "Document", docId);
        if (format === "markdown") {
            await this.downloadText(`${title}.md`, exported.content, "text/markdown;charset=utf-8");
            return;
        }
        const extension = format === "docx" ? "docx" : "tex";
        const directory = `zotero-notes-${Date.now()}`;
        const form = new FormData();
        form.append("path", `/temp/convert/pandoc/${directory}/input.md`);
        form.append("file", new Blob([exported.content], { type: "text/markdown" }), "input.md");
        const uploaded = await fetch("/api/file/putFile", { method: "POST", body: form, signal: this.abortController.signal });
        const uploadResult = await uploaded.json();
        if (!uploaded.ok || uploadResult.code !== 0) throw new Error(uploadResult.msg || "Pandoc upload failed");
        await this.request("/api/convert/pandoc", {
            dir: directory,
            args: ["--to", format === "docx" ? "docx" : "latex", "input.md", "-o", `output.${extension}`]
        });
        const response = await fetch("/api/file/getFile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: `/temp/convert/pandoc/${directory}/output.${extension}` }),
            signal: this.abortController.signal
        });
        if (!response.ok) throw new Error(`Export download failed: ${response.status}`);
        await this.downloadBlob(`${title}.${extension}`, await response.blob());
    }

    async exportCurrentCitations(format) {
        const editor = this.getExportEditor();
        const docId = editor?.protyle?.block?.rootID;
        if (!docId) throw new Error("Please open a document before exporting citations.");
        const attrs = await this.request("/api/attr/getBlockAttrs", { id: docId });
        const registry = this.citationRegistryFromAttrs(attrs);
        if (!registry.length) throw new Error("This document has no citations.");
        const items = registry.map((entry) => this.library.items.find((item) => item.key === entry.key)).filter(Boolean);
        const content = await this.exportCitations(items, format);
        const extensions = { biblatex: "bib", bibtex: "bib", typst: "typ", latex: "tex", gbt: "txt", apa: "txt", ieee: "txt" };
        await this.downloadText(`citations.${extensions[format] || "txt"}`, content);
    }

    openExportDialog() {
        const dialog = new Dialog({
            title: this.t("exportContent"),
            content: `<div class="b3-dialog__content"><select class="b3-select fn__block" data-export-format><option value="markdown">Markdown document</option><option value="docx">Word document</option><option value="latex">LaTeX document</option><option value="gbt">GB/T 7714 citations</option><option value="apa">APA citations</option><option value="ieee">IEEE citations</option><option value="bibtex">BibTeX</option><option value="biblatex">BibLaTeX</option><option value="typst">Typst</option></select></div><div class="b3-dialog__action"><button class="b3-button b3-button--text" data-export-confirm>${this.t("exportContent")}</button></div>`,
            width: "480px"
        });
        const format = dialog.element.querySelector("[data-export-format]");
        dialog.element.querySelector("[data-export-confirm]").addEventListener("click", () => {
            this.enqueue(async () => {
                if (["markdown", "docx", "latex"].includes(format.value)) await this.exportDocument(format.value);
                else await this.exportCurrentCitations(format.value);
                dialog.destroy();
            });
        });
    }

    normalizeCSLItem(entry) {
        const typeMap = {
            "article-journal": "journalArticle",
            "paper-conference": "conferencePaper",
            "book-chapter": "bookSection",
            chapter: "bookSection",
            article: "journalArticle",
            "posted-content": "preprint",
            book: "book",
            thesis: "thesis",
            webpage: "webpage",
            preprint: "preprint"
        };
        const issued = entry.issued?.["date-parts"]?.[0] || [];
        const url = cleanText(entry.URL || entry.url);
        const arxiv = url.match(/arxiv\.org\/(?:abs|pdf)\/([^\s/?#]+)/i)?.[1] || cleanText(entry.arxivId || entry.arxiv_id);
        return {
            itemType: typeMap[entry.type] || "journalArticle",
            title: cleanText(Array.isArray(entry.title) ? entry.title.filter(Boolean).join(" ") : entry.title),
            creators: (entry.author || entry.creators || []).map((creator) => ({
                creatorType: "author",
                family: cleanText(creator.family || creator.lastName),
                given: cleanText(creator.given || creator.firstName)
            })),
            date: issued.filter(Boolean).join("-"),
            abstract: cleanText(entry.abstract || entry.abstractNote),
            doi: cleanText(entry.DOI || entry.doi),
            isbn: cleanText(entry.ISBN || entry.isbn),
            issn: cleanText(entry.ISSN || entry.issn),
            url,
            publicationTitle: cleanText(Array.isArray(entry["container-title"]) ? entry["container-title"].filter(Boolean).join(" ") : entry["container-title"] || entry.journal || entry.publicationTitle),
            publisher: cleanText(entry.publisher),
            arxiv_id: arxiv,
            tags: cleanText(entry.keyword).split(/[,;]/).map((tag) => tag.trim()).filter(Boolean),
            key: cleanText(entry.id || entry["citation-key"])
        };
    }

    bibUnescape(value) {
        return value.replace(/\\([&{}])/g, "$1").replace(/\\textbackslash\s*/g, "\\");
    }

    bibFields(body) {
        const fields = {};
        let position = 0;
        while (position < body.length) {
            const match = body.slice(position).match(/^\s*([A-Za-z][\w-]*)\s*=\s*/);
            if (!match) break;
            const name = match[1].toLowerCase();
            position += match[0].length;
            let value = "";
            let depth = 0;
            let quoted = false;
            let started = false;
            while (position < body.length) {
                const char = body[position];
                if (char === "\\") {
                    value += char + (body[position + 1] || "");
                    position += 2;
                    continue;
                }
                if (char === '"') quoted = !quoted;
                if (!quoted) {
                    if (char === "{") {
                        depth++;
                        started = true;
                    } else if (char === "}") {
                        depth--;
                    } else if (char === "," && depth <= 0) {
                        position++;
                        break;
                    }
                }
                value += char;
                position++;
                started = true;
            }
            fields[name] = this.bibUnescape(value.trim().replace(/^\{(.*)\}$/s, "$1").trim());
            if (!started) break;
        }
        return fields;
    }

    parseBibTeX(source) {
        const entries = [];
        let position = 0;
        const text = String(source || "");
        while (position < text.length) {
            const at = text.indexOf("@", position);
            if (at < 0) break;
            const header = text.slice(at).match(/^@(\w+)\s*\{\s*([^,\s]+)\s*,/);
            if (!header) break;
            const type = header[1].toLowerCase();
            const key = header[2];
            const bodyStart = at + header[0].length;
            let depth = 1;
            let quoted = false;
            let end = bodyStart;
            for (; end < text.length && depth > 0; end++) {
                const char = text[end];
                if (char === "\\") {
                    end++;
                    continue;
                }
                if (char === '"') quoted = !quoted;
                if (!quoted) {
                    if (char === "{") depth++;
                    else if (char === "}") depth--;
                }
            }
            const body = text.slice(bodyStart, end - 1);
            const fields = this.bibFields(body);
            const creators = (fields.author || "").split(/\s+and\s+/i).filter(Boolean).map((name) => {
                const parts = name.includes(",") ? name.split(",", 2) : [name.split(/\s+/).at(-1), name.split(/\s+/).slice(0, -1).join(" ")];
                return { creatorType: "author", family: cleanText(parts[0]), given: cleanText(parts[1]) };
            });
            const data = {
                key,
                itemType: type === "book" ? "book" : type === "inproceedings" || type === "conference" ? "conferencePaper" : type === "thesis" || type === "phdthesis" || type === "mastersthesis" ? "thesis" : "journalArticle",
                title: cleanText(fields.title),
                creators,
                date: cleanText(fields.year || fields.date),
                abstractNote: cleanText(fields.abstract),
                DOI: cleanText(fields.doi),
                ISBN: cleanText(fields.isbn),
                ISSN: cleanText(fields.issn),
                url: cleanText(fields.url),
                publicationTitle: cleanText(fields.journal || fields.booktitle),
                publisher: cleanText(fields.publisher),
                citationKey: key,
                tags: cleanText(fields.keywords).split(/[,;]/).map((tag) => tag.trim()).filter(Boolean)
            };
            data.archiveID = data.url.match(/arxiv\.org\/(?:abs|pdf)\/([^\s/?#]+)/i)?.[1] || "";
            entries.push({ key, data });
            position = end;
        }
        if (!entries.length) throw new Error("无法识别 BibTeX 内容");
        return entries;
    }

    parseImportData(source) {
        const text = String(source || "").trim();
        if (text.startsWith("[") || text.startsWith("{")) {
            const parsed = JSON.parse(text);
            const entries = Array.isArray(parsed) ? parsed : parsed.items;
            if (!Array.isArray(entries)) throw new Error("CSL-JSON 必须是条目数组");
            return { papers: entries.map((entry) => this.normalizeCSLItem(entry)), errors: [] };
        }
        const entries = this.parseBibTeX(text);
        return {
            papers: entries.map((item) => this.normalizeCSLItem({
                id: item.key,
                type: item.data.itemType,
                title: item.data.title,
                author: item.data.creators.map((creator) => ({ family: creator.family, given: creator.given })),
                issued: { "date-parts": [[item.data.date]] },
                abstract: item.data.abstractNote,
                DOI: item.data.DOI,
                ISBN: item.data.ISBN,
                ISSN: item.data.ISSN,
                URL: item.data.url,
                "container-title": item.data.publicationTitle,
                publisher: item.data.publisher,
                keyword: item.data.tags.join(",")
            })),
            errors: []
        };
    }

    async importPapers(papers, options = {}) {
        const action = options.duplicateAction || "skip";
        const candidates = [];
        let skipped = 0;
        for (const paper of papers) {
            const duplicate = this.library.items.some((item) => this.researchItemMatches(item, paper));
            if (duplicate && action === "skip") {
                skipped++;
                continue;
            }
            candidates.push(paper);
        }
        const created = candidates.length ? await this.ensurePapers(candidates, { forceCreate: action === "create" }) : [];
        const errors = created.filter((result) => result.itemStatus === "error");
        return { imported: created.length - errors.length, skipped, errors };
    }

    async importFile(file, duplicateAction = "skip") {
        const result = this.parseImportData(await file.text());
        const imported = await this.importPapers(result.papers, { duplicateAction });
        return { ...imported, errors: result.errors };
    }

    openImportDialog() {
        const dialog = new Dialog({
            title: "导入文献 / Import papers",
            content: `<div class="b3-dialog__content"><input type="file" class="b3-text-field fn__block" data-import-file accept=".json,.bib,.bibtex"><select class="b3-select fn__block" data-import-duplicate><option value="skip">重复条目：跳过</option><option value="create">重复条目：仍创建副本</option></select><div data-import-result></div></div><div class="b3-dialog__action"><button class="b3-button b3-button--text" data-import-confirm>导入</button></div>`,
            width: "520px"
        });
        const fileInput = dialog.element.querySelector("[data-import-file]");
        const action = dialog.element.querySelector("[data-import-duplicate]");
        const result = dialog.element.querySelector("[data-import-result]");
        dialog.element.querySelector("[data-import-confirm]").addEventListener("click", () => {
            const file = fileInput.files?.[0];
            if (!file) {
                result.textContent = "请选择 CSL-JSON 或 BibTeX 文件";
                return;
            }
            this.enqueue(async () => {
                const outcome = await this.importFile(file, action.value);
                result.textContent = `已导入 ${outcome.imported} 篇，跳过重复 ${outcome.skipped} 篇${outcome.errors.length ? `，失败 ${outcome.errors.length} 条` : ""}`;
            });
        });
    }

    normalizeIdentifier(input) {
        const value = cleanText(input);
        if (/^arxiv:/i.test(value)) return { kind: "arxiv", value: value.replace(/^arxiv:\s*/i, "").replace(/v\d+$/i, "") };
        if (/^10\.\d{4,9}\//i.test(value)) return { kind: "doi", value: value.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "") };
        if (/^pmid:/i.test(value)) return { kind: "pmid", value: value.replace(/^pmid:/i, "") };
        if (/^pmc/i.test(value)) return { kind: "pmcid", value: value.toUpperCase() };
        if (/^\d{10}(?:\d{3})?$/.test(value.replace(/[- ]/g, ""))) return { kind: "isbn", value: value.replace(/[- ]/g, "") };
        if (/^\d+$/.test(value)) return { kind: "pmid", value };
        if (/^https?:\/\//i.test(value)) return { kind: "url", value };
        throw new Error("无法识别该 DOI、arXiv、ISBN、PMID/PMCID 或 URL");
    }

    async externalJSON(url, options = {}) {
        const response = await fetch(url, { ...options, signal: AbortSignal.any([this.abortController.signal, AbortSignal.timeout(15000)]) });
        if (!response.ok) throw new Error(`元数据接口失败：${response.status}`);
        return response.json();
    }

    async externalText(url, options = {}) {
        const response = await fetch(url, { ...options, signal: AbortSignal.any([this.abortController.signal, AbortSignal.timeout(15000)]) });
        if (!response.ok) throw new Error(`元数据接口失败：${response.status}`);
        return response.text();
    }

    xmlTag(source, tag) {
        return cleanText(source.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"))?.[1]);
    }

    async lookupIdentifier(input) {
        const identifier = this.normalizeIdentifier(input);
        if (identifier.kind === "doi") {
            try {
                const result = await this.externalJSON(`https://api.crossref.org/works/${encodeURIComponent(identifier.value)}`);
                return this.normalizeCSLItem(result.message);
            } catch (error) {
                const arxiv = identifier.value.match(/arxiv\.([^/]+)/i)?.[1];
                if (!arxiv) throw error;
                const result = await this.lookupIdentifier(`arXiv:${arxiv}`);
                return { ...result, doi: identifier.value };
            }
        }
        if (identifier.kind === "arxiv") {
            const xml = await this.externalText(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(identifier.value)}`);
            const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/i)?.[1] || xml;
            return this.normalizeCSLItem({
                type: "preprint",
                title: this.xmlTag(entry, "title"),
                author: Array.from(entry.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)).map((match) => {
                    const parts = match[1].trim().split(/\s+/);
                    return { family: parts.at(-1), given: parts.slice(0, -1).join(" ") };
                }),
                issued: { "date-parts": [[this.xmlTag(entry, "published").slice(0, 4)]] },
                abstract: this.xmlTag(entry, "summary"),
                URL: this.xmlTag(entry, "id"),
                keyword: Array.from(entry.matchAll(/<category[^>]*term="([^"]+)"/g)).map((match) => match[1]).join(",")
            });
        }
        if (identifier.kind === "isbn") {
            const result = await this.externalJSON(`https://openlibrary.org/search.json?isbn=${encodeURIComponent(identifier.value)}`);
            const book = result.docs?.[0];
            if (!book) throw new Error("未找到 ISBN 元数据");
            return this.normalizeCSLItem({
                type: "book",
                title: book.title,
                author: (book.author_name || []).map((name) => ({ family: name.split(/\s+/).at(-1), given: name.split(/\s+/).slice(0, -1).join(" ") })),
                issued: { "date-parts": [[book.first_publish_year]] },
                publisher: book.publisher?.[0],
                ISBN: identifier.value
            });
        }
        if (identifier.kind === "pmid") {
            const result = await this.externalJSON(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${encodeURIComponent(identifier.value)}&retmode=json`);
            const paper = result.result?.[identifier.value];
            if (!paper) throw new Error("未找到 PubMed 元数据");
            return this.normalizeCSLItem({
                type: "article-journal",
                title: paper.title,
                author: (paper.authors || []).map((author) => ({ family: author.name.split(/\s+/)[0], given: author.name.split(/\s+/).slice(1).join(" ") })),
                issued: { "date-parts": [[paper.pubdate]] },
                "container-title": paper.fulljournalname,
                DOI: paper.elocationid?.replace(/^doi:\s*/i, ""),
                URL: `https://pubmed.ncbi.nlm.nih.gov/${identifier.value}/`
            });
        }
        if (identifier.kind === "pmcid") {
            const converted = await this.externalJSON(`https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?ids=${encodeURIComponent(identifier.value)}&format=json`);
            const pmid = converted.records?.[0]?.pmid;
            if (pmid) return this.lookupIdentifier(pmid);
            return this.lookupIdentifier(`https://pmc.ncbi.nlm.nih.gov/articles/${identifier.value}/`);
        }
        const result = await this.externalJSON(`https://www.mediawiki.org/api/rest_v1/data/citation/zotero/${encodeURIComponent(identifier.value)}`);
        const item = Array.isArray(result) ? result[0] : result;
        if (!item) throw new Error("未找到网页元数据");
        const data = item.data || item;
        return this.normalizeCSLItem({
            type: data.itemType,
            title: data.title,
            author: (data.creators || []).map((creator) => ({ family: creator.lastName || creator.name, given: creator.firstName })),
            issued: { "date-parts": [[data.date]] },
            abstract: data.abstractNote,
            DOI: data.DOI || data.doi,
            ISBN: data.ISBN,
            ISSN: data.ISSN,
            URL: data.url,
            "container-title": data.publicationTitle,
            publisher: data.publisher,
            keyword: (data.tags || []).map((tag) => tag.tag).join(",")
        });
    }

    pdfTextFromStream(bytes) {
        const source = new TextDecoder("latin1").decode(bytes);
        const strings = [];
        for (const match of source.matchAll(/\(([^()]*(?:\\.[^()]*)*)\)\s*Tj/g)) {
            const text = match[1].replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\([()\\])/g, "$1").replace(/\\([0-7]{1,3})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 8))).trim();
            if (text.length >= 8) strings.push(text);
        }
        return strings.sort((a, b) => b.length - a.length)[0] || "";
    }

    async extractPDFMetadata(bytes, filename = "paper.pdf") {
        if (bytes.byteLength > 64 * 1024 * 1024) throw new Error("PDF 超过 64 MiB 限制");
        const source = new TextDecoder("utf-8").decode(bytes);
        const latin1Source = new TextDecoder("latin1").decode(bytes);
        const warnings = [];
        const fallback = filename.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() || "Untitled PDF";
        const xmpTitle = source.match(/<dc:title[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i)?.[1];
        const creatorBlock = source.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i)?.[1] || "";
        const creators = Array.from(creatorBlock.matchAll(/<rdf:li[^>]*>([^<]+)<\/rdf:li>/g)).map((match) => {
            const parts = match[1].trim().split(/\s+/);
            return { creatorType: "author", family: parts.at(-1), given: parts.slice(0, -1).join(" ") };
        });
        const abstract = this.plainTextFromHTML(source.match(/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/i)?.[1] || "");
        const date = source.match(/<xmp:CreateDate[^>]*>([^<]+)/i)?.[1] || "";
        let title = cleanText(xmpTitle);
        let confidence = 0;
        let provider = "";
        if (title) {
            confidence = 0.85;
            provider = "XMP";
        } else {
            let text = this.pdfTextFromStream(bytes);
            if (!text && /FlateDecode/.test(source)) {
                try {
                    const streamMatch = latin1Source.match(/stream\r?\n([\s\S]*?)endstream/);
                    if (streamMatch) {
                        const start = streamMatch.index + streamMatch[0].indexOf("\n") + 1;
                        let end = streamMatch.index + streamMatch[0].length - "endstream".length;
                        while (end > start && (bytes[end - 1] === 10 || bytes[end - 1] === 13)) end--;
                        const compressed = bytes.subarray(start, end);
                        const inflated = await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer();
                        text = this.pdfTextFromStream(inflated);
                    }
                } catch {
                    warnings.push("压缩文本流无法解析");
                }
            }
            if (text) {
                title = cleanText(text);
                confidence = 0.55;
                provider = "PDF text";
            }
        }
        if (!title) {
            title = fallback;
            confidence = 0.25;
            provider = "filename";
            warnings.push("未识别可靠元数据，使用文件名兜底");
        }
        return {
            itemType: "journalArticle",
            title,
            creators,
            date,
            abstract,
            doi: "",
            isbn: "",
            issn: "",
            url: "",
            publicationTitle: "",
            publisher: "",
            arxiv_id: "",
            tags: [],
            confidence,
            provider,
            warnings
        };
    }

    openAdvancedImportDialog() {
        const dialog = new Dialog({
            title: "检索 / PDF 导入",
            content: `<div class="b3-dialog__content"><input class="b3-text-field fn__block" data-advanced-identifier placeholder="DOI、arXiv、ISBN、PMID/PMCID、URL"><input type="file" class="b3-text-field fn__block" data-advanced-pdf accept="application/pdf,.pdf"><select class="b3-select fn__block" data-advanced-duplicate><option value="skip">重复条目：跳过</option><option value="create">重复条目：仍创建副本</option></select><button class="b3-button b3-button--outline" data-advanced-fetch>检索 / 解析</button><input class="b3-text-field fn__block" data-advanced-title placeholder="识别标题（可编辑）"><div data-advanced-preview></div></div><div class="b3-dialog__action"><button class="b3-button b3-button--text" data-advanced-import>确认导入</button></div>`,
            width: "600px"
        });
        const identifier = dialog.element.querySelector("[data-advanced-identifier]");
        const pdf = dialog.element.querySelector("[data-advanced-pdf]");
        const duplicate = dialog.element.querySelector("[data-advanced-duplicate]");
        const title = dialog.element.querySelector("[data-advanced-title]");
        const preview = dialog.element.querySelector("[data-advanced-preview]");
        let pending = null;
        dialog.element.querySelector("[data-advanced-fetch]").addEventListener("click", () => {
            this.enqueue(async () => {
                if (pdf.files?.[0]) pending = await this.extractPDFMetadata(await pdf.files[0].arrayBuffer(), pdf.files[0].name);
                else pending = await this.lookupIdentifier(identifier.value);
                title.value = pending.title;
                const source = pending.provider || pending.kind || "online";
                preview.textContent = `来源：${source}；置信度：${pending.confidence ?? "在线接口"}${pending.warnings?.length ? `；${pending.warnings.join("；")}` : ""}`;
            });
        });
        dialog.element.querySelector("[data-advanced-import]").addEventListener("click", () => {
            this.enqueue(async () => {
                if (!pending) {
                    preview.textContent = "请先检索或解析";
                    return;
                }
                pending.title = cleanText(title.value) || pending.title;
                const result = await this.importPapers([pending], { duplicateAction: duplicate.value });
                preview.textContent = `已导入 ${result.imported} 篇，跳过重复 ${result.skipped} 篇`;
            });
        });
    }

    nodeRequire(name) {
        const requireFn = globalThis.window?.require || globalThis.require || require;
        if (typeof requireFn !== "function") throw new Error(`Node 模块不可用：${name}`);
        return requireFn(name);
    }

    async translationEnvironment(overrides = {}) {
        const names = ["PATH", "HOME", "USERPROFILE", "SYSTEMROOT", "TEMP", "TMP", "LANG", "LC_ALL"];
        const env = {};
        names.forEach((name) => {
            if (process.env[name]) env[name] = process.env[name];
        });
        Object.entries(overrides).forEach(([name, value]) => {
            if (!/(?:key|secret|token|password|passwd|credential)/i.test(name)) env[name] = value;
        });
        const configuredNames = Array.isArray(this.settings.translationSecretNames)
            ? this.settings.translationSecretNames
            : String(this.settings.translationSecretNames || "").split(",");
        for (const name of new Set(configuredNames.map((value) => String(value).trim()).filter((value) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)))) {
            if (typeof this.getSecret !== "function") throw new Error("思源密钥接口不可用 / SiYuan secret API unavailable");
            const value = await this.getSecret(name);
            if (typeof value === "string" && value) env[name] = value;
        }
        return env;
    }

    async defaultProcessRunner(executable, args, options = {}) {
        const { spawn } = this.nodeRequire("child_process");
        return new Promise((resolve, reject) => {
            const child = spawn(executable, args, {
                env: options.env,
                windowsHide: true,
                signal: options.signal
            });
            let stdout = "";
            let stderr = "";
            let settled = false;
            const append = (target, value, limit = 1024 * 1024) => target.length < limit ? value.slice(0, limit - target.length) : "";
            child.stdout.on("data", (data) => { stdout += append(stdout, data.toString()); });
            child.stderr.on("data", (data) => { stderr += append(stderr, data.toString()); });
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                child.kill();
                const error = new Error(`pdf2zh 进程超时 / Process timeout after ${options.timeout || 30 * 60 * 1000} ms`);
                error.code = "ETIMEDOUT";
                reject(error);
            }, options.timeout || 30 * 60 * 1000);
            timer.unref?.();
            child.on("error", (error) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                reject(error);
            });
            child.on("close", (code) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve({ code, stdout, stderr });
            });
        });
    }

    async runPdf2zh(options) {
        const mode = options.mode === "dual" ? "dual" : "mono";
        const runner = this.processRunner || this.defaultProcessRunner.bind(this);
        const executable = this.settings.pdf2zhPath || "pdf2zh";
        const args = [
            options.input,
            "--output", options.outputDir,
            "--li", this.settings.translationSource || "en",
            "--lo", this.settings.translationTarget || "zh",
            "-t", String(this.settings.translationDualConcurrency || 4),
            mode === "mono" ? "--no-dual" : "--no-mono"
        ];
        const result = await runner(executable, args, {
            env: await this.translationEnvironment(options.env),
            signal: options.signal || this.abortController.signal,
            timeout: options.timeout
        });
        if (result.code !== 0) throw new Error(`pdf2zh 退出码 ${result.code}：${result.stderr || result.stdout || "未知错误"}`);
        const path = this.nodeRequire("path");
        const base = path.basename(options.input, path.extname(options.input));
        return { outputPath: path.join(options.outputDir, `${base}-${mode}.pdf`), mode };
    }

    async uploadZoteroFile(itemKey, bytes, filename, options = {}) {
        const digest = this.nodeRequire("crypto").createHash("md5").update(bytes).digest();
        const md5 = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
        return this.withWriteKey(async (apiKey) => {
            const initialized = await this.zoteroRequest(`${USER_PREFIX}/items/${itemKey}/file?md5=${md5}&filename=${encodeURIComponent(filename)}&filesize=${bytes.byteLength}&mtime=${Date.now()}`, {
                method: "POST",
                apiKey,
                headers: { "If-None-Match": "*", "Content-Type": "application/x-www-form-urlencoded" },
                signal: options.signal
            });
            if (initialized.data?.exists) return { key: itemKey, exists: true };
            const uploadURL = initialized.data?.url;
            if (!uploadURL) throw new Error("Zotero 未返回附件上传地址");
            const encoder = new TextEncoder();
            const prefix = encoder.encode(initialized.data.prefix || "");
            const suffix = encoder.encode(initialized.data.suffix || "");
            const uploadBody = new Uint8Array(prefix.byteLength + bytes.byteLength + suffix.byteLength);
            uploadBody.set(prefix);
            uploadBody.set(bytes, prefix.byteLength);
            uploadBody.set(suffix, prefix.byteLength + bytes.byteLength);
            await this.zoteroRequest(uploadURL, {
                method: "POST",
                rawBody: uploadBody,
                headers: { "Content-Type": initialized.data.contentType || "application/x-www-form-urlencoded" },
                signal: options.signal
            });
            await this.zoteroRequest(`${USER_PREFIX}/items/${itemKey}/file?upload=${encodeURIComponent(initialized.data.uploadKey)}`, {
                method: "POST",
                apiKey,
                headers: { "If-None-Match": "*", "Content-Type": "application/x-www-form-urlencoded" },
                signal: options.signal
            });
            return { key: itemKey, exists: false };
        });
    }

    async translationAttachment(item, mode = "mono", options = {}) {
        const attachment = (item.attachments || []).find((candidate) => candidate.data?.contentType === "application/pdf");
        if (!attachment) throw new Error("没有可翻译的 PDF 原稿");
        const result = await this.zoteroRequest(`${USER_PREFIX}/items/${attachment.key}/file/view/url`, { signal: options.signal });
        const input = decodeURIComponent(new URL(result.data).pathname).replace(/^\/+/, "");
        const outputDir = this.nodeRequire("path").dirname(input);
        const translated = await this.runPdf2zh({ input, outputDir, mode, signal: options.signal });
        const fs = this.nodeRequire("fs");
        const bytes = new Uint8Array(fs.readFileSync(translated.outputPath));
        const filename = this.nodeRequire("path").basename(translated.outputPath);
        const created = await this.withWriteKey((apiKey) => this.zoteroRequest(`${USER_PREFIX}/items`, {
            method: "POST",
            apiKey,
            headers: { "Zotero-Write-Token": createWriteToken() },
            body: [{
                itemType: "attachment",
                linkMode: "imported_file",
                parentItem: item.key,
                title: filename,
                contentType: "application/pdf",
                tags: [],
                collections: []
            }],
            signal: options.signal
        }));
        const createdEntry = created.data?.successful?.["0"];
        const key = createdEntry?.key || createdEntry?.data?.key;
        if (!key) throw new Error("译稿附件创建失败");
        try {
            return await this.uploadZoteroFile(key, bytes, filename, { signal: options.signal });
        } catch (error) {
            try {
                await this.withWriteKey(async (apiKey) => {
                    let version = createdEntry?.version ?? createdEntry?.data?.version;
                    if (version === undefined) {
                        const current = await this.zoteroRequest(`${USER_PREFIX}/items/${key}`, { apiKey });
                        version = current.data?.data?.version ?? current.data?.version;
                    }
                    await this.zoteroRequest(`${USER_PREFIX}/items/${key}`, {
                        method: "DELETE",
                        apiKey,
                        headers: { "If-Unmodified-Since-Version": String(version) }
                    });
                });
            } catch {}
            throw error;
        }
    }

    initTranslationState() {
        if (this.translationJobs) return;
        this.translationJobs = new Map();
        this.translationControllers = new Map();
        this.translationQueue = [];
        this.translationActive = 0;
        this.translationCancelled = false;
    }

    async queueTranslations(itemKeys, mode = "mono") {
        this.initTranslationState();
        this.translationCancelled = false;
        const items = [...new Set(itemKeys)].map((key) => this.library.items.find((item) => item.key === key)).filter(Boolean);
        for (const item of items) {
            const status = this.translationJobs.get(item.key)?.status;
            if (status === "running" || status === "pending") continue;
            this.translationQueue.push(item);
            this.translationJobs.set(item.key, { status: "pending", mode, error: "" });
        }
        this.processTranslationQueue();
    }

    processTranslationQueue() {
        const concurrency = Math.max(1, Math.min(8, Number(this.settings.translationConcurrency) || 1));
        while (!this.translationCancelled && this.translationActive < concurrency && this.translationQueue.length) {
            const item = this.translationQueue.shift();
            const controller = new AbortController();
            this.translationControllers.set(item.key, controller);
            this.translationActive++;
            this.translationJobs.set(item.key, { status: "running", mode: this.translationJobs.get(item.key)?.mode || "mono", error: "" });
            this.runTranslationJob(item, controller).finally(() => {
                this.translationActive--;
                this.translationControllers.delete(item.key);
                this.processTranslationQueue();
            });
        }
        this.renderTranslationStatus();
    }

    async runTranslationJob(item, controller) {
        try {
            const result = await this.translationAttachment(item, this.translationJobs.get(item.key)?.mode || "mono", { signal: controller.signal });
            this.translationJobs.set(item.key, { status: controller.signal.aborted ? "cancelled" : "completed", mode: this.translationJobs.get(item.key)?.mode || "mono", error: "", result });
        } catch (error) {
            const cancelled = controller.signal.aborted || error.name === "AbortError";
            this.translationJobs.set(item.key, { status: cancelled ? "cancelled" : "error", mode: this.translationJobs.get(item.key)?.mode || "mono", error: errorMessage(error) });
        }
    }

    async waitForTranslationIdle(timeoutMs = 31 * 60 * 1000) {
        const deadline = Date.now() + timeoutMs;
        while (this.translationActive > 0 || this.translationQueue.length) {
            if (Date.now() >= deadline) throw new Error("等待翻译队列结束超时 / Translation queue wait timeout");
            await new Promise((resolve) => {
                const timer = setTimeout(resolve, Math.min(25, Math.max(1, deadline - Date.now())));
                timer.unref?.();
            });
        }
    }

    cancelTranslation(itemKey) {
        this.initTranslationState();
        const job = this.translationJobs.get(itemKey);
        if (job && ["running", "pending"].includes(job.status)) {
            this.translationJobs.set(itemKey, { ...job, status: "cancelled", error: "" });
        }
        this.translationQueue = this.translationQueue.filter((item) => item.key !== itemKey);
        this.translationControllers.get(itemKey)?.abort();
        this.renderTranslationStatus();
    }

    cancelTranslations() {
        this.initTranslationState();
        this.translationCancelled = true;
        for (const item of this.translationQueue) {
            this.translationJobs.set(item.key, { status: "cancelled", mode: this.translationJobs.get(item.key)?.mode || "mono", error: "" });
        }
        this.translationQueue = [];
        for (const controller of this.translationControllers.values()) controller.abort();
        this.renderTranslationStatus();
    }

    renderTranslationStatus() {
        if (!this.translationJobs) return;
        const values = [...this.translationJobs.values()];
        const running = values.filter((job) => job.status === "running").length;
        const completed = values.filter((job) => job.status === "completed").length;
        const failed = values.filter((job) => job.status === "error").length;
        const cancelled = values.filter((job) => job.status === "cancelled").length;
        this.renderStatus(`翻译：运行 ${running}，完成 ${completed}，失败 ${failed}，取消 ${cancelled}`);
    }

    openTranslationDialog(item) {
        const dialog = new Dialog({
            title: `翻译 / ${itemTitle(item)}`,
            content: `<div class="b3-dialog__content"><select class="b3-select fn__block" data-translation-mode><option value="mono">单语译稿</option><option value="dual">双语对照译稿</option></select><p>使用 pdf2zh 创建独立译稿附件，不覆盖原始 PDF。</p></div><div class="b3-dialog__action"><button class="b3-button b3-button--cancel" data-translation-cancel>取消此文献翻译</button><button class="b3-button b3-button--text" data-translation-start>开始翻译</button></div>`,
            width: "480px"
        });
        const mode = dialog.element.querySelector("[data-translation-mode]");
        dialog.element.querySelector("[data-translation-start]").addEventListener("click", () => {
            this.enqueue(() => this.queueTranslations([item.key], mode.value));
            dialog.destroy();
        });
        dialog.element.querySelector("[data-translation-cancel]").addEventListener("click", () => {
            this.cancelTranslation(item.key);
            dialog.destroy();
        });
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

    researchItemData(paper, itemType = paper?.itemType || "preprint") {
        const identity = this.researchPaperIdentity(paper);
        const creators = Array.isArray(paper.creators)
            ? paper.creators.map((creator) => ({
                creatorType: creator.creatorType || "author",
                lastName: cleanText(creator.family || creator.lastName),
                firstName: cleanText(creator.given || creator.firstName),
                name: cleanText(creator.name)
            }))
            : (Array.isArray(paper.authors) ? paper.authors : []).filter(Boolean).map((name) => ({ creatorType: "author", name: cleanText(name) }));
        const data = {
            itemType,
            title: cleanText(paper.title),
            creators,
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
            data.publicationTitle = cleanText(paper.venue || paper.publicationTitle || paper.journal);
        }
        return data;
    }

    async ensureResearchCollection(name) {
        const normalized = cleanText(name).toLocaleLowerCase();
        const existing = (this.library.collections || []).find((collection) => cleanText(collection.data?.name).toLocaleLowerCase() === normalized);
        if (existing) return existing.key;
        const created = await this.withWriteKey((apiKey) => this.zoteroRequest(`${USER_PREFIX}/collections`, {
            method: "POST",
            apiKey,
            headers: { "Zotero-Write-Token": createWriteToken() },
            body: [{ name: cleanText(name), parentCollection: false }]
        }));
        const saved = created.data?.successful?.["0"];
        const key = saved?.key || saved?.data?.key;
        if (!key) throw new Error("Zotero did not return the created collection key.");
        const collection = { key, data: { ...saved.data, key } };
        this.library.collections.push(collection);
        if (this.library.collectionObjects) this.library.collectionObjects[key] = collection;
        return key;
    }

    async assignResearchCollection(item, collectionKey) {
        const collections = Array.isArray(item.data?.collections) ? item.data.collections : [];
        if (collections.includes(collectionKey)) return false;
        const nextCollections = [...collections, collectionKey];
        await this.withWriteKey((apiKey) => this.zoteroRequest(`${USER_PREFIX}/items/${item.key}`, {
            method: "PATCH",
            apiKey,
            headers: { "If-Unmodified-Since-Version": String(item.data?.version ?? item.version) },
            body: { collections: nextCollections }
        }));
        item.data.collections = nextCollections;
        return true;
    }

    async createResearchItem(paper, collectionKey = "") {
        return this.withWriteKey(async (apiKey) => {
            let created;
            const itemData = this.researchItemData(paper);
            itemData.collections = collectionKey ? [collectionKey] : [];
            try {
                created = await this.zoteroRequest(`${USER_PREFIX}/items`, {
                    method: "POST",
                    apiKey,
                    headers: { "Zotero-Write-Token": createWriteToken() },
                    body: [itemData]
                });
            } catch (error) {
                if (error.status !== 400 || !/itemtype|preprint/i.test(errorMessage(error))) throw error;
                const fallbackData = this.researchItemData(paper, "journalArticle");
                fallbackData.collections = collectionKey ? [collectionKey] : [];
                created = await this.zoteroRequest(`${USER_PREFIX}/items`, {
                    method: "POST",
                    apiKey,
                    headers: { "Zotero-Write-Token": createWriteToken() },
                    body: [fallbackData]
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

    async ensurePapers(papers, options = {}) {
        if (!Array.isArray(papers) || papers.length > 50) throw new Error("papers must be an array of at most 50 items.");
        if (!papers.length) return [];
        if (!this.settings.notebook) throw new Error(this.t("selectNotebook"));
        await this.refreshLibrary(false);
        const collectionKey = await this.ensureResearchCollection("daily");
        const results = [];
        let changed = false;
        for (const paper of papers) {
            try {
                if (!cleanText(paper?.title)) throw new Error("Paper title is required.");
                let item = this.library.items.find((candidate) => this.researchItemMatches(candidate, paper));
                let itemStatus = "existing";
                if (!item || options.forceCreate) {
                    item = await this.createResearchItem(paper, collectionKey);
                    itemStatus = "created";
                    changed = true;
                    this.library.items.push(item);
                    if (this.library.itemObjects) this.library.itemObjects[item.key] = item;
                    await this.createResearchAttachment(item.key, paper);
                }
                if (await this.assignResearchCollection(item, collectionKey)) changed = true;
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

    async readResearchDocument(docId) {
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                return await this.request("/api/lute/copyStdMarkdown", { id: docId });
            } catch (error) {
                if (!/document metadata is not ready/i.test(errorMessage(error)) || attempt === 4) throw error;
                await new Promise((resolve) => setTimeout(resolve, this.researchReadRetryDelay ?? 500));
            }
        }
        throw new Error("Unable to read document metadata.");
    }

    async createResearchDocumentWithMd(path, markdown) {
        const segments = this.researchDocumentPath(path).split("/").filter(Boolean);
        let currentPath = "";
        let docId = "";
        for (let index = 0; index < segments.length; index++) {
            currentPath += `/${segments[index]}`;
            const ids = await this.request("/api/filetree/getIDsByHPath", { notebook: this.settings.notebook, path: currentPath });
            if (ids?.length) {
                docId = ids[0];
                continue;
            }
            docId = await this.request("/api/filetree/createDocWithMd", {
                notebook: this.settings.notebook,
                path: currentPath,
                markdown: index === segments.length - 1 ? String(markdown || "") : ""
            });
            if (index < segments.length - 1) await this.readResearchDocument(docId);
        }
        return docId;
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
                    docId = await this.createResearchDocumentWithMd(path, operation.markdown);
                } else {
                    const current = await this.readResearchDocument(docId);
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
                const exported = await this.readResearchDocument(docId);
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

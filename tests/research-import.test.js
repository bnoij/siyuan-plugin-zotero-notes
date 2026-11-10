const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem, openedDocuments, PluginClass } = require("./helpers/load-plugin.js");

function researchPaper(arxivId, title = `Paper ${arxivId}`) {
    return {
        arxiv_id: arxivId,
        title,
        authors: ["Researcher"],
        abstract: "Abstract",
        published: "2026-01-02",
        url: `https://arxiv.org/abs/${arxivId}`,
        pdf_url: `https://arxiv.org/pdf/${arxivId}`
    };
}

test("ensurePapers reuses an arXiv match and creates only the missing item and attachment", async () => {
    const existing = remoteItem("EXISTING");
    existing.data.extra = "arXiv: 2601.00001v2";
    const plugin = makePlugin();
    plugin.library.items = [existing];
    plugin.refreshLibrary = async () => {};
    plugin.withWriteKey = async (operation) => operation("secret");
    const writes = [];
    plugin.zoteroRequest = async (path, options = {}) => {
        writes.push({ path, options });
        const isAttachment = options.body?.[0]?.itemType === "attachment";
        const key = isAttachment ? "ATTACH1" : "NEWITEM";
        const data = isAttachment ? options.body[0] : {
            ...options.body[0],
            key,
            version: 1,
            dateModified: "2026-01-02T00:00:00Z"
        };
        return { data: { successful: { "0": { key, data } } }, response: new Headers() };
    };
    plugin.createOrOpen = async (item) => ({
        parentDocId: `parent-${item.key}`,
        noteDocId: `note-${item.key}`,
        path: `/Zotero/${item.data.title}`
    });

    const results = await plugin.ensurePapers([
        researchPaper("2601.00001v1"),
        researchPaper("2601.00002")
    ]);

    assert.deepEqual(results.map((result) => [result.itemKey, result.itemStatus]), [
        ["EXISTING", "existing"],
        ["NEWITEM", "created"]
    ]);
    assert.equal(results[1].noteDocId, "note-NEWITEM");
    assert.equal(writes.length, 2);
    assert.equal(writes[0].options.body[0].itemType, "preprint");
    assert.equal(writes[1].options.body[0].parentItem, "NEWITEM");
});

test("createOrOpen supports background document creation and returns both IDs", async () => {
    openedDocuments.length = 0;
    const plugin = makePlugin({
        loadData: async () => ({}),
        saveData: async () => {}
    });
    const ids = ["ROOTDOC", "PARENTDOC", "NOTEDOC"];
    plugin.request = async (url, data) => {
        if (url === "/api/filetree/getIDsByHPath") return [];
        if (url === "/api/filetree/createDocWithMd") return ids.shift();
        return null;
    };

    const result = await plugin.createOrOpen(remoteItem("ITEMKEY1"), { openTab: false });

    assert.deepEqual(result, {
        parentDocId: "PARENTDOC",
        noteDocId: "NOTEDOC",
        path: "/Zotero/Paper"
    });
    assert.equal(openedDocuments.length, 0);
    assert.deepEqual(plugin.bindings["server:ITEMKEY1"], {
        serverID: "server",
        itemKey: "ITEMKEY1",
        parentDocId: "PARENTDOC",
        noteDocId: "NOTEDOC",
        noteKey: ""
    });
});

test("createOrOpen keeps the default behavior of opening the Note", async () => {
    openedDocuments.length = 0;
    const plugin = makePlugin({
        loadData: async () => ({}),
        saveData: async () => {}
    });
    plugin.request = async (url) => {
        if (url === "/api/filetree/getIDsByHPath") return [];
        if (url === "/api/filetree/createDocWithMd") return url.includes("unused") ? "unused" : `doc-${Math.random()}`;
        return null;
    };

    await plugin.createOrOpen(remoteItem("ITEMKEY1"));

    assert.equal(openedDocuments.length, 1);
    assert.equal(openedDocuments[0].doc.id, plugin.bindings["server:ITEMKEY1"].noteDocId);
});

test("writeDocuments preserves the exact Markdown and stores the normalized hash", async () => {
    const plugin = makePlugin();
    let current = "# Note\n\n";
    const updates = [];
    const attrs = [];
    plugin.request = async (url, data) => {
        if (url === "/api/lute/copyStdMarkdown") return current;
        if (url === "/api/block/updateBlock") {
            updates.push(data);
            current = "# Note\n\n## 日报\n\n原样 **内容**";
            return null;
        }
        if (url === "/api/attr/setBlockAttrs") {
            attrs.push(data);
            return null;
        }
        return null;
    };
    const markdown = "## 日报\n\n原样 **内容**";

    const results = await plugin.writeDocuments([{
        docId: "doc1",
        markdown,
        expectedHash: PluginClass.stableHash(""),
        onConflict: "report",
        attrs: { "custom-research-workflow": "evil-read-arxiv" }
    }]);

    assert.equal(results[0].status, "written");
    assert.equal(updates[0].data, markdown);
    assert.equal(results[0].contentHash, PluginClass.stableHash(markdown));
    assert.equal(attrs[0].attrs["custom-research-content-hash"], results[0].contentHash);
});

test("writeDocuments reports a changed document and only overwrites on explicit request", async () => {
    const plugin = makePlugin();
    const updates = [];
    plugin.request = async (url, data) => {
        if (url === "/api/lute/copyStdMarkdown") return "# Note\n\nuser edited";
        if (url === "/api/block/updateBlock") updates.push(data);
        return null;
    };
    const operation = {
        docId: "doc1",
        markdown: "replacement",
        expectedHash: PluginClass.stableHash("expected old content"),
        onConflict: "report"
    };

    const conflict = await plugin.writeDocuments([operation]);
    const overwritten = await plugin.writeDocuments([{ ...operation, onConflict: "overwrite" }]);

    assert.equal(conflict[0].status, "conflict");
    assert.equal(updates.length, 1);
    assert.equal(overwritten[0].status, "written");
});

test("writeDocuments creates a whitelisted document path without treating it as a business template", async () => {
    const plugin = makePlugin();
    const creates = [];
    plugin.request = async (url, data) => {
        if (url === "/api/filetree/getIDsByHPath") return [];
        if (url === "/api/filetree/createDocWithMd") {
            creates.push(data);
            return "DAILYDOC";
        }
        if (url === "/api/lute/copyStdMarkdown") return "# Daily\n\n";
        return null;
    };

    const results = await plugin.writeDocuments([{
        path: "/Research/Daily/2026-11-10 论文推荐",
        markdown: " completely custom markdown ",
        expectedHash: null,
        attrs: {}
    }]);

    assert.equal(results[0].status, "written");
    assert.equal(results[0].docId, "DAILYDOC");
    assert.equal(creates[2].markdown, " completely custom markdown ");
});

test("writeDocuments creates missing parents before a nested document", async () => {
    const plugin = makePlugin();
    const creates = [];
    plugin.request = async (url, data) => {
        if (url === "/api/filetree/getIDsByHPath") return [];
        if (url === "/api/filetree/createDocWithMd") {
            creates.push(data);
            return `DOC_${creates.length}`;
        }
        if (url === "/api/lute/copyStdMarkdown") return "# Daily\n\ncontent";
        return null;
    };

    const results = await plugin.writeDocuments([{ path: "/Research/Daily/new", markdown: "content", expectedHash: null }]);

    assert.equal(results[0].status, "written");
    assert.deepEqual(creates.map((create) => create.path), ["/Research", "/Research/Daily", "/Research/Daily/new"]);
    assert.equal(creates[0].markdown, "");
    assert.equal(creates[1].markdown, "");
    assert.equal(creates[2].markdown, "content");
});

test("writeDocuments retries while new document metadata is not ready", async () => {
    const plugin = makePlugin();
    plugin.researchReadRetryDelay = 0;
    let reads = 0;
    plugin.request = async (url, data) => {
        if (url === "/api/filetree/getIDsByHPath") return [];
        if (url === "/api/filetree/createDocWithMd") return "NEW_DOC";
        if (url === "/api/lute/copyStdMarkdown") {
            reads++;
            if (reads === 1) throw new Error("document metadata is not ready");
            return "# Daily\n\ncontent";
        }
        return null;
    };

    const results = await plugin.writeDocuments([{ path: "/Research/Daily/new", markdown: "content", expectedHash: null }]);

    assert.equal(results[0].status, "written");
    assert.equal(reads, 4);
});

test("writeDocuments rejects traversal and unapproved attributes", async () => {
    const plugin = makePlugin();

    await assert.rejects(() => plugin.writeDocuments([{ path: "/Research/../secret", markdown: "x" }]), /path/i);
    await assert.rejects(() => plugin.writeDocuments([{ docId: "doc", markdown: "x", attrs: { title: "forged" } }]), /attribute/i);
});

test("processWorkflowJob dispatches only supported jobs and preserves partial outcomes", async () => {
    const plugin = makePlugin();
    plugin.ensurePapers = async () => [
        { itemKey: "ONE", itemStatus: "created" },
        { title: "Bad", itemStatus: "error", error: "write denied" }
    ];
    plugin.writeDocuments = async () => [{ docId: "doc", status: "written" }];

    const partial = await plugin.processWorkflowJob({ id: "job1", type: "ensure_papers", payload: { papers: [{}] } });
    const written = await plugin.processWorkflowJob({ id: "job2", type: "write_documents", payload: { documents: [{}] } });
    const invalid = await plugin.processWorkflowJob({ id: "job3", type: "delete_everything", payload: {} });

    assert.equal(partial.status, "partial");
    assert.equal(partial.result.papers.length, 2);
    assert.equal(written.status, "completed");
    assert.equal(invalid.status, "failed");
    assert.match(invalid.error, /unsupported/i);
});

test("claimWorkflowJob uses the shared workflow lock and moves one job to processing", async () => {
    const plugin = makePlugin();
    const lockNames = [];
    plugin.withExclusiveLock = async (name, operation) => {
        lockNames.push(name);
        return operation();
    };
    plugin.listWorkflowJobs = async () => [{ name: "a.json", updated: 10 }];
    plugin.readWorkflowJob = async () => ({ id: "a", type: "ensure_papers", payload: { papers: [] } });
    const moves = [];
    plugin.moveWorkflowJob = async (from, to) => moves.push({ from, to });

    const claimed = await plugin.claimWorkflowJob();

    assert.equal(claimed.id, "a");
    assert.deepEqual(lockNames, ["siyuan-plugin-zotero-notes:workflow-jobs"]);
    assert.equal(moves.length, 1);
    assert.match(moves[0].to, /processing\/a\.json$/);
});

test("recoverWorkflowJobs requeues only stale processing jobs", async () => {
    const plugin = makePlugin();
    const now = Date.now();
    plugin.listWorkflowJobs = async (directory) => directory === "processing" ? [
        { name: "stale.json", updated: now - 16 * 60 * 1000 },
        { name: "fresh.json", updated: now - 1000 }
    ] : [];
    plugin.readWorkflowJob = async (directory, name) => ({ id: name.replace(".json", "") });
    const moves = [];
    plugin.moveWorkflowJob = async (from, to) => moves.push({ from, to });

    await plugin.recoverWorkflowJobs(now);

    assert.equal(moves.length, 1);
    assert.match(moves[0].from, /processing\/stale\.json$/);
    assert.match(moves[0].to, /pending\/stale\.json$/);
});

test("workflow queue is enabled by default and can be disabled in settings", () => {
    const plugin = makePlugin();

    const defaults = plugin.normalizeSettings({});
    const disabled = plugin.normalizeSettings({ workflowQueueEnabled: false });

    assert.equal(defaults.workflowQueueEnabled, true);
    assert.equal(disabled.workflowQueueEnabled, false);
});

test("layout startup and unload manage the workflow queue lifecycle", async () => {
    const plugin = makePlugin();
    plugin.rebuildBindings = async () => {};
    let started = 0;
    let stopped = 0;
    plugin.startWorkflowQueue = () => { started++; };
    plugin.stopWorkflowQueue = () => { stopped++; };

    await plugin.onLayoutReady();
    plugin.onunload();

    assert.equal(started, 1);
    assert.equal(stopped, 1);
});

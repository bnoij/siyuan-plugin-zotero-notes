const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

test("uploadZoteroFile accepts absolute upload URLs", async () => {
    const plugin = makePlugin();
    plugin.library.serverID = "server";
    plugin.withWriteKey = async (operation) => operation("key");
    const originalFetch = globalThis.fetch;
    const requests = [];
    globalThis.fetch = async (url) => {
        requests.push(String(url));
        const body = requests.length === 1 ? JSON.stringify({ uploadKey: "u1", url: "http://127.0.0.1:23119/api/local/uploads/u1", prefix: "", suffix: "" }) : "";
        return new Response(body, { status: 200, headers: { "Zotero-Server-ID": "server" } });
    };
    try {
        await plugin.uploadZoteroFile("ATTACH1", new TextEncoder().encode("pdf"), "translated.pdf");
    } finally {
        globalThis.fetch = originalFetch;
    }
    assert.equal(requests[1], "http://127.0.0.1:23119/api/local/uploads/u1");
});

test("refreshCitationTree is idempotent when Reference already exists", async () => {
    const plugin = makePlugin();
    const attrs = {
        root: { "custom-zotero-cites": JSON.stringify([{ key: "A", form: "numeric" }]), "custom-zotero-style": "ieee" },
        reference: { "custom-zotero-cites": JSON.stringify([{ key: "A", form: "numeric" }]), "custom-zotero-style": "ieee" }
    };
    const writes = [];
    plugin.request = async (url, data) => {
        if (url === "/api/filetree/getPathByID") return { notebook: "notebook", path: "/root.sy" };
        if (url === "/api/filetree/getHPathByID") return "/Book";
        if (url === "/api/query/sql") return [{ id: "reference", hpath: "/Book/Reference" }];
        if (url === "/api/attr/getBlockAttrs") return attrs[data.id] || {};
        if (url === "/api/filetree/getIDsByHPath") return ["reference"];
        if (url === "/api/attr/setBlockAttrs") writes.push(data);
        return null;
    };
    plugin.refreshBibliography = async () => {};
    await plugin.refreshCitationTree("root");
    await plugin.refreshCitationTree("root");
    const referenceWrite = writes.at(-1);
    const referenceEntries = JSON.parse(referenceWrite.attrs["custom-zotero-cites"]);
    assert.equal(referenceEntries.length, 1);
    assert.equal(referenceEntries[0].number, 1);
});

test("queueTranslations does not start a duplicate running or pending item", async () => {
    const plugin = makePlugin();
    plugin.initTranslationState();
    plugin.translationJobs.set("PAPER001", { status: "running", mode: "mono" });
    plugin.translationQueue = [];
    plugin.library.items = [remoteItem("PAPER001")];
    await plugin.queueTranslations(["PAPER001", "PAPER001"], "mono");
    assert.equal(plugin.translationQueue.length, 0);
});

test("refreshCitationTree escapes quotes and LIKE wildcards in root paths", async () => {
    const plugin = makePlugin();
    const statements = [];
    plugin.request = async (url, data) => {
        if (url === "/api/filetree/getPathByID") return { notebook: "notebook", path: "/root.sy" };
        if (url === "/api/filetree/getHPathByID") return "/Book's 100%";
        if (url === "/api/query/sql") { statements.push(data.stmt); return []; }
        if (url === "/api/attr/getBlockAttrs") return {};
        if (url === "/api/filetree/getIDsByHPath") return ["reference"];
        return null;
    };
    plugin.refreshBibliography = async () => {};
    await plugin.refreshCitationTree("root");
    assert.match(statements[0], /Book''s 100\\%/);
});

test("translationAttachment cleans up a newly created attachment on upload failure", async () => {
    const plugin = makePlugin();
    plugin.zoteroRequest = async () => ({ data: "file:///C:/paper.pdf" });
    plugin.runPdf2zh = async () => ({ outputPath: "out.pdf", mode: "mono" });
    plugin.nodeRequire = (name) => name === "path" ? require("path") : { readFileSync: () => new Uint8Array([1]) };
    plugin.uploadZoteroFile = async () => { throw new Error("upload failed"); };
    const calls = [];
    plugin.zoteroRequest = async (path, options = {}) => {
        calls.push({ path, options });
        if ((options.method || "GET") === "POST") return { data: { successful: { "0": { key: "NEWATTACH", version: 7 } } } };
        return { data: "file:///C:/paper.pdf" };
    };
    plugin.withWriteKey = async (operation) => operation("key");
    const item = { key: "PAPER001", attachments: [{ key: "PDF1", data: { contentType: "application/pdf" } }] };
    await assert.rejects(plugin.translationAttachment(item, "mono"), /upload failed/);
    const cleanup = calls.find((call) => call.options.method === "DELETE");
    assert.equal(cleanup?.path, "/users/0/items/NEWATTACH");
    assert.equal(cleanup?.options.headers["If-Unmodified-Since-Version"], "7");
});

test("waitForTranslationIdle rejects on timeout", async () => {
    const plugin = makePlugin();
    plugin.translationActive = 1;
    plugin.translationQueue = [];
    await assert.rejects(plugin.waitForTranslationIdle(20), /timeout|超时/);
});

test("GetFromPool bounds payloads and reports total count", async () => {
    const plugin = makePlugin();
    plugin.agentActions = {};
    plugin.addAgentAction = (action) => { plugin.agentActions[action.name] = action; };
    plugin.eventBus = { handlers: {}, on(name, handler) { this.handlers[name] = handler; }, off(name) { delete this.handlers[name]; } };
    plugin.registerAgentActions();
    plugin.library.items = Array.from({ length: 250 }, (_, index) => remoteItem(`KEY${index}`));
    const payloads = {};
    plugin.eventBus.handlers.GetFromPool({ detail: { triggerFn: (key, data) => { payloads[key] = data; } } });
    assert.equal(payloads.total, 250);
    assert.equal(payloads.all.length, 200);
});


test("translationAttachment forwards cancellation to reads, creation, and upload", async () => {
    const plugin = makePlugin();
    const controller = new AbortController();
    const signals = [];
    plugin.zoteroRequest = async (path, options = {}) => {
        signals.push(options.signal);
        if (options.method === "POST") return { data: { successful: { "0": { key: "NEWATTACH", version: 7 } } } };
        return { data: "file:///C:/paper.pdf" };
    };
    plugin.runPdf2zh = async () => ({ outputPath: "out.pdf", mode: "mono" });
    plugin.nodeRequire = (name) => name === "path" ? require("path") : { readFileSync: () => new Uint8Array([1]) };
    plugin.withWriteKey = async (operation) => operation("key");
    plugin.uploadZoteroFile = async (key, bytes, filename, options) => { signals.push(options?.signal); return { key }; };
    const item = { key: "PAPER001", attachments: [{ key: "PDF1", data: { contentType: "application/pdf" } }] };
    await plugin.translationAttachment(item, "mono", { signal: controller.signal });
    assert.equal(signals.length, 3);
    assert.ok(signals.every((signal) => signal === controller.signal));
});

test("uploadZoteroFile forwards cancellation through all upload phases", async () => {
    const plugin = makePlugin();
    const controller = new AbortController();
    const signals = [];
    plugin.withWriteKey = async (operation) => operation("key");
    plugin.zoteroRequest = async (path, options = {}) => {
        signals.push(options.signal);
        if (signals.length === 1) return { data: { uploadKey: "u1", url: "http://127.0.0.1:23119/api/local/uploads/u1" } };
        return { data: null };
    };
    await plugin.uploadZoteroFile("ATTACH1", new Uint8Array([1]), "translated.pdf", { signal: controller.signal });
    assert.equal(signals.length, 3);
    assert.ok(signals.every((signal) => signal === controller.signal));
});


test("uploadZoteroFile uses the negotiated content type and prefix/suffix framing", async () => {
    const plugin = makePlugin();
    const calls = [];
    plugin.withWriteKey = async (operation) => operation("key");
    plugin.zoteroRequest = async (path, options = {}) => {
        calls.push({ path, options });
        if (calls.length === 1) return { data: {
            uploadKey: "u1",
            url: "http://127.0.0.1:23119/api/local/uploads/u1",
            contentType: "application/x-www-form-urlencoded",
            prefix: "prefix\n",
            suffix: "\nsuffix"
        } };
        return { data: null };
    };
    await plugin.uploadZoteroFile("ATTACH1", new TextEncoder().encode("PDF"), "translated.pdf");
    const upload = calls[1];
    assert.equal(calls[0].options.headers["Content-Type"], "application/x-www-form-urlencoded");
    assert.equal(upload.options.headers["Content-Type"], "application/x-www-form-urlencoded");
    assert.equal(new TextDecoder().decode(upload.options.rawBody), "prefix\nPDF\nsuffix");
    assert.equal(calls[2].options.headers["Content-Type"], "application/x-www-form-urlencoded");
});

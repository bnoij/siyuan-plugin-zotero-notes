const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

function setupAgent(plugin) {
    plugin.agentActions = {};
    plugin.addAgentAction = (action) => { plugin.agentActions[action.name] = action; };
    plugin.eventBus = { on() {}, off() {} };
    plugin.registerAgentActions();
}

test("defaultProcessRunner kills and rejects a process that exceeds its timeout", async () => {
    const plugin = makePlugin();
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    let killed = false;
    child.kill = () => { killed = true; };
    plugin.nodeRequire = () => ({ spawn: () => child });
    const outcome = await Promise.race([
        plugin.defaultProcessRunner("pdf2zh", [], { timeout: 5 }).then(() => "resolved", (error) => error.message),
        new Promise((resolve) => setTimeout(() => resolve("pending"), 40))
    ]);
    assert.match(outcome, /timeout|超时/);
    assert.equal(killed, true);
});

test("translationEnvironment reads only explicitly named SiYuan secrets", async () => {
    const plugin = makePlugin();
    plugin.settings.translationSecretNames = ["OPENAI_API_KEY"];
    const requested = [];
    plugin.getSecret = async (name) => { requested.push(name); return "secret-from-siyuan"; };
    const env = await plugin.translationEnvironment({ UNRELATED_TOKEN: "drop", SAFE_VALUE: "keep" });
    assert.deepEqual(requested, ["OPENAI_API_KEY"]);
    assert.equal(env.OPENAI_API_KEY, "secret-from-siyuan");
    assert.equal(env.UNRELATED_TOKEN, undefined);
    assert.equal(env.SAFE_VALUE, "keep");
});

test("cancelTranslation cancels only the selected queue item", () => {
    const plugin = makePlugin();
    plugin.initTranslationState();
    const selected = new AbortController();
    const other = new AbortController();
    plugin.translationControllers.set("A", selected);
    plugin.translationControllers.set("B", other);
    plugin.translationJobs.set("A", { status: "running", mode: "mono" });
    plugin.translationJobs.set("B", { status: "running", mode: "mono" });
    plugin.translationQueue = [{ key: "A" }, { key: "B" }];
    plugin.cancelTranslation("A");
    assert.equal(selected.signal.aborted, true);
    assert.equal(other.signal.aborted, false);
    assert.deepEqual(plugin.translationQueue.map((item) => item.key), ["B"]);
    assert.equal(plugin.translationCancelled, false);
});

test("translate_paper returns the job error instead of reporting success", async () => {
    const plugin = makePlugin();
    setupAgent(plugin);
    plugin.initTranslationState();
    plugin.queueTranslations = async () => {
        plugin.translationJobs.set("PAPER001", { status: "error", mode: "mono", error: "pdf2zh crashed" });
    };
    plugin.waitForTranslationIdle = async () => {};
    const result = await plugin.agentActions.translate_paper.handler({ itemKey: "PAPER001", mode: "mono" });
    assert.match(result.error, /pdf2zh crashed/);
    assert.equal(result.result, undefined);
});

test("write_documents accepts report and overwrite but rejects error policy", async () => {
    const plugin = makePlugin();
    setupAgent(plugin);
    const policies = [];
    plugin.writeDocuments = async (documents) => { policies.push(documents[0].onConflict); return []; };
    const document = { path: "/Zotero/Paper", content: "text" };
    assert.doesNotMatch(JSON.stringify(await plugin.agentActions.write_documents.handler({ documents: [{ ...document, onConflict: "report" }] })), /error/i);
    await plugin.agentActions.write_documents.handler({ documents: [{ ...document, onConflict: "overwrite" }] });
    const invalid = await plugin.agentActions.write_documents.handler({ documents: [{ ...document, onConflict: "error" }] });
    assert.match(invalid.error, /Invalid|冲突/);
    assert.deepEqual(policies, ["report", "overwrite"]);
});

test("refreshBibliography removes only the managed block when registry becomes empty", async () => {
    const plugin = makePlugin();
    const deleted = [];
    plugin.request = async (url, data) => {
        if (url === "/api/attr/getBlockAttrs") return { "custom-zotero-cites": "[]" };
        if (url === "/api/query/sql") return [{ block_id: "managed-bib" }];
        if (url === "/api/block/deleteBlock") { deleted.push(data.id); return null; }
        throw new Error(`Unexpected request: ${url}`);
    };
    plugin.formatBibliography = async () => { throw new Error("must not format an empty registry"); };
    await plugin.refreshBibliography("doc1");
    assert.deepEqual(deleted, ["managed-bib"]);
});

test("refreshCitationTree uses the configured default citation style", async () => {
    const plugin = makePlugin();
    plugin.settings.citationStyle = "apa";
    const writes = [];
    plugin.request = async (url, data) => {
        if (url === "/api/filetree/getPathByID") return { notebook: "notebook", path: "/root.sy" };
        if (url === "/api/filetree/getHPathByID") return "/Book";
        if (url === "/api/query/sql") return [];
        if (url === "/api/attr/getBlockAttrs") return { "custom-zotero-cites": JSON.stringify([{ key: "A", form: "numeric" }]) };
        if (url === "/api/filetree/getIDsByHPath") return [];
        if (url === "/api/filetree/createDocWithMd") return "reference";
        if (url === "/api/attr/setBlockAttrs") { writes.push(data); return null; }
        return null;
    };
    plugin.refreshBibliography = async () => {};
    await plugin.refreshCitationTree("root");
    assert.ok(writes.every((write) => write.attrs["custom-zotero-style"] === "apa"));
});

test("syncConnectedCollection uses stable document identity and reports missing items", async () => {
    const plugin = makePlugin();
    let refreshes = 0;
    plugin.refreshLibrary = async () => { refreshes++; };
    plugin.refreshCitationTree = async () => ["A", "MISSING"];
    plugin.library.items = [remoteItem("A")];
    plugin.ensureResearchCollection = async (name) => {
        assert.equal(name, "【【Connected Documents】】→ root");
        return "collection1";
    };
    plugin.assignResearchCollection = async () => true;
    await assert.rejects(plugin.syncConnectedCollection("root"), (error) => {
        assert.match(error.message, /MISSING/);
        assert.deepEqual(error.missingItemKeys, ["MISSING"]);
        return true;
    });
    assert.equal(refreshes, 1);
});

test("syncConnectedCollection refreshes and retries after a 412 database change", async () => {
    const plugin = makePlugin();
    let refreshes = 0;
    let attempts = 0;
    plugin.refreshLibrary = async () => { refreshes++; };
    plugin.refreshCitationTree = async () => ["A"];
    plugin.library.items = [remoteItem("A")];
    plugin.ensureResearchCollection = async () => "collection1";
    plugin.assignResearchCollection = async () => {
        attempts++;
        if (attempts === 1) {
            const error = new Error("database changed");
            error.status = 412;
            throw error;
        }
        return true;
    };
    const key = await plugin.syncConnectedCollection("root");
    assert.equal(key, "collection1");
    assert.equal(refreshes, 2);
    assert.equal(attempts, 2);
});


test("queueTranslations leaves running and pending jobs untouched", async () => {
    const plugin = makePlugin();
    plugin.initTranslationState();
    plugin.library.items = [remoteItem("A")];
    const running = { status: "running", mode: "mono", error: "" };
    plugin.translationJobs.set("A", running);
    plugin.translationActive = 1;
    let started = false;
    plugin.translationAttachment = async () => { started = true; };
    await plugin.queueTranslations(["A", "A"], "dual");
    assert.equal(started, false);
    assert.equal(plugin.translationJobs.get("A"), running);
    assert.equal(plugin.translationQueue.length, 0);
});


test("normalizeSettings stores only valid unique translation secret names", () => {
    const plugin = makePlugin();
    const settings = plugin.normalizeSettings({ translationSecretNames: "OPENAI_API_KEY, INVALID-NAME, OPENAI_API_KEY, OTHER_TOKEN" });
    assert.deepEqual(settings.translationSecretNames, ["OPENAI_API_KEY", "OTHER_TOKEN"]);
});

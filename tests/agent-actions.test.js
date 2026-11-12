const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

function setupAgent(plugin) {
    plugin.agentActions = {};
    plugin.addAgentAction = (action) => { plugin.agentActions[action.name] = action; };
    plugin.eventBus = {
        handlers: {},
        on(name, handler) { this.handlers[name] = handler; },
        off(name, handler) { if (this.handlers[name] === handler) delete this.handlers[name]; }
    };
    plugin.registerAgentActions();
}

test("Agent actions expose ensure_papers, write_documents, refresh_library, and translate_paper", async () => {
    const plugin = makePlugin();
    setupAgent(plugin);
    assert.deepEqual(Object.keys(plugin.agentActions).sort(), ["ensure_papers", "refresh_library", "translate_paper", "write_documents"]);
    plugin.ensurePapers = async () => [{ itemKey: "A", itemStatus: "created" }];
    const result = await plugin.agentActions.ensure_papers.handler({ papers: [{ title: "Paper" }] });
    assert.match(result.result, /A/);
    plugin.refreshLibrary = async () => {};
    assert.match((await plugin.agentActions.refresh_library.handler({})).result, /0/);
});

test("write_documents rejects invalid payloads without calling the writer", async () => {
    const plugin = makePlugin();
    setupAgent(plugin);
    let called = false;
    plugin.writeDocuments = async () => { called = true; };
    const result = await plugin.agentActions.write_documents.handler({ documents: [{ path: "../escape" }] });
    assert.match(result.error, /Invalid|path|路径/);
    assert.equal(called, false);
});

test("translate_paper returns per-job state without exposing secrets", async () => {
    const plugin = makePlugin();
    setupAgent(plugin);
    plugin.library.items = [remoteItem("PAPER001")];
    plugin.initTranslationState();
    plugin.queueTranslations = async () => {
        plugin.translationJobs.set("PAPER001", { status: "completed", mode: "dual", error: "" });
    };
    plugin.waitForTranslationIdle = async () => {};
    const result = await plugin.agentActions.translate_paper.handler({ itemKey: "PAPER001", mode: "dual" });
    assert.match(result.result, /翻译/);
    assert.doesNotMatch(JSON.stringify(result), /zotero-write-keys|apiKey|secret/);
});

test("eventBus GetFromPool and Refresh work and are removed on unload", async () => {
    const plugin = makePlugin();
    setupAgent(plugin);
    plugin.library.items = [remoteItem("PAPER001")];
    let payload;
    plugin.eventBus.handlers.GetFromPool({ detail: { triggerFn: (key, data) => { payload = { key, data }; } } });
    assert.equal(payload.key, "all");
    assert.equal(payload.data.length, 1);
    plugin.refreshLibrary = async () => {};
    await plugin.eventBus.handlers.Refresh({ detail: { type: "database" } });
    plugin.onunload();
    assert.equal(plugin.eventBus.handlers.GetFromPool, undefined);
    assert.equal(plugin.eventBus.handlers.Refresh, undefined);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem, stubRemote } = require("./helpers/load-plugin.js");

test("onDataChanged reloads storage without writing or refreshing", async () => {
    const plugin = makePlugin();
    let reads = 0;
    plugin.loadData = async (name) => {
        reads++;
        if (name === "settings.json") return { notebook: "new-notebook", rootName: "Zotero", autoImport: false };
        if (name === "library-cache.json") return { serverID: "server", collections: [], items: [], importedAt: 456 };
        if (name === "bindings.json") return { "server:ITEMKEY1": { itemKey: "ITEMKEY1" } };
        if (name === "zotero-write-keys.json") return { server: "secret" };
        return null;
    };
    plugin.refreshLibrary = async () => {
        throw new Error("onDataChanged must not refresh Zotero");
    };
    await plugin.onDataChanged();
    assert.equal(reads, 4);
    assert.equal(plugin.settings.notebook, "new-notebook");
    assert.equal(plugin.library.importedAt, 456);
    assert.equal(plugin.bindings["server:ITEMKEY1"].itemKey, "ITEMKEY1");
});

test("rebuildBindings updates memory without startup persistence", async () => {
    const writes = [];
    const plugin = makePlugin({
        saveData: async (name, value) => writes.push({ name, value }),
        request: async () => [{
            block_id: "doc1",
            name: "custom-zotero-item-key",
            value: "ITEMKEY1"
        }, {
            block_id: "doc1",
            name: "custom-zotero-server-id",
            value: "server"
        }]
    });
    await plugin.rebuildBindings();
    assert.equal(writes.length, 0);
    assert.equal(plugin.bindings["server:ITEMKEY1"].parentDocId, "doc1");
});

test("refreshLibrary skips persistence when remote content is unchanged", async () => {
    const item = remoteItem();
    const collection = { key: "COLLECT1", data: { key: "COLLECT1", name: "Collection", parentCollection: false } };
    const writes = [];
    const plugin = makePlugin({
        saveData: async (name, value) => writes.push({ name, value })
    });
    plugin.library = {
        serverID: "server",
        collections: [collection],
        items: [{ ...item, attachments: [], stale: false }],
        importedAt: 123
    };
    stubRemote(plugin, { items: [item], collections: [collection] });
    await plugin.refreshLibrary(false);
    assert.equal(writes.length, 0);
    assert.equal(plugin.library.importedAt, 123);
});

test("onLayoutReady starts automatic import without waiting for the network", { timeout: 100 }, async () => {
    let finishRefresh;
    let started = false;
    const plugin = makePlugin();
    plugin.settings.autoImport = true;
    plugin.rebuildBindings = async () => {};
    plugin.refreshLibrary = () => {
        started = true;
        return new Promise((resolve) => { finishRefresh = resolve; });
    };
    await plugin.onLayoutReady();
    assert.equal(started, true);
    finishRefresh();
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem, stubRemote } = require("./helpers/load-plugin.js");

function installLockRecorder(names) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: {
            locks: {
                request: async (name, options, callback) => {
                    names.push(name);
                    return callback();
                }
            }
        }
    });
    return () => {
        if (previous) Object.defineProperty(globalThis, "navigator", previous);
        else delete globalThis.navigator;
    };
}

test("onDataChanged preserves bindings recovered from document attributes", async () => {
    const plugin = makePlugin();
    plugin.bindings["server:RECOVERED"] = {
        itemKey: "RECOVERED",
        serverID: "server",
        parentDocId: "recovered-doc"
    };
    plugin.loadData = async (name) => name === "settings.json" ? plugin.settings : {};
    await plugin.onDataChanged();
    assert.equal(plugin.bindings["server:RECOVERED"].parentDocId, "recovered-doc");
});

test("reloadBindingsFromStorage preserves memory-only recovered bindings", async () => {
    const plugin = makePlugin();
    plugin.bindings["server:RECOVERED"] = {
        itemKey: "RECOVERED",
        serverID: "server",
        parentDocId: "recovered-doc"
    };
    plugin.loadData = async () => ({});
    await plugin.reloadBindingsFromStorage();
    assert.equal(plugin.bindings["server:RECOVERED"].parentDocId, "recovered-doc");
});

test("saveBinding uses the shared bindings lock", async () => {
    const names = [];
    const restore = installLockRecorder(names);
    const plugin = makePlugin();
    plugin.loadData = async () => ({});
    plugin.request = async () => null;
    plugin.saveData = async () => {};
    try {
        await plugin.saveBinding({ itemKey: "ITEMKEY1", serverID: "server", parentDocId: "doc1" });
    } finally {
        restore();
    }
    assert.deepEqual(names, ["siyuan-plugin-zotero-notes:bindings"]);
});

test("refreshLibrary persists actual changes with a deterministic timestamp and shared lock", async () => {
    const names = [];
    const restore = installLockRecorder(names);
    const item = remoteItem();
    const writes = [];
    const plugin = makePlugin();
    plugin.library = { serverID: "server", collections: [], items: [], importedAt: 123 };
    plugin.loadData = async () => ({
        "server:OTHERKEY": { itemKey: "OTHERKEY", serverID: "server", parentDocId: "doc2" }
    });
    plugin.saveData = async (name, value) => writes.push({ name, value });
    stubRemote(plugin, { items: [item], collections: [] });
    try {
        await plugin.refreshLibrary(false);
    } finally {
        restore();
    }
    assert.equal(writes.length, 2);
    assert.equal(plugin.library.importedAt, Date.parse(item.data.dateModified));
    assert.equal(plugin.bindings["server:OTHERKEY"].parentDocId, "doc2");
    assert.deepEqual(names, ["siyuan-plugin-zotero-notes:bindings"]);
});

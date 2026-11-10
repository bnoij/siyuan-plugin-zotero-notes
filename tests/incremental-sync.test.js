const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem, PluginClass } = require("./helpers/load-plugin.js");

function versionedItem(key, version) {
    const item = remoteItem(key);
    item.version = version;
    return item;
}

function stubIncrementalRemote(plugin, { itemVersions, collectionVersions = {}, fetchedItems = [], fetchedCollections = [] }) {
    const fetches = [];
    plugin.zoteroPage = async (path) => {
        if (path.includes("format=versions")) {
            return {
                data: path.includes("/collections") ? collectionVersions : itemVersions,
                response: new Headers(),
                serverID: "server"
            };
        }
        if (path.includes("itemKey=") || path.includes("collectionKey=")) {
            fetches.push(path);
            return {
                data: path.includes("/collections") ? fetchedCollections : fetchedItems,
                response: new Headers(),
                serverID: "server"
            };
        }
        return { data: [], response: new Headers(), serverID: "server" };
    };
    return fetches;
}

test("diffObjectVersions detects changed, new, and deleted keys", () => {
    const cached = { A: { version: 1 }, B: { version: 1 } };
    const diff = PluginClass.diffObjectVersions(cached, { A: 1, C: 2 });
    assert.deepEqual(diff.changed, ["C"]);
    assert.deepEqual(diff.deleted, ["B"]);
    const changedDiff = PluginClass.diffObjectVersions(cached, { A: 2, B: 1 });
    assert.deepEqual(changedDiff.changed, ["A"]);
    assert.deepEqual(changedDiff.deleted, []);
});

test("composeLibraryFromObjects groups attachments and excludes notes", () => {
    const parent = versionedItem("PARENT1", 1);
    const attachment = {
        key: "ATTACH1",
        version: 1,
        data: { key: "ATTACH1", itemType: "attachment", parentItem: "PARENT1", title: "PDF", dateModified: "2026-02-01T00:00:00Z" }
    };
    const note = {
        key: "NOTE1",
        version: 1,
        data: { key: "NOTE1", itemType: "note", parentItem: "PARENT1" }
    };
    const library = PluginClass.composeLibraryFromObjects("server", { PARENT1: parent, ATTACH1: attachment, NOTE1: note }, {}, 0);
    assert.equal(library.items.length, 1);
    assert.equal(library.items[0].key, "PARENT1");
    assert.deepEqual(library.items[0].attachments.map((item) => item.key), ["ATTACH1"]);
    assert.equal(library.importedAt, Date.parse("2026-02-01T00:00:00Z"));
});

test("cacheToLibrary converts the legacy array cache into object maps", () => {
    const parent = remoteItem("PARENT1");
    const attachment = { key: "ATTACH1", data: { key: "ATTACH1", itemType: "attachment", parentItem: "PARENT1" } };
    const library = PluginClass.cacheToLibrary({
        serverID: "server",
        items: [{ ...parent, attachments: [attachment] }],
        collections: [],
        importedAt: 456
    });
    assert.equal(library.importedAt, 456);
    assert.deepEqual(Object.keys(library.itemObjects).sort(), ["ATTACH1", "PARENT1"]);
    assert.equal(library.itemObjects.PARENT1.attachments, undefined);
    assert.equal(library.items[0].attachments[0].key, "ATTACH1");
    assert.equal(PluginClass.cacheToLibrary(null), null);
});

test("incremental refresh fetches only changed keys and detects deletions", async () => {
    const plugin = makePlugin({
        saveData: async () => {},
        loadData: async () => ({})
    });
    plugin.library = PluginClass.composeLibraryFromObjects("server", {
        A: versionedItem("A", 1),
        B: versionedItem("B", 1)
    }, {}, 0);
    plugin.bindings = { "server:B": { serverID: "server", itemKey: "B", parentDocId: "docB" } };
    plugin.fetchAll = async () => { throw new Error("incremental refresh must not use full fetch"); };
    const fetches = stubIncrementalRemote(plugin, {
        itemVersions: { A: 1, C: 2 },
        fetchedItems: [versionedItem("C", 2)]
    });
    await plugin.refreshLibrary(false);
    assert.deepEqual(plugin.library.items.map((item) => item.key).sort(), ["A", "C"]);
    assert.equal(plugin.library.itemObjects.B, undefined);
    assert.equal(plugin.bindings["server:B"].stale, true);
    assert.equal(fetches.length, 1);
    assert.ok(fetches[0].includes("itemKey=C"));
});

test("incremental refresh without changes downloads nothing and skips persistence", async () => {
    const writes = [];
    const plugin = makePlugin({
        saveData: async (name, value) => writes.push({ name, value }),
        loadData: async () => ({})
    });
    plugin.library = PluginClass.composeLibraryFromObjects("server", { A: versionedItem("A", 1) }, {}, 0);
    plugin.fetchAll = async () => { throw new Error("incremental refresh must not use full fetch"); };
    const fetches = stubIncrementalRemote(plugin, { itemVersions: { A: 1 } });
    await plugin.refreshLibrary(false);
    assert.equal(fetches.length, 0);
    assert.equal(writes.length, 0);
    assert.deepEqual(plugin.library.items.map((item) => item.key), ["A"]);
});

test("full sync mode bypasses the versions diff", async () => {
    const plugin = makePlugin({
        saveData: async () => {},
        loadData: async () => ({})
    });
    plugin.settings.syncMode = "full";
    plugin.library = PluginClass.composeLibraryFromObjects("server", { A: versionedItem("A", 1) }, {}, 0);
    plugin.fetchAll = async (path) => path.includes("collections") ? [] : [versionedItem("A", 1)];
    let versionsRequested = false;
    plugin.zoteroPage = async (path) => {
        if (path.includes("format=versions")) versionsRequested = true;
        return { data: [], response: new Headers(), serverID: "server" };
    };
    await plugin.refreshLibrary(false);
    assert.equal(versionsRequested, false);
    assert.deepEqual(plugin.library.items.map((item) => item.key), ["A"]);
});

test("a different Zotero server forces a full refresh", async () => {
    const plugin = makePlugin({
        saveData: async () => {},
        loadData: async () => ({})
    });
    plugin.library = PluginClass.composeLibraryFromObjects("old-server", { A: versionedItem("A", 1) }, {}, 0);
    plugin.fetchAll = async (path) => path.includes("collections") ? [] : [versionedItem("B", 1)];
    let versionsRequested = false;
    plugin.zoteroPage = async (path) => {
        if (path.includes("format=versions")) versionsRequested = true;
        return { data: [], response: new Headers(), serverID: "server" };
    };
    await plugin.refreshLibrary(false);
    assert.equal(versionsRequested, false);
    assert.deepEqual(plugin.library.items.map((item) => item.key), ["B"]);
});

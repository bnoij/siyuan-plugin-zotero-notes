const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem, openedDocuments } = require("./helpers/load-plugin.js");

test("saveBinding merges bindings written by another window", async () => {
    let persisted;
    const plugin = makePlugin();
    plugin.bindings = {
        "server:ITEMKEY1": { itemKey: "ITEMKEY1", serverID: "server", parentDocId: "doc1" }
    };
    plugin.loadData = async () => ({
        "server:OTHERKEY": { itemKey: "OTHERKEY", serverID: "server", parentDocId: "doc2" }
    });
    plugin.request = async () => null;
    plugin.saveData = async (name, value) => { persisted = value; };
    await plugin.saveBinding(plugin.bindings["server:ITEMKEY1"]);
    assert.deepEqual(Object.keys(persisted).sort(), ["server:ITEMKEY1", "server:OTHERKEY"]);
});

test("createOrOpen reloads bindings before creating a document", async () => {
    openedDocuments.length = 0;
    const item = remoteItem();
    const existing = {
        itemKey: item.key,
        serverID: "server",
        parentDocId: "existing-parent",
        noteDocId: "existing-note",
        noteKey: ""
    };
    const plugin = makePlugin();
    plugin.loadData = async () => ({ [`server:${item.key}`]: existing });
    plugin.request = async (url) => {
        if (url.includes("createDocWithMd")) throw new Error("Must not create a duplicate document");
        if (url === "/api/query/sql") return [{ id: "existing-parent" }, { id: "existing-note" }];
        return [];
    };
    await plugin.createOrOpen(item);
    assert.equal(openedDocuments.length, 1);
    assert.equal(openedDocuments[0].doc.id, "existing-parent");
});

test("createOrOpen uses an origin-wide lock when Web Locks are available", async () => {
    const item = remoteItem();
    const plugin = makePlugin();
    const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    let lockName = "";
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: {
            locks: {
                request: async (name, options, callback) => {
                    lockName = name;
                    return callback();
                }
            }
        }
    });
    plugin.loadData = async () => ({
        [`server:${item.key}`]: {
            itemKey: item.key,
            serverID: "server",
            parentDocId: "existing-parent",
            noteDocId: "existing-note"
        }
    });
    plugin.request = async (url) => {
        if (url === "/api/query/sql") return [{ id: "existing-parent" }, { id: "existing-note" }];
        if (url === "/api/attr/getBlockAttrs") return {};
        if (url === "/api/filetree/getHPathByID") return "/Zotero/Paper";
        return null;
    };
    try {
        await plugin.createOrOpen(item);
    } finally {
        if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
        else delete globalThis.navigator;
    }
    assert.equal(lockName, "siyuan-plugin-zotero-notes:item:ITEMKEY1");
});

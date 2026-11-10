const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, PluginClass: ZoteroNotesPlugin } = require("./helpers/load-plugin.js");

test("isDirectChildOfRoot detects only direct children of the root", () => {
    assert.equal(ZoteroNotesPlugin.isDirectChildOfRoot("/Zotero/Paper", "/Zotero"), true);
    assert.equal(ZoteroNotesPlugin.isDirectChildOfRoot("/Zotero/Paper/Note", "/Zotero"), false);
    assert.equal(ZoteroNotesPlugin.isDirectChildOfRoot("/Zotero", "/Zotero"), false);
    assert.equal(ZoteroNotesPlugin.isDirectChildOfRoot("/Other/Paper", "/Zotero"), false);
    assert.equal(ZoteroNotesPlugin.isDirectChildOfRoot("/ZoteroX/Paper", "/Zotero"), false);
    assert.equal(ZoteroNotesPlugin.isDirectChildOfRoot("", "/Zotero"), false);
    assert.equal(ZoteroNotesPlugin.isDirectChildOfRoot("/Zotero/Paper", ""), false);
});

test("collisionTitle appends itemKey once", () => {
    assert.equal(ZoteroNotesPlugin.collisionTitle("Paper", "ABCD1234"), "Paper [ABCD1234]");
    assert.equal(ZoteroNotesPlugin.collisionTitle("Paper [ABCD1234]", "ABCD1234"), "Paper [ABCD1234]");
});

test("stableHash is deterministic and distinguishes content", () => {
    assert.equal(ZoteroNotesPlugin.stableHash("hello"), ZoteroNotesPlugin.stableHash("hello"));
    assert.notEqual(ZoteroNotesPlugin.stableHash("hello"), ZoteroNotesPlugin.stableHash("hellp"));
});

test("migrateBindings moves only docs outside the new root", async () => {
    const calls = [];
    const plugin = makePlugin({
        settings: { notebook: "nb", rootName: "Zotero", autoImport: false, authorLimit: 0, librarySyncInterval: 0, noteSyncInterval: 0 },
        bindings: {
            "s:K1": { serverID: "s", itemKey: "K1", parentDocId: "doc1", noteDocId: "n1", noteKey: "" },
            "s:K2": { serverID: "s", itemKey: "K2", parentDocId: "doc2", noteDocId: "n2", noteKey: "" },
            "s:K3": { serverID: "s", itemKey: "K3", parentDocId: "", noteDocId: "", noteKey: "" }
        },
        request: async (url, data) => {
            calls.push({ url, data });
            if (url === "/api/filetree/getIDsByHPath") return [];
            if (url === "/api/filetree/getHPathByID") {
                if (data.id === "root") return "/Zotero";
                if (data.id === "doc1") return "/Old root/Paper One";
                if (data.id === "doc2") return "/Zotero/Paper Two";
            }
            if (url === "/api/filetree/createDocWithMd") return "root";
            return null;
        },
        saveData: async () => {}
    });
    await plugin.migrateBindings();
    const moves = calls.filter((call) => call.url === "/api/filetree/moveDocsByID");
    assert.equal(moves.length, 1);
    assert.deepEqual(moves[0].data, { fromIDs: ["doc1"], toID: "root" });
    const renames = calls.filter((call) => call.url === "/api/filetree/renameDocByID");
    assert.equal(renames.length, 0);
});

test("migrateBindings renames on title collision before moving", async () => {
    const calls = [];
    const plugin = makePlugin({
        settings: { notebook: "nb", rootName: "Zotero", autoImport: false, authorLimit: 0, librarySyncInterval: 0, noteSyncInterval: 0 },
        bindings: {
            "s:K1": { serverID: "s", itemKey: "K1", parentDocId: "doc1", noteDocId: "n1", noteKey: "" }
        },
        request: async (url, data) => {
            calls.push({ url, data });
            if (url === "/api/filetree/getIDsByHPath") return data.path === "/Zotero/Paper One" ? ["other-doc"] : [];
            if (url === "/api/filetree/getHPathByID") {
                if (data.id === "root") return "/Zotero";
                if (data.id === "doc1") return "/Old/Paper One";
            }
            if (url === "/api/filetree/createDocWithMd") return "root";
            return null;
        },
        saveData: async () => {}
    });
    await plugin.migrateBindings();
    const renames = calls.filter((call) => call.url === "/api/filetree/renameDocByID");
    assert.equal(renames.length, 1);
    assert.deepEqual(renames[0].data, { id: "doc1", title: "Paper One [K1]" });
    const moves = calls.filter((call) => call.url === "/api/filetree/moveDocsByID");
    assert.equal(moves.length, 1);
});

test("migrateBindings skips missing parent documents", async () => {
    const calls = [];
    const plugin = makePlugin({
        settings: { notebook: "nb", rootName: "Zotero", autoImport: false, authorLimit: 0, librarySyncInterval: 0, noteSyncInterval: 0 },
        bindings: {
            "s:K1": { serverID: "s", itemKey: "K1", parentDocId: "gone", noteDocId: "n1", noteKey: "" }
        },
        request: async (url, data) => {
            calls.push({ url, data });
            if (url === "/api/filetree/getIDsByHPath") return [];
            if (url === "/api/filetree/getHPathByID") {
                if (data.id === "root") return "/Zotero";
                throw new Error("doc not found");
            }
            if (url === "/api/filetree/createDocWithMd") return "root";
            return null;
        },
        saveData: async () => {}
    });
    await plugin.migrateBindings();
    const moves = calls.filter((call) => call.url === "/api/filetree/moveDocsByID");
    assert.equal(moves.length, 0);
});

test("migrateBindings does nothing without a notebook", async () => {
    const calls = [];
    const plugin = makePlugin({
        settings: { notebook: "", rootName: "Zotero", autoImport: false, authorLimit: 0, librarySyncInterval: 0, noteSyncInterval: 0 },
        request: async (url, data) => {
            calls.push({ url, data });
            return null;
        }
    });
    await plugin.migrateBindings();
    assert.equal(calls.length, 0);
});

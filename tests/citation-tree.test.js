const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

test("refreshCitationTree renumbers deterministically and aggregates Reference", async () => {
    const plugin = makePlugin();
    const attrs = {
        root: { "custom-zotero-cites": JSON.stringify([{ key: "B", form: "numeric" }]), "custom-zotero-style": "ieee" },
        child: { "custom-zotero-cites": JSON.stringify([{ key: "A", form: "numeric" }]), "custom-zotero-style": "ieee" }
    };
    const writes = [];
    plugin.request = async (url, data) => {
        if (url === "/api/filetree/getPathByID") return { notebook: "notebook", path: "/root.sy" };
        if (url === "/api/filetree/getHPathByID") return "/Book";
        if (url === "/api/query/sql") return [{ id: "child", hpath: "/Book/Chapter" }];
        if (url === "/api/attr/getBlockAttrs") return attrs[data.id] || {};
        if (url === "/api/filetree/getIDsByHPath") return [];
        if (url === "/api/filetree/createDocWithMd") return "reference";
        if (url === "/api/attr/setBlockAttrs") writes.push(data);
        return null;
    };
    plugin.refreshBibliography = async () => {};
    await plugin.refreshCitationTree("root");
    const rootWrite = writes.find((write) => write.id === "root");
    assert.equal(JSON.parse(rootWrite.attrs["custom-zotero-cites"])[0].number, 1);
    const childWrite = writes.find((write) => write.id === "child");
    assert.equal(JSON.parse(childWrite.attrs["custom-zotero-cites"])[0].number, 2);
    assert.equal(writes.at(-1).id, "reference");
});

test("syncConnectedCollection only assigns memberships and preserves others", async () => {
    const plugin = makePlugin();
    plugin.request = async (url) => {
        if (url === "/api/filetree/getHPathByID") return "/Book";
        return { title: "Book" };
    };
    plugin.library.items = ["A", "B"].map((key) => remoteItem(key));
    plugin.refreshLibrary = async () => {};
    plugin.refreshCitationTree = async () => ["A", "B"];
    plugin.ensureResearchCollection = async (name) => {
        assert.equal(name, "【【Connected Documents】】→ root");
        return "collection1";
    };
    const assigned = [];
    plugin.assignResearchCollection = async (item, key) => { assigned.push({ item, key }); return true; };
    await plugin.syncConnectedCollection("root");
    assert.deepEqual(assigned.map((entry) => entry.item.key), ["A", "B"]);
    assert.ok(assigned.every((entry) => entry.key === "collection1"));
});

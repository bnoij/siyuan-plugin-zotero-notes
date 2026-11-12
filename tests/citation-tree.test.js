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


test("refreshCitationTree updates numeric link labels in place without rewriting unrelated blocks", async () => {
    const plugin = makePlugin();
    const updates = [];
    plugin.request = async (url, data) => {
        if (url === "/api/filetree/getPathByID") return { notebook: "notebook", path: "/root.sy" };
        if (url === "/api/filetree/getHPathByID") return "/Book";
        if (url === "/api/query/sql") {
            if (data.stmt.includes("zotero://select/library/items/")) return [{ id: "citation-block", markdown: "See [9](zotero://select/library/items/A?f=csl&zkeys=A) and [8](zotero://select/library/items/B?f=csl&zkeys=B)." }];
            return [];
        }
        if (url === "/api/attr/getBlockAttrs") return { "custom-zotero-cites": JSON.stringify([{ key: "A", form: "numeric" }, { key: "B", form: "numeric" }]) };
        if (url === "/api/filetree/getIDsByHPath") return ["reference"];
        if (url === "/api/block/updateBlock") { updates.push(data); return null; }
        return null;
    };
    plugin.refreshBibliography = async () => {};
    await plugin.refreshCitationTree("root");
    assert.equal(updates.length, 1);
    assert.equal(updates[0].id, "citation-block");
    assert.match(updates[0].data, /\[1\]\(zotero:\/\/select\/library\/items\/A/);
    assert.match(updates[0].data, /\[2\]\(zotero:\/\/select\/library\/items\/B/);
    assert.doesNotMatch(updates[0].data, /\[9\]|\[8\]/);
});


test("refreshCitationTree reuses one global number for the same item across documents", async () => {
    const plugin = makePlugin();
    const attrs = {
        root: { "custom-zotero-cites": JSON.stringify([{ key: "A", form: "numeric" }]) },
        child: { "custom-zotero-cites": JSON.stringify([{ key: "A", form: "numeric" }]) }
    };
    const writes = [];
    plugin.request = async (url, data) => {
        if (url === "/api/filetree/getPathByID") return { notebook: "notebook", path: "/root.sy" };
        if (url === "/api/filetree/getHPathByID") return "/Book";
        if (url === "/api/query/sql") return data.stmt.includes("type = 'd'") ? [{ id: "child", hpath: "/Book/Chapter" }] : [];
        if (url === "/api/attr/getBlockAttrs") return attrs[data.id] || {};
        if (url === "/api/filetree/getIDsByHPath") return ["reference"];
        if (url === "/api/attr/setBlockAttrs") writes.push(data);
        return null;
    };
    plugin.refreshBibliography = async () => {};
    await plugin.refreshCitationTree("root");
    for (const write of writes) {
        const entries = JSON.parse(write.attrs["custom-zotero-cites"]);
        assert.ok(entries.every((entry) => entry.number === 1));
    }
    const reference = writes.find((write) => write.id === "reference");
    assert.equal(JSON.parse(reference.attrs["custom-zotero-cites"]).length, 1);
});

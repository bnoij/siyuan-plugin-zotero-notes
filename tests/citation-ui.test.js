const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

test("saveCitationRegistry merges the latest document registry across windows", async () => {
    const plugin = makePlugin();
    let saved;
    plugin.request = async (url, data) => {
        if (url === "/api/attr/getBlockAttrs") {
            return { "custom-zotero-cites": JSON.stringify([{ key: "OTHER", form: "numeric", locator: "" }]) };
        }
        if (url === "/api/attr/setBlockAttrs") saved = data.attrs;
        return null;
    };
    await plugin.saveCitationRegistry("doc1", [{ key: "PAPER001", form: "numeric", locator: "" }], "ieee");
    assert.deepEqual(JSON.parse(saved["custom-zotero-cites"]).map((entry) => entry.key).sort(), ["OTHER", "PAPER001"]);
    assert.equal(saved["custom-zotero-style"], "ieee");
});

test("refreshBibliography updates only the marked bibliography block", async () => {
    const plugin = makePlugin();
    const calls = [];
    plugin.request = async (url, data) => {
        calls.push({ url, data });
        if (url === "/api/attr/getBlockAttrs") return { "custom-zotero-cites": JSON.stringify([{ key: "PAPER001", form: "numeric" }]), "custom-zotero-style": "ieee" };
        if (url === "/api/query/sql") return [{ block_id: "managed-bib" }];
        return null;
    };
    plugin.formatBibliography = async () => [{ key: "PAPER001", text: "[1] Paper.", missing: false }];
    await plugin.refreshBibliography("doc1");
    const update = calls.find((call) => call.url === "/api/block/updateBlock");
    assert.equal(update.data.id, "managed-bib");
    assert.match(update.data.data, /参考文献/);
    assert.equal(calls.some((call) => call.url === "/api/block/appendBlock"), false);
});

test("refreshBibliography appends a managed container only on first use", async () => {
    const plugin = makePlugin();
    const calls = [];
    plugin.request = async (url, data) => {
        calls.push({ url, data });
        if (url === "/api/attr/getBlockAttrs") return { "custom-zotero-cites": JSON.stringify([{ key: "PAPER001", form: "numeric" }]) };
        if (url === "/api/query/sql") return [];
        if (url === "/api/block/appendBlock") return [{ doOperations: [{ action: "insert", id: "new-bib" }] }];
        return null;
    };
    plugin.formatBibliography = async () => [{ key: "PAPER001", text: "Paper.", missing: false }];
    await plugin.refreshBibliography("doc1");
    const append = calls.find((call) => call.url === "/api/block/appendBlock");
    assert.equal(append.data.parentID, "doc1");
    assert.match(append.data.data, /^\{\{\{row/);
    const attrs = calls.find((call) => call.url === "/api/attr/setBlockAttrs");
    assert.equal(attrs.data.id, "new-bib");
    assert.equal(attrs.data.attrs["custom-zotero-bib"], "true");
});

test("refreshBibliography ignores documents without citations", async () => {
    const plugin = makePlugin();
    plugin.request = async () => ({});
    plugin.formatBibliography = async () => { throw new Error("Must not format an empty registry"); };
    await plugin.refreshBibliography("doc1");
});


test("citationMarkdown and citationText preserve stored global numbers", () => {
    const plugin = makePlugin();
    const registry = [{ key: "A", form: "numeric", number: 1 }, { key: "C", form: "numeric", number: 3 }];
    const markdown = plugin.citationMarkdown([remoteItem("C")], "numeric", registry);
    assert.match(markdown, /^\[3\]\(/);
    assert.equal(plugin.citationText(remoteItem("C"), "numeric", registry[1].number), "[3]");
});

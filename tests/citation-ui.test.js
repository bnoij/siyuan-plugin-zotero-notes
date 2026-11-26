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
    assert.match(markdown, /^\[\[3\]\]\(/);
    assert.equal(plugin.citationText(remoteItem("C"), "numeric", registry[1].number), "[3]");
});

test("citationLink exposes per-site forms and stable key lists", () => {
    const plugin = makePlugin();
    const href = "zotero://select/library/items/PAPER001?f=narrative&zkeys=PAPER001%2CPAPER002";
    assert.deepEqual(plugin.citationLinkKeys(href), ["PAPER001", "PAPER002"]);
    assert.equal(plugin.citationLinkForm(href), "narrative");
    assert.equal(plugin.citationLinkForm("zotero://select/library/items/PAPER001?f=csl"), "numeric");
    assert.deepEqual(plugin.citationLinkKeys("zotero://select/library/items/PAPER001?bib=1"), ["PAPER001"]);
});

test("citationLabel renders numeric and narrative forms", () => {
    const plugin = makePlugin();
    const item = remoteItem("PAPER001");
    item.data.creators = [
        { creatorType: "author", lastName: "Xu" },
        { creatorType: "author", lastName: "Tong" }
    ];
    plugin.library.items = [item];
    const numbers = new Map([["PAPER001", 3]]);
    assert.equal(plugin.citationLabel(["PAPER001"], "numeric", numbers), "[3]");
    assert.equal(plugin.citationLabel(["PAPER001"], "narrative", numbers), "Xu & Tong (2024)");
});

test("citationAuthorText switches to et al. beyond three authors", () => {
    const plugin = makePlugin();
    const item = remoteItem("PAPER001");
    item.data.creators = [
        { creatorType: "author", lastName: "Xu" },
        { creatorType: "author", lastName: "Tong" },
        { creatorType: "author", lastName: "Li" },
        { creatorType: "author", lastName: "Wang" }
    ];
    assert.equal(plugin.citationAuthorText(item), "Xu et al.");
    assert.equal(plugin.citationText(item, "author-date"), "(Xu et al., 2024)");
});

test("refreshDocumentCitations renumbers links and keeps the registry", async () => {
    const plugin = makePlugin();
    plugin.library.items = [remoteItem("PAPER001")];
    const calls = [];
    plugin.request = async (url, data) => {
        calls.push({ url, data });
        if (url === "/api/export/exportMdContent") return { content: "See [9](zotero://select/library/items/PAPER001?f=csl&zkeys=PAPER001)." };
        if (url === "/api/attr/getBlockAttrs") return { "custom-zotero-cites": JSON.stringify([{ key: "PAPER001", form: "numeric", locator: "" }]) };
        if (url === "/api/query/sql") return [{ id: "block1", markdown: "See [9](zotero://select/library/items/PAPER001?f=csl&zkeys=PAPER001)." }];
        return null;
    };
    plugin.refreshBibliography = async () => {};
    await plugin.refreshDocumentCitations("doc1");
    const update = calls.find((call) => call.url === "/api/block/updateBlock");
    assert.match(update.data.data, /\[\[1\]\]\(zotero:\/\/select\/library\/items\/PAPER001/);
    const attrs = calls.find((call) => call.url === "/api/attr/setBlockAttrs");
    assert.equal(JSON.parse(attrs.data.attrs["custom-zotero-cites"])[0].key, "PAPER001");
});

test("undoLastCitation restores the previous block content", async () => {
    const plugin = makePlugin();
    const updates = [];
    plugin.request = async (url, data) => {
        if (url === "/api/block/updateBlock") updates.push(data);
        return null;
    };
    plugin.citationUndo = new Map([["doc1", [{ ts: 1, label: "修改引用", blocks: [{ id: "block1", kramdown: "原文" }] }]]]);
    await plugin.undoLastCitation();
    assert.equal(updates.length, 1);
    assert.equal(updates[0].data, "原文");
    assert.equal(plugin.citationUndo.get("doc1").length, 0);
});

test("refreshBibliography restores missing entries from the stored snapshot", async () => {
    const plugin = makePlugin();
    const calls = [];
    plugin.request = async (url, data) => {
        calls.push({ url, data });
        if (url === "/api/attr/getBlockAttrs") return {
            "custom-zotero-cites": JSON.stringify([{ key: "PAPER001", form: "numeric" }]),
            "custom-zotero-bibsnap": JSON.stringify({ PAPER001: { text: "Xu (2024). Paper." } })
        };
        if (url === "/api/query/sql") return [{ block_id: "managed-bib" }];
        return null;
    };
    plugin.formatBibliography = async () => [{ key: "PAPER001", text: "[Missing Zotero item: PAPER001]", missing: true }];
    await plugin.refreshBibliography("doc1");
    const update = calls.find((call) => call.url === "/api/block/updateBlock");
    assert.match(update.data.data, /Xu \(2024\)\. Paper\./);
    assert.match(update.data.data, /该条目已不在 Zotero 文库中/);
    assert.match(update.data.data, /↗/);
});

test("citeKeyFor uses the Zotero citation key and falls back to the item key", () => {
    const plugin = makePlugin();
    plugin.settings = { ...plugin.settings, citeKeyFormat: "" };
    assert.equal(plugin.citeKeyFor(remoteItem("PAPER001")), "PAPER001");
    plugin.settings = { ...plugin.settings, citeKeyFormat: "{author}{year}{title}" };
    const item = remoteItem("PAPER001");
    item.data.creators = [{ creatorType: "author", lastName: "Xu" }];
    assert.equal(plugin.citeKeyFor(item), "xu2024paper");
    const keyed = remoteItem("PAPER002");
    keyed.data.citationKey = "zotero-key";
    assert.equal(plugin.citeKeyFor(keyed), "zotero-key");
});

test("mergeIntoZoteroItem only fills empty fields", async () => {
    const plugin = makePlugin();
    const patches = [];
    plugin.zoteroRequest = async (path, options) => {
        patches.push({ path, options });
        return {};
    };
    const item = remoteItem("PAPER001");
    item.data.title = "Existing";
    const updated = await plugin.mergeIntoZoteroItem(item, { data: { title: "New", abstractNote: "摘要", DOI: "10.1/x" } });
    assert.equal(updated, true);
    assert.equal(patches[0].path, "/users/0/items/PAPER001");
    assert.equal(patches[0].options.method, "PATCH");
    assert.equal(patches[0].options.body.title, undefined);
    assert.equal(patches[0].options.body.abstractNote, "摘要");
});

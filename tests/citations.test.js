const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

function citedItem() {
    const item = remoteItem("PAPER001");
    item.data.creators = [
        { creatorType: "author", firstName: "Huatao", lastName: "Xu" },
        { creatorType: "author", firstName: "Panrong", lastName: "Tong" }
    ];
    return item;
}

test("citationText supports numeric, author-date, narrative, and locators", () => {
    const plugin = makePlugin();
    assert.equal(plugin.citationText(citedItem(), "numeric", 3), "[3]");
    assert.equal(plugin.citationText(citedItem(), "author-date"), "(Xu & Tong, 2024)");
    assert.equal(plugin.citationText(citedItem(), "narrative", undefined, "p. 7"), "Xu & Tong (2024, p. 7)");
});

test("citationLink keeps stable item keys and multiple-item selection", () => {
    const plugin = makePlugin();
    const link = plugin.citationLink(["PAPER001", "PAPER002"], "[1,2]");
    assert.equal(link, "[[1,2]](zotero://select/library/items/PAPER001?f=csl&zkeys=PAPER001%2CPAPER002)");
});

test("mergeCitationEntries preserves order and updates locators without duplicates", () => {
    const plugin = makePlugin();
    const existing = [{ key: "PAPER001", form: "numeric", locator: "" }];
    const result = plugin.mergeCitationEntries(existing, [
        { key: "PAPER002", form: "numeric", locator: "" },
        { key: "PAPER001", form: "numeric", locator: "p. 5" }
    ]);
    assert.deepEqual(result.map((entry) => entry.key), ["PAPER001", "PAPER002"]);
    assert.equal(result[0].locator, "p. 5");
});

test("bibliographyEntries extracts complete CSL entries and decodes entities", () => {
    const plugin = makePlugin();
    const html = `<div class="csl-bib-body"><div class="csl-entry"><div class="csl-left-margin">[1]</div><div class="csl-right-inline">H. Xu &amp; P. Tong, <i>Paper</i>.</div></div><span class="Z3988">metadata</span></div>`;
    assert.deepEqual(plugin.bibliographyEntries(html), ["[1] H. Xu & P. Tong, Paper."]);
});

test("formatBibliography uses Local API and keeps missing-item warnings readable", async () => {
    const plugin = makePlugin();
    plugin.zoteroRequest = async (path) => {
        if (path.includes("format=bib")) return { data: `<div class="csl-entry">Xu (2024). Paper.</div>` };
        return { data: [{ key: "PAPER001" }] };
    };
    const result = await plugin.formatBibliography(["PAPER001", "MISSING1"], "apa");
    assert.equal(result[0].text, "Xu (2024). Paper.");
    assert.match(result[1].text, /MISSING1/);
    assert.equal(result[1].missing, true);
});

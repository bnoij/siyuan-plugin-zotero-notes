const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

function exportItem() {
    const item = remoteItem("PAPER001");
    item.data.creators = [
        { creatorType: "author", firstName: "Huatao", lastName: "Xu" },
        { creatorType: "author", firstName: "Panrong", lastName: "Tong" }
    ];
    item.data.publicationTitle = "Journal";
    item.data.DOI = "10.1000/test";
    return item;
}

test("exportCitations creates BibTeX and BibLaTeX with stable keys", async () => {
    const plugin = makePlugin();
    const bibtex = await plugin.exportCitations([exportItem()], "bibtex");
    assert.match(bibtex, /@article\{PAPER001,/);
    assert.match(bibtex, /author = \{Xu, Huatao and Tong, Panrong\}/);
    assert.match(bibtex, /doi = \{10.1000\/test\}/);
    const biblatex = await plugin.exportCitations([exportItem()], "biblatex");
    assert.match(biblatex, /@article\{PAPER001,/);
});

test("exportCitations creates Typst and LaTeX citations", async () => {
    const plugin = makePlugin();
    assert.equal(await plugin.exportCitations([exportItem()], "typst"), "#cite(<PAPER001>)");
    assert.equal(await plugin.exportCitations([exportItem()], "latex"), "\\cite{PAPER001}");
});

test("exportCitations uses CSL bibliography styles for GB/T, APA, and IEEE", async () => {
    const plugin = makePlugin();
    const styles = [];
    plugin.formatBibliography = async (keys, style) => {
        styles.push(style);
        return [{ key: keys[0], text: `Formatted ${style}`, missing: false }];
    };
    assert.equal(await plugin.exportCitations([exportItem()], "apa"), "Formatted apa");
    assert.equal(await plugin.exportCitations([exportItem()], "ieee"), "Formatted ieee");
    assert.equal(await plugin.exportCitations([exportItem()], "gbt"), "Formatted china-national-standard-gb-t-7714-2015-numeric");
});

test("exportDocument downloads Markdown with a safe document filename", async () => {
    const plugin = makePlugin();
    plugin.getExportEditor = () => ({ protyle: { block: { rootID: "doc1" } } });
    plugin.request = async () => ({ hPath: "/Paper: Test", content: "# Paper" });
    let downloaded;
    plugin.downloadBlob = async (filename, blob) => { downloaded = { filename, blob }; };
    await plugin.exportDocument("markdown");
    assert.equal(downloaded.filename, "Paper - Test.md");
    assert.equal(downloaded.blob.type, "text/markdown;charset=utf-8");
});

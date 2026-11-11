const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

test("normalizeCSLItem maps authors, dates, journal, DOI, and arXiv identity", () => {
    const plugin = makePlugin();
    const paper = plugin.normalizeCSLItem({
        id: "paper1",
        type: "article-journal",
        title: "Paper",
        author: [{ family: "Xu", given: "Huatao" }],
        issued: { "date-parts": [[2024, 12, 23]] },
        "container-title": "Journal",
        DOI: "10.1000/test",
        URL: "https://arxiv.org/abs/2412.15714",
        keyword: "one,two",
        abstract: "Abstract"
    });
    assert.equal(paper.itemType, "journalArticle");
    assert.equal(paper.date, "2024-12-23");
    assert.equal(paper.creators[0].family, "Xu");
    assert.equal(paper.doi, "10.1000/test");
    assert.equal(paper.arxiv_id, "2412.15714");
    assert.equal(paper.abstract, "Abstract");
});

test("parseBibTeX handles multiple entries, nested braces, and escaped characters", () => {
    const plugin = makePlugin();
    const entries = plugin.parseBibTeX(`@article{xu2024,
  title={A {Nested} Paper \& Study},
  author={Xu, Huatao and Tong, Panrong},
  journal={Journal},
  year={2024},
  doi={10.1000/test}
}
@book{book1, title={Book}, author={Li, Mo}, year={2020}`);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].data.title, "A {Nested} Paper & Study");
    assert.equal(entries[0].data.creators.length, 2);
    assert.equal(entries[0].data.DOI, "10.1000/test");
    assert.equal(entries[1].data.itemType, "book");
});

test("importPapers skips duplicates only after an explicit decision", async () => {
    const plugin = makePlugin();
    const duplicate = remoteItem("PAPER001");
    duplicate.data.title = "Duplicate";
    duplicate.data.DOI = "10.1000/test";
    plugin.library.items = [duplicate];
    const imported = [];
    plugin.ensurePapers = async (papers) => { imported.push(...papers); return papers.map((paper) => ({ key: paper.key })); };
    const paper = { title: "Duplicate", doi: "10.1000/test", creators: [], tags: [] };
    const skipped = await plugin.importPapers([paper], { duplicateAction: "skip" });
    assert.equal(skipped.skipped, 1);
    assert.equal(imported.length, 0);
    const created = await plugin.importPapers([paper], { duplicateAction: "create" });
    assert.equal(created.imported, 1);
    assert.equal(imported.length, 1);
});

test("parseImportData rejects malformed content without losing valid entries", () => {
    const plugin = makePlugin();
    const result = plugin.parseImportData(`[{"type":"article-journal","title":"Paper","author":[]}]`);
    assert.equal(result.papers.length, 1);
    assert.throws(() => plugin.parseImportData("not-a-bibliography"), /无法识别/);
});

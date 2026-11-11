const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

test("researchItemData preserves normalized CSL creators and item type", () => {
    const plugin = makePlugin();
    const data = plugin.researchItemData({
        itemType: "journalArticle",
        title: "Paper",
        creators: [{ family: "Xu", given: "Huatao", creatorType: "author" }],
        publicationTitle: "Journal",
        tags: []
    });
    assert.equal(data.itemType, "journalArticle");
    assert.equal(data.creators.length, 1);
    assert.equal(data.creators[0].lastName, "Xu");
    assert.equal(data.creators[0].firstName, "Huatao");
    assert.equal(data.publicationTitle, "Journal");
});

test("safe templates support if nested inside range and range nested inside if", () => {
    const plugin = makePlugin();
    const item = remoteItem();
    item.data.creators = [{ creatorType: "author", firstName: "A", lastName: "B" }];
    item.data.tags = [{ tag: "one" }, { tag: "two" }];
    const output = plugin.renderSafeTemplate("{{if authors}}A{{range tags}}B{{.}}{{end}}C{{end}}D", item, "note1");
    assert.equal(output, "ABoneBtwoCD");
    const nested = plugin.renderSafeTemplate("{{range tags}}{{if DOI}}X{{else}}Y{{end}}{{end}}", item, "note1");
    assert.equal(nested, "YY");
});

test("PDF FlateDecode extraction uses original compressed bytes", async () => {
    const plugin = makePlugin();
    const compressed = zlib.deflateSync(Buffer.from("BT (AutoLife compressed title) Tj ET"));
    const bytes = Buffer.concat([Buffer.from("<< /Filter /FlateDecode >>\nstream\n"), compressed, Buffer.from("\nendstream")]);
    const result = await plugin.extractPDFMetadata(bytes, "fallback.pdf");
    assert.equal(result.title, "AutoLife compressed title");
    assert.equal(result.confidence, 0.55);
});

test("importPapers excludes errors from imported count and can force duplicate creation", async () => {
    const plugin = makePlugin();
    const duplicate = remoteItem("PAPER001");
    duplicate.data.title = "Duplicate";
    duplicate.data.DOI = "10.1000/test";
    plugin.library.items = [duplicate];
    let options;
    plugin.ensurePapers = async (papers, settings) => {
        options = settings;
        return [{ itemStatus: "error" }, { itemStatus: "created" }];
    };
    const result = await plugin.importPapers([{ title: "Duplicate", doi: "10.1000/test", creators: [], tags: [] }], { duplicateAction: "create" });
    assert.equal(result.imported, 1);
    assert.equal(result.errors.length, 1);
    assert.equal(options.forceCreate, true);
});

test("PubMed authors keep family name before initials", async () => {
    const plugin = makePlugin();
    plugin.externalJSON = async () => ({
        result: { "12345": { title: "Paper", authors: [{ name: "Smith J" }], pubdate: "2024", fulljournalname: "Journal" } }
    });
    const result = await plugin.lookupIdentifier("12345");
    assert.equal(result.creators[0].family, "Smith");
    assert.equal(result.creators[0].given, "J");
});

test("PDF XMP abstract strips tags and decodes entities", async () => {
    const plugin = makePlugin();
    const xml = `<x:xmpmeta xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:description><rdf:Alt><rdf:li>A &amp; B</rdf:li></rdf:Alt></dc:description>`;
    const result = await plugin.extractPDFMetadata(new TextEncoder().encode(xml), "fallback.pdf");
    assert.equal(result.abstract, "A & B");
});

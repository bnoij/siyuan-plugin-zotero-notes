const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin } = require("./helpers/load-plugin.js");

test("normalizeIdentifier classifies DOI, arXiv, ISBN, PMID, PMCID, and URLs", () => {
    const plugin = makePlugin();
    assert.deepEqual(plugin.normalizeIdentifier("10.1000/test"), { kind: "doi", value: "10.1000/test" });
    assert.deepEqual(plugin.normalizeIdentifier("arXiv:2412.15714"), { kind: "arxiv", value: "2412.15714" });
    assert.deepEqual(plugin.normalizeIdentifier("9787115415790"), { kind: "isbn", value: "9787115415790" });
    assert.deepEqual(plugin.normalizeIdentifier("PMID:12345"), { kind: "pmid", value: "12345" });
    assert.deepEqual(plugin.normalizeIdentifier("PMC12345"), { kind: "pmcid", value: "PMC12345" });
    assert.deepEqual(plugin.normalizeIdentifier("https://arxiv.org/abs/2412.15714"), { kind: "url", value: "https://arxiv.org/abs/2412.15714" });
});

test("lookupIdentifier normalizes a Crossref DOI result", async () => {
    const plugin = makePlugin();
    plugin.externalJSON = async () => ({
        message: {
            type: "journal-article",
            title: ["Paper"],
            author: [{ family: "Xu", given: "Huatao" }],
            issued: { "date-parts": [[2024]] },
            "container-title": ["Journal"],
            DOI: "10.1000/test",
            URL: "https://doi.org/10.1000/test"
        }
    });
    const result = await plugin.lookupIdentifier("10.1000/test");
    assert.equal(result.title, "Paper");
    assert.equal(result.creators[0].family, "Xu");
    assert.equal(result.doi, "10.1000/test");
});

test("lookupIdentifier falls back to arXiv when Crossref has no DOI record", async () => {
    const plugin = makePlugin();
    plugin.externalJSON = async () => { throw new Error("404"); };
    plugin.externalText = async () => `<feed><title>arXiv Query</title><entry><title>AutoLife</title><summary>Abstract</summary><published>2024-12-23T00:00:00Z</published><author><name>Huatao Xu</name></author><id>http://arxiv.org/abs/2412.15714</id></entry></feed>`;
    const result = await plugin.lookupIdentifier("10.48550/arXiv.2412.15714");
    assert.equal(result.title, "AutoLife");
    assert.equal(result.arxiv_id, "2412.15714");
});

test("lookupIdentifier parses arXiv Atom without an XML dependency", async () => {
    const plugin = makePlugin();
    plugin.externalText = async () => `<feed><title>arXiv Query</title><entry><title>AutoLife</title><summary>Abstract</summary><published>2024-12-23T00:00:00Z</published><author><name>Huatao Xu</name></author><id>http://arxiv.org/abs/2412.15714</id></entry></feed>`;
    const result = await plugin.lookupIdentifier("arXiv:2412.15714");
    assert.equal(result.title, "AutoLife");
    assert.equal(result.arxiv_id, "2412.15714");
    assert.equal(result.creators[0].family, "Xu");
});

test("extractPDFMetadata reads XMP title and creator", async () => {
    const plugin = makePlugin();
    const xml = `<?xpacket begin=""?><x:xmpmeta xmlns:x="adobe:ns:meta/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><rdf:RDF><rdf:Description><dc:title><rdf:Alt><rdf:li xml:lang="x-default">AutoLife</rdf:li></rdf:Alt></dc:title><dc:creator><rdf:Seq><rdf:li>Huatao Xu</rdf:li></rdf:Seq></dc:creator><dc:description>Abstract</dc:description></rdf:Description></rdf:RDF></x:xmpmeta>`;
    const bytes = new TextEncoder().encode(xml);
    const result = await plugin.extractPDFMetadata(bytes, "paper.pdf");
    assert.equal(result.title, "AutoLife");
    assert.equal(result.creators[0].family, "Xu");
    assert.equal(result.confidence, 0.85);
});

test("extractPDFMetadata extracts uncompressed text and falls back to filename", async () => {
    const plugin = makePlugin();
    const bytes = new TextEncoder().encode("BT /F1 24 Tf (AutoLife: Automatic Life Journaling) Tj ET");
    const result = await plugin.extractPDFMetadata(bytes, "fallback_name.pdf");
    assert.equal(result.title, "AutoLife: Automatic Life Journaling");
    const fallback = await plugin.extractPDFMetadata(new TextEncoder().encode("not a pdf"), "fallback_name.pdf");
    assert.equal(fallback.title, "fallback name");
    assert.equal(fallback.confidence, 0.25);
    assert.ok(fallback.warnings.length > 0);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

function templateItem() {
    const item = remoteItem("PAPER001");
    item.data.title = "A *Paper*: {{constructor}}";
    item.data.creators = [{ creatorType: "author", firstName: "Huatao", lastName: "Xu" }];
    item.data.DOI = "10.1000/test";
    item.data.publicationTitle = "Journal";
    item.data.abstractNote = "Abstract";
    item.data.tags = [{ tag: "one" }, { tag: "two" }];
    return item;
}

test("renderSafeTemplate renders whitelisted metadata and Note links literally", () => {
    const plugin = makePlugin();
    const output = plugin.renderSafeTemplate("# {{title}}\n\n- 作者：{{authors}}\n- 年份：{{year}}\n- DOI：{{DOI}}\n- 期刊：{{journal}}\n\n{{noteLink}}\n\n{{abstract}}\n\n{{itemKey}}", templateItem(), "note1");
    assert.match(output, /A \\\*Paper\\\*: \{\{constructor\}\}/);
    assert.match(output, /Huatao Xu/);
    assert.match(output, /2024/);
    assert.match(output, /10.1000\/test/);
    assert.match(output, /\[Note\]\(siyuan:\/\/blocks\/note1\)/);
    assert.match(output, /PAPER001/);
});

test("renderSafeTemplate supports conditionals and ranges without JS evaluation", () => {
    const plugin = makePlugin();
    const output = plugin.renderSafeTemplate("{{if DOI}}DOI {{DOI}}{{else}}No DOI{{end}}\n{{range tags}}- {{.}}\n{{end}}{{constructor}}{{title.constructor}}", templateItem(), "note1");
    assert.equal(output, "DOI 10.1000/test\n- one\n- two\n");
});

test("renderSafeTemplate handles empty fields and missing metadata", () => {
    const plugin = makePlugin();
    const item = remoteItem();
    item.data.creators = [];
    item.data.DOI = "";
    const output = plugin.renderSafeTemplate("{{if DOI}}yes{{else}}No DOI{{end}}|{{authors}}|{{range tags}}{{.}}{{end}}", item, "note1");
    assert.equal(output, "No DOI||");
});

test("initialNoteMarkdown applies the template only for a new Note", () => {
    const plugin = makePlugin();
    plugin.settings.noteTemplate = "# {{title}}\n\n{{noteLink}}";
    const output = plugin.initialNoteMarkdown(templateItem(), "note1");
    assert.match(output, /^# A \\\*Paper/);
    assert.match(output, /siyuan:\/\/blocks\/note1/);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

test("annotationMarkdown includes highlight, comment, page, and Zotero deep link", () => {
    const plugin = makePlugin();
    const markdown = plugin.annotationMarkdown([{
        key: "ANNO1",
        attachmentKey: "PDF1",
        data: {
            annotationText: "Highlighted text",
            annotationComment: "My comment",
            pageLabel: "7"
        }
    }]);
    assert.match(markdown, /Highlighted text/);
    assert.match(markdown, /My comment/);
    assert.match(markdown, /7/);
    assert.match(markdown, /zotero:\/\/open-pdf\/library\/items\/PDF1\?page=7&annotation=ANNO1/);
});

test("fetchAnnotations reads PDF attachment children through Local API", async () => {
    const plugin = makePlugin();
    const item = remoteItem("PAPER1");
    item.attachments = [{ key: "PDF1", data: { itemType: "attachment", contentType: "application/pdf" } }];
    plugin.zoteroRequest = async (path) => ({
        data: [{ key: "ANNO1", data: { itemType: "annotation", annotationText: "Text" } }]
    });
    const annotations = await plugin.fetchAnnotations(item);
    assert.equal(annotations.length, 1);
    assert.equal(annotations[0].attachmentKey, "PDF1");
});

test("importAnnotations refreshes only the marked Note section", async () => {
    const plugin = makePlugin();
    const item = remoteItem("PAPER1");
    plugin.bindings[plugin.bindingKey(item.key)] = { noteDocId: "note1" };
    plugin.fetchAnnotations = async () => [{ key: "ANNO1", attachmentKey: "PDF1", data: { annotationText: "Text", pageLabel: "1" } }];
    const calls = [];
    plugin.request = async (url, data) => {
        calls.push({ url, data });
        if (url === "/api/query/sql") return [{ block_id: "annotation-section" }];
        return null;
    };
    await plugin.importAnnotations(item);
    const update = calls.find((call) => call.url === "/api/block/updateBlock");
    assert.equal(update.data.id, "annotation-section");
    assert.match(update.data.data, /PDF 标注/);
    assert.equal(calls.some((call) => call.url === "/api/block/appendBlock"), false);
});

test("importAnnotations without annotations does not write Note", async () => {
    const plugin = makePlugin();
    const item = remoteItem("PAPER1");
    plugin.bindings[plugin.bindingKey(item.key)] = { noteDocId: "note1" };
    plugin.fetchAnnotations = async () => [];
    plugin.request = async () => { throw new Error("Unexpected document write"); };
    await plugin.importAnnotations(item);
});

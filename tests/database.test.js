const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

function paper() {
    const item = remoteItem("PAPER001");
    item.data.creators = [{ creatorType: "author", firstName: "Huatao", lastName: "Xu" }];
    item.data.publicationTitle = "Journal";
    item.data.DOI = "10.1000/test";
    item.data.tags = [{ tag: "one" }, { tag: "two" }];
    item.data.url = "https://example.org";
    return item;
}

test("databaseCellValue maps text, multi-select tags, and URLs", () => {
    const plugin = makePlugin();
    assert.deepEqual(plugin.databaseCellValue("title", paper()), { type: "text", text: { content: "Paper" } });
    assert.deepEqual(plugin.databaseCellValue("tags", paper()).mSelect.map((value) => value.content), ["one", "two"]);
    assert.equal(plugin.databaseCellValue("url", paper()).url.content, "https://example.org");
});

test("syncPaperDatabase reuses a bound row without creating a duplicate", async () => {
    const plugin = makePlugin();
    const calls = [];
    plugin.request = async (url, data) => {
        calls.push({ url, data });
        if (url === "/api/filetree/getIDsByHPath") return ["library-doc"];
        if (url === "/api/attr/getBlockAttrs") return { "custom-zotero-library-data": JSON.stringify({ avID: "av1", avBlockId: "block1", fieldKeyIds: {} }) };
        if (url === "/api/av/getAttributeViewItemIDsByBoundIDs") return { PAPER001: "row1" };
        return null;
    };
    await plugin.syncPaperDatabase(paper());
    assert.equal(calls.some((call) => call.url === "/api/av/addAttributeViewBlocks"), false);
    assert.equal(calls.some((call) => call.url === "/api/av/setAttributeViewBlockAttr"), true);
});

test("syncPaperDatabase adds a missing row before writing mapped cells", async () => {
    const plugin = makePlugin();
    const calls = [];
    plugin.request = async (url, data) => {
        calls.push({ url, data });
        if (url === "/api/filetree/getIDsByHPath") return ["library-doc"];
        if (url === "/api/attr/getBlockAttrs") return { "custom-zotero-library-data": JSON.stringify({ avID: "av1", avBlockId: "block1", fieldKeyIds: {} }) };
        if (url === "/api/av/getAttributeViewItemIDsByBoundIDs") return calls.filter((call) => call.url === "/api/av/addAttributeViewBlocks").length ? { PAPER001: "row1" } : {};
        return null;
    };
    await plugin.syncPaperDatabase(paper());
    const add = calls.find((call) => call.url === "/api/av/addAttributeViewBlocks");
    assert.equal(add.data.srcs[0].id, "PAPER001");
    assert.equal(calls.some((call) => call.url === "/api/av/setAttributeViewBlockAttr"), true);
});

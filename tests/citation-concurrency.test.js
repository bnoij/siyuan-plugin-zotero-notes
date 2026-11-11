const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem, setActiveEditor } = require("./helpers/load-plugin.js");

function installLockRecorder(names) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: { locks: { request: async (name, options, callback) => { names.push(name); return callback(); } } }
    });
    return () => {
        if (previous) Object.defineProperty(globalThis, "navigator", previous);
        else delete globalThis.navigator;
    };
}

test("formatBibliography uses one batch request and preserves continuous numbering", async () => {
    const plugin = makePlugin();
    const paths = [];
    plugin.zoteroRequest = async (path) => {
        paths.push(path);
        if (!path.includes("format=bib")) return { data: [{ key: "PAPER001" }, { key: "PAPER002" }] };
        return { data: `<div class="csl-entry">[1] First.</div><div class="csl-entry">[2] Second.</div>` };
    };
    const result = await plugin.formatBibliography(["PAPER001", "PAPER002"], "ieee");
    assert.deepEqual(result.map((entry) => entry.text), ["[1] First.", "[2] Second."]);
    assert.equal(paths.filter((path) => path.includes("format=bib")).length, 1);
    assert.match(paths.at(-1), /itemKey=PAPER001%2CPAPER002/);
});

test("insertCitations holds the document lock and saves registry before editor insertion", async () => {
    const names = [];
    const restore = installLockRecorder(names);
    const events = [];
    const plugin = makePlugin();
    const item = remoteItem("PAPER001");
    plugin.request = async (url) => {
        events.push(url);
        if (url === "/api/attr/getBlockAttrs") return {};
        return null;
    };
    plugin.refreshBibliography = async () => {};
    setActiveEditor({ protyle: { block: { rootID: "doc1" }, insert: () => events.push("editor-insert") } });
    try {
        await plugin.insertCitations([item]);
    } finally {
        restore();
        setActiveEditor(null);
    }
    assert.equal(names[0], "siyuan-plugin-zotero-notes:document:doc1");
    assert.ok(events.indexOf("/api/attr/setBlockAttrs") < events.indexOf("editor-insert"));
});

test("importAnnotations uses a note-scoped lock", async () => {
    const names = [];
    const restore = installLockRecorder(names);
    const plugin = makePlugin();
    const item = remoteItem("PAPER1");
    plugin.bindings[plugin.bindingKey(item.key)] = { noteDocId: "note1" };
    plugin.fetchAnnotations = async () => [{ key: "ANNO1", attachmentKey: "PDF1", data: { annotationText: "Text", pageLabel: "1" } }];
    plugin.request = async (url) => url === "/api/query/sql" ? [{ block_id: "annotations" }] : null;
    try {
        await plugin.importAnnotations(item);
    } finally {
        restore();
    }
    assert.equal(names[0], "siyuan-plugin-zotero-notes:annotations:note1");
});

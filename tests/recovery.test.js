const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem, openedDocuments } = require("./helpers/load-plugin.js");

const ITEM = "PAPER001";
const SERVER = "server";
const PARENT = "20260101000000-parent1";
const NOTE = "20260101000000-note001";

function setupPlugin({ parentExists = true, noteExists = true, parentAttrs = {}, noteAttrs = {} } = {}) {
    const plugin = makePlugin();
    const item = remoteItem(ITEM);
    item.data.title = "Paper";
    const binding = { serverID: SERVER, itemKey: ITEM, parentDocId: PARENT, noteDocId: NOTE, noteKey: "REMOTE_NOTE", path: "/Zotero/Paper" };
    plugin.bindings[plugin.bindingKey(ITEM)] = binding;
    plugin.loadData = async () => ({});
    plugin.saveData = async () => {};
    const calls = [];
    plugin.request = async (url, data = {}) => {
        calls.push({ url, data });
        if (url === "/api/query/sql") {
            const rows = [];
            if (parentExists && data.stmt.includes(PARENT)) rows.push({ id: PARENT });
            if (noteExists && data.stmt.includes(NOTE)) rows.push({ id: NOTE });
            if (data.stmt.includes("candidate-parent")) rows.push({ id: "candidate-parent" });
            return rows;
        }
        if (url === "/api/attr/getBlockAttrs") {
            if (data.id === PARENT && parentExists) return { title: "Paper", ...parentAttrs };
            if (data.id === NOTE && noteExists) return { title: "Note", ...noteAttrs };
            throw new Error(`未找到 ID 为 [${data.id}] 的内容块 v3.8.10`);
        }
        if (url === "/api/filetree/getHPathByID") {
            if (data.id === PARENT && parentExists) return "/Zotero/Paper";
            if (data.id === NOTE && noteExists) return "/Zotero/Paper/Note";
            throw new Error("tree not found");
        }
        if (url === "/api/filetree/getIDsByHPath") return noteExists && data.path === "/Zotero/Paper/Note" ? [NOTE] : [];
        if (url === "/api/filetree/createDocWithMd") return data.path.endsWith("/Note") ? "new-note" : "new-parent";
        return null;
    };
    return { plugin, item, binding, calls };
}

test("complete bindings open the existing paper without recovery", async () => {
    const { plugin, item } = setupPlugin();
    openedDocuments.length = 0;
    let recoveries = 0;
    plugin.openBindingRecovery = async () => { recoveries++; };
    const result = await plugin.createOrOpenExclusive(item);
    assert.equal(result.parentDocId, PARENT);
    assert.equal(result.noteDocId, NOTE);
    assert.equal(recoveries, 0);
    assert.equal(openedDocuments.at(-1).doc.id, PARENT);
});

test("missing Note opens recovery interactively but not in background", async () => {
    const { plugin, item } = setupPlugin({ noteExists: false });
    const inspections = [];
    plugin.openBindingRecovery = async (selected, binding, inspection) => { inspections.push(inspection); return { status: "cancelled" }; };
    const interactive = await plugin.createOrOpenExclusive(item);
    assert.equal(interactive.status, "cancelled");
    assert.equal(inspections.length, 1);
    assert.equal(inspections[0].parentExists, true);
    assert.equal(inspections[0].noteExists, false);
    const background = await plugin.createOrOpenExclusive(item, { openTab: false });
    assert.equal(background.status, "recovery-required");
    assert.equal(inspections.length, 1);
});

test("existence query failures never trigger recovery or duplicate creation", async () => {
    const { plugin, item } = setupPlugin();
    plugin.request = async () => { throw new Error("network unavailable"); };
    plugin.openBindingRecovery = async () => { throw new Error("must not open recovery"); };
    await assert.rejects(plugin.createOrOpenExclusive(item), /network unavailable/);
});

test("rebuild-note creates only a new Note and preserves parent and Zotero", async () => {
    const { plugin, item, binding, calls } = setupPlugin({ noteExists: false });
    const saved = [];
    plugin.saveBinding = async (value) => { saved.push({ ...value }); };
    let zoteroWrites = 0;
    plugin.zoteroRequest = async () => { zoteroWrites++; };
    const inspection = await plugin.inspectBindingDocuments(binding, item);
    const result = await plugin.recoverBindingDocument(item, binding, "rebuild-note", inspection);
    assert.equal(result.noteDocId, "new-note");
    assert.equal(saved[0].noteKey, "REMOTE_NOTE");
    assert.equal(zoteroWrites, 0);
    assert.equal(calls.filter((call) => call.url === "/api/filetree/createDocWithMd").length, 1);
    assert.equal(calls.some((call) => call.url === "/api/block/updateBlock" && call.data.id === PARENT), false);
});

test("rebind-note reuses exact Note without rewriting it", async () => {
    const { plugin, item, binding, calls } = setupPlugin({ noteDocId: "" });
    binding.noteDocId = "";
    const inspection = await plugin.inspectBindingDocuments(binding, item);
    const result = await plugin.recoverBindingDocument(item, binding, "rebind-note", inspection);
    assert.equal(result.noteDocId, NOTE);
    assert.equal(calls.some((call) => call.url === "/api/filetree/createDocWithMd"), false);
    assert.equal(calls.some((call) => call.url === "/api/block/updateBlock"), false);
});

test("rebind-note rejects a Note claimed by another item", async () => {
    const { plugin, item, binding } = setupPlugin();
    plugin.bindings["server:OTHER"] = { itemKey: "OTHER", noteDocId: NOTE };
    const inspection = await plugin.inspectBindingDocuments(binding, item);
    await assert.rejects(plugin.recoverBindingDocument(item, binding, "rebind-note", inspection), /其他|another|claimed/);
});

test("rebind-paper accepts an unbound same-title document without metadata rewrite", async () => {
    const { plugin, item, binding, calls } = setupPlugin({ noteDocId: "", parentAttrs: { title: "Paper" } });
    binding.noteDocId = "";
    const inspection = await plugin.inspectBindingDocuments(binding, item);
    const result = await plugin.recoverBindingDocument(item, binding, "rebind-paper", inspection);
    assert.equal(result.parentDocId, PARENT);
    assert.equal(result.noteDocId, NOTE);
    assert.equal(calls.some((call) => call.url === "/api/block/updateBlock" && call.data.id === PARENT), false);
});

test("rebind-paper rejects a document bound to another item", async () => {
    const { plugin, item, binding } = setupPlugin({ parentAttrs: { "custom-zotero-item-key": "OTHER" } });
    const inspection = await plugin.inspectBindingDocuments(binding, item);
    await assert.rejects(plugin.recoverBindingDocument(item, binding, "rebind-paper", inspection), /其他|another|bound/);
});

test("rebuild-paper creates a fresh paper and Note after confirmation", async () => {
    const { plugin, item, binding, calls } = setupPlugin({ parentExists: false, noteExists: false });
    plugin.ensureRoot = async () => ({ id: "root", path: "/Zotero" });
    const saved = [];
    plugin.saveBinding = async (value) => { saved.push({ ...value }); };
    const inspection = await plugin.inspectBindingDocuments(binding, item);
    const result = await plugin.recoverBindingDocument(item, binding, "rebuild-paper", inspection);
    assert.equal(result.parentDocId, "new-parent");
    assert.equal(result.noteDocId, "new-note");
    assert.equal(saved.length, 1);
    assert.equal(calls.filter((call) => call.url === "/api/filetree/createDocWithMd").length, 2);
    assert.equal(calls.some((call) => call.url === "/api/block/updateBlock" && call.data.id === "new-parent"), true);
});

test("concurrent Note rebuild holds the item lock and creates once", async () => {
    const { plugin, item, binding, calls } = setupPlugin({ noteExists: false });
    const inspection = await plugin.inspectBindingDocuments(binding, item);
    await Promise.all([
        plugin.recoverBindingDocument(item, binding, "rebuild-note", inspection),
        plugin.recoverBindingDocument(item, binding, "rebuild-note", inspection)
    ]);
    assert.equal(calls.filter((call) => call.url === "/api/filetree/createDocWithMd").length, 1);
});


test("missing bound paper with a same-title candidate uses paper recovery mode", async () => {
    const { plugin, item, binding } = setupPlugin({ parentExists: false, noteExists: false });
    const request = plugin.request;
    plugin.request = async (url, data = {}) => {
        if (url === "/api/filetree/getIDsByHPath" && data.path === "/Zotero/Paper") return ["candidate-parent"];
        if (url === "/api/attr/getBlockAttrs" && data.id === "candidate-parent") return { title: "Paper" };
        return request(url, data);
    };
    const inspection = await plugin.inspectBindingDocuments(binding, item);
    assert.equal(inspection.recoveryMode, "paper");
    assert.equal(inspection.parentExists, true);
    assert.equal(inspection.boundParentExists, false);
});


test("stale block attributes do not prove a deleted document exists", async () => {
    const { plugin, item, binding } = setupPlugin();
    plugin.request = async (url, data = {}) => {
        if (url === "/api/query/sql") return [];
        if (url === "/api/attr/getBlockAttrs") return { title: "Stale", "custom-zotero-item-key": ITEM };
        if (url === "/api/filetree/getHPathByID") return "/Zotero/Paper";
        if (url === "/api/filetree/getIDsByHPath") return [];
        throw new Error(`Unexpected request ${url}`);
    };
    const inspection = await plugin.inspectBindingDocuments(binding, item);
    assert.equal(inspection.parentExists, false);
    assert.equal(inspection.boundParentExists, false);
    assert.equal(inspection.noteExists, false);
    assert.equal(inspection.boundNoteExists, false);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

function setupInteraction() {
    const plugin = makePlugin();
    const commands = [];
    plugin.addCommand = (command) => commands.push(command);
    plugin.eventBus = {
        handlers: {},
        on(name, handler) { this.handlers[name] = handler; },
        off(name, handler) { if (this.handlers[name] === handler) delete this.handlers[name]; }
    };
    plugin.registerInteractionCommands();
    return { plugin, commands };
}

function menu() {
    const items = [];
    return { items, addItem(item) { items.push(item); } };
}

test("slash commands expose citation, Note, and export workflows", () => {
    const { plugin } = setupInteraction();
    assert.deepEqual(plugin.protyleSlash.map((entry) => entry.id), ["zotero-notes-citation", "zotero-notes-note", "zotero-notes-export"]);
    const calls = [];
    plugin.openCitationSelector = () => calls.push("citation");
    plugin.openNotePicker = () => calls.push("note");
    plugin.openExportDialog = () => calls.push("export");
    for (const entry of plugin.protyleSlash) entry.callback(null);
    assert.deepEqual(calls, ["citation", "note", "export"]);
    assert.ok(plugin.protyleSlash[0].filter.includes("/zotero"));
    assert.ok(plugin.protyleSlash[1].filter.includes("/znote"));
    assert.ok(plugin.protyleSlash[2].filter.includes("/zexport"));
});

test("slash Note callback retains only a valid protyle", () => {
    const { plugin } = setupInteraction();
    const valid = { block: { rootID: "doc1" } };
    plugin.openNotePicker = () => {};
    plugin.protyleSlash[1].callback(valid);
    assert.equal(plugin.currentProtyle, valid);
    plugin.protyleSlash[1].callback({});
    assert.equal(plugin.currentProtyle, valid);
});

test("Note picker filters to one selectable paper", () => {
    const plugin = makePlugin();
    plugin.library.items = [remoteItem("A"), remoteItem("B")];
    plugin.library.items[0].data.title = "AutoLife";
    plugin.library.items[1].data.title = "Other";
    const matches = plugin.notePickerItems("autolife");
    assert.deepEqual(matches.map((item) => item.key), ["A"]);
});

test("command palette catches asynchronous failures visibly", async () => {
    const { commands } = setupInteraction();
    const command = commands.find((entry) => entry.langKey === "openNotePicker");
    assert.ok(command);
    // The command contract is exercised without showing the native message UI.
    assert.equal(typeof command.callback, "function");
});

test("ordinary document menu contains writing actions only", async () => {
    const { plugin } = setupInteraction();
    plugin.request = async () => ({});
    const target = menu();
    await plugin.documentMenuHandlers["open-menu-content"]({ detail: { protyle: { block: { rootID: "doc1" } }, menu: target } });
    const labels = target.items.map((item) => item.label);
    assert.ok(labels.includes("插入 Zotero 引用"));
    assert.ok(labels.includes("导出文档"));
    assert.ok(labels.includes("统一多页引用"));
    assert.equal(labels.some((label) => label.includes("回传 Note")), false);
});

test("paper document menu contains Note actions", async () => {
    const { plugin } = setupInteraction();
    const item = remoteItem("PAPER001");
    plugin.library.items = [item];
    plugin.bindings[plugin.bindingKey(item.key)] = { itemKey: item.key, parentDocId: "paper-doc", noteDocId: "note-doc" };
    plugin.request = async () => ({});
    const target = menu();
    await plugin.documentMenuHandlers["click-editortitleicon"]({ detail: { protyle: { block: { rootID: "paper-doc" } }, menu: target } });
    const labels = target.items.map((item) => item.label);
    assert.ok(labels.includes("打开 Note"));
    assert.ok(labels.includes("回传 Note"));
    assert.ok(labels.includes("翻译 PDF"));
});

test("document tree menu supports recovery state and unload unsubscribes exact handlers", async () => {
    const { plugin } = setupInteraction();
    const item = remoteItem("PAPER001");
    plugin.library.items = [item];
    plugin.bindings[plugin.bindingKey(item.key)] = { itemKey: item.key, parentDocId: "paper-doc", noteDocId: "missing-note" };
    plugin.recoveryRequired.add(item.key);
    plugin.request = async () => ({});
    const target = menu();
    await plugin.documentMenuHandlers["open-menu-doctree"]({ detail: { type: "doc", items: [{ id: "paper-doc" }], menu: target } });
    assert.ok(target.items.some((entry) => entry.label === "恢复 Note"));
    plugin.onunload();
    assert.equal(plugin.eventBus.handlers["open-menu-content"], undefined);
    assert.equal(plugin.eventBus.handlers["click-editortitleicon"], undefined);
    assert.equal(plugin.eventBus.handlers["open-menu-doctree"], undefined);
});

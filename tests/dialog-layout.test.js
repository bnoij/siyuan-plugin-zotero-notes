const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

test("responsive CSS bounds dialogs and settings while preserving scrollable actions", () => {
    const css = fs.readFileSync("index.css", "utf8");
    assert.match(css, /100dvh/);
    assert.match(css, /overflow-y:\s*auto/);
    assert.match(css, /container-type:\s*inline-size/);
    assert.match(css, /@container/);
    assert.match(css, /siyuan-plugin-zotero-notes__dialog-action/);
    assert.match(css, /siyuan-plugin-zotero-notes__settings-tabs/);
});

test("dialog preparation applies the scoped responsive namespace without changing callbacks", () => {
    const plugin = makePlugin();
    const container = { classList: { add() {} } };
    const content = { classList: { add() {} } };
    const action = { classList: { add() {} } };
    const added = [];
    for (const element of [container, content, action]) element.classList.add = (name) => added.push(name);
    const dialog = { element: { querySelector(selector) {
        if (selector === ".b3-dialog__container") return container;
        if (selector === ".b3-dialog__content") return content;
        if (selector === ".b3-dialog__action") return action;
        return null;
    } } };
    plugin.prepareDialog(dialog);
    assert.ok(added.includes("siyuan-plugin-zotero-notes__dialog"));
    assert.ok(added.includes("siyuan-plugin-zotero-notes__dialog-body"));
    assert.ok(added.includes("siyuan-plugin-zotero-notes__dialog-action"));
});

test("Dock action model exposes one primary action and secondary operations", () => {
    const plugin = makePlugin();
    const item = remoteItem("PAPER001");
    let model = plugin.dockActionModel(item, null);
    assert.equal(model.primary.id, "create");
    assert.ok(model.secondary.length >= 4);
    const binding = { noteDocId: "note" };
    model = plugin.dockActionModel(item, binding);
    assert.equal(model.primary.id, "open");
    plugin.recoveryRequired = new Set([item.key]);
    model = plugin.dockActionModel(item, binding);
    assert.equal(model.primary.id, "recover");
});

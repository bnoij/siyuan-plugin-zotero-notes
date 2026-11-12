const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

const ALL_KEYS = [
    "notebook", "rootName", "authorLimit",
    "autoImport", "syncMode", "librarySyncInterval", "noteSyncInterval", "workflowQueueEnabled",
    "citationStyle", "citationForm", "noteTemplate",
    "pdf2zhPath", "translationSource", "translationTarget", "translationConcurrency", "translationDualConcurrency", "translationSecretNames"
];

test("settings schema exposes five workflow tabs and every existing setting", () => {
    const plugin = makePlugin();
    const tabs = plugin.settingsTabs();
    assert.deepEqual(tabs.map((tab) => tab.id), ["basic", "sync", "writing", "translation", "advanced"]);
    const keys = tabs.flatMap((tab) => tab.fields.map((field) => field.key).filter(Boolean));
    for (const key of ALL_KEYS) assert.ok(keys.includes(key), `missing ${key}`);
});

test("tab selection preserves draft and performs no persistence", () => {
    const plugin = makePlugin();
    let writes = 0;
    plugin.saveData = async () => { writes++; };
    plugin.settingsDraft = { ...plugin.settings, rootName: "Unsaved" };
    plugin.selectSettingsTab("translation");
    assert.equal(plugin.activeSettingsTab, "translation");
    assert.equal(plugin.settingsDraft.rootName, "Unsaved");
    assert.equal(writes, 0);
});

test("saveSettingsDraft normalizes all settings including dual concurrency", async () => {
    const plugin = makePlugin();
    const saved = [];
    plugin.saveData = async (name, value) => saved.push({ name, value });
    plugin.settingsDraft = Object.fromEntries(ALL_KEYS.map((key) => [key, plugin.settings[key]]));
    Object.assign(plugin.settingsDraft, {
        notebook: "notebook",
        rootName: "Zotero",
        translationDualConcurrency: "128",
        translationConcurrency: "2"
    });
    await plugin.saveSettingsDraft();
    assert.equal(saved.length, 1);
    assert.equal(saved[0].name, "settings.json");
    assert.equal(saved[0].value.translationDualConcurrency, 128);
    assert.equal(saved[0].value.translationConcurrency, 2);
    assert.deepEqual(saved[0].value.translationSecretNames, []);
});

test("binding inspection runs only on demand and reports recoverable issues", async () => {
    const plugin = makePlugin();
    const item = remoteItem("PAPER001");
    plugin.library.items = [item];
    plugin.bindings[plugin.bindingKey(item.key)] = { itemKey: item.key, parentDocId: "paper", noteDocId: "missing" };
    let inspections = 0;
    plugin.inspectBindingDocuments = async () => {
        inspections++;
        return { boundParentExists: true, boundNoteExists: false, parentDocId: "paper", noteDocId: "", parentPath: "/Zotero/Paper", notePath: "/Zotero/Paper/Note", recoveryMode: "note" };
    };
    assert.equal(inspections, 0);
    const issues = await plugin.inspectBindingIssues();
    assert.equal(inspections, 1);
    assert.deepEqual(issues.map((issue) => issue.itemKey), ["PAPER001"]);
});


test("onDataChanged does not erase a draft while the settings surface is open", async () => {
    const plugin = makePlugin();
    plugin.settingsSurfaceOpen = true;
    plugin.settingsDraft = { ...plugin.settings, rootName: "Unsaved draft" };
    plugin.loadData = async (name) => name === "settings.json" ? { rootName: "External change" } : null;
    plugin.syncSettingsControls = () => { throw new Error("must not refresh controls while editing"); };
    await plugin.onDataChanged();
    assert.equal(plugin.settingsDraft.rootName, "Unsaved draft");
});

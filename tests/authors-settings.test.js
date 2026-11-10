const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin } = require("./helpers/load-plugin.js");

test("formatAuthors keeps all authors when limit is 0", () => {
    const plugin = makePlugin();
    assert.equal(plugin.formatAuthors([], 0, "等"), "");
    assert.equal(plugin.formatAuthors(["A"], 0, "等"), "A");
    assert.equal(plugin.formatAuthors(["A", "B", "C"], 0, "等"), "A, B, C");
});

test("formatAuthors truncates with et al. beyond the limit", () => {
    const plugin = makePlugin();
    assert.equal(plugin.formatAuthors(["A", "B", "C"], 2, "等"), "A, B, 等");
    assert.equal(plugin.formatAuthors(["A", "B", "C"], 3, "等"), "A, B, C");
    assert.equal(plugin.formatAuthors(["A", "B"], 5, "et al."), "A, B");
});

test("normalizeSettings fills defaults for missing keys", () => {
    const plugin = makePlugin();
    const settings = plugin.normalizeSettings({ notebook: "nb" });
    assert.equal(settings.notebook, "nb");
    assert.equal(settings.rootName, "Zotero");
    assert.equal(settings.autoImport, true);
    assert.equal(settings.authorLimit, 0);
    assert.equal(settings.librarySyncInterval, 0);
    assert.equal(settings.noteSyncInterval, 0);
});

test("normalizeSettings clamps invalid interval and author values", () => {
    const plugin = makePlugin();
    const settings = plugin.normalizeSettings({
        notebook: "nb",
        rootName: "  ",
        autoImport: 0,
        authorLimit: 100,
        librarySyncInterval: -5,
        noteSyncInterval: "abc"
    });
    assert.equal(settings.rootName, "Zotero");
    assert.equal(settings.autoImport, false);
    assert.equal(settings.authorLimit, 99);
    assert.equal(settings.librarySyncInterval, 0);
    assert.equal(settings.noteSyncInterval, 0);
});

test("normalizeSettings accepts positive string numbers", () => {
    const plugin = makePlugin();
    const settings = plugin.normalizeSettings({
        notebook: "nb",
        authorLimit: "5",
        librarySyncInterval: "30",
        noteSyncInterval: "10"
    });
    assert.equal(settings.authorLimit, 5);
    assert.equal(settings.librarySyncInterval, 30);
    assert.equal(settings.noteSyncInterval, 10);
});

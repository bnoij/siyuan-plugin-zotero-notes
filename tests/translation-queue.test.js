const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin, remoteItem } = require("./helpers/load-plugin.js");

function setupQueue(plugin) {
    plugin.translationJobs = new Map();
    plugin.translationControllers = new Map();
    plugin.translationQueue = [];
    plugin.translationActive = 0;
    plugin.translationCancelled = false;
    plugin.renderTranslationStatus = () => {};
    plugin.settings.translationConcurrency = 2;
    plugin.library.items = ["PAPER001", "PAPER002", "PAPER003", "PAPER004"].map((key) => remoteItem(key));
}

test("queueTranslations respects the concurrency limit and isolates failures", async () => {
    const plugin = makePlugin();
    setupQueue(plugin);
    let active = 0;
    let maxActive = 0;
    plugin.translationAttachment = async (item) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 8));
        active--;
        if (item.key === "PAPER002") throw new Error("failed job");
        return { key: item.key };
    };
    await plugin.queueTranslations(["PAPER001", "PAPER002", "PAPER003", "PAPER004"], "mono");
    await plugin.waitForTranslationIdle();
    assert.equal(maxActive, 2);
    assert.equal(plugin.translationJobs.get("PAPER001").status, "completed");
    assert.equal(plugin.translationJobs.get("PAPER002").status, "error");
    assert.equal(plugin.translationJobs.get("PAPER003").status, "completed");
});

test("cancelTranslations aborts active jobs and stops pending scheduling", async () => {
    const plugin = makePlugin();
    setupQueue(plugin);
    plugin.translationAttachment = async (item, mode, signal) => new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("cancelled")));
    });
    await plugin.queueTranslations(["PAPER001", "PAPER002", "PAPER003"], "dual");
    plugin.cancelTranslations();
    await plugin.waitForTranslationIdle();
    assert.equal(plugin.translationJobs.get("PAPER001").status, "cancelled");
    assert.equal(plugin.translationJobs.get("PAPER003").status, "cancelled");
    assert.equal(plugin.translationActive, 0);
});

test("onunload cancels translation processes without deleting completed outputs", async () => {
    const plugin = makePlugin();
    setupQueue(plugin);
    plugin.translationAttachment = async (item, mode, signal) => new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("cancelled")));
    });
    await plugin.queueTranslations(["PAPER001", "PAPER002"], "mono");
    plugin.onunload();
    await plugin.waitForTranslationIdle();
    assert.equal(plugin.translationControllers.size, 0);
    assert.equal(plugin.translationActive, 0);
});

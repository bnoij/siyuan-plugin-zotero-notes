const test = require("node:test");
const assert = require("node:assert/strict");
const { makePlugin } = require("./helpers/load-plugin.js");

test("runPdf2zh uses mono/dual arguments and redacts secret environment values", async () => {
    const plugin = makePlugin();
    plugin.settings.translationSource = "en";
    plugin.settings.translationTarget = "zh";
    let invocation;
    plugin.processRunner = async (executable, args, options) => {
        invocation = { executable, args, options };
        return { code: 0, stdout: "done", stderr: "" };
    };
    await plugin.runPdf2zh({ input: "paper.pdf", outputDir: "out", mode: "mono", env: { OPENAI_API_KEY: "secret" } });
    assert.equal(invocation.executable, "pdf2zh");
    assert.ok(invocation.args.includes("--no-dual"));
    assert.ok(invocation.args.includes("--li"));
    assert.equal(invocation.options.env.OPENAI_API_KEY, undefined);
    const dual = await plugin.runPdf2zh({ input: "paper.pdf", outputDir: "out", mode: "dual", env: {} });
    assert.ok(!invocation.args.includes("--no-dual"));
    assert.ok(invocation.args.includes("--no-mono"));
});

test("runPdf2zh rejects nonzero exits with an actionable error", async () => {
    const plugin = makePlugin();
    plugin.processRunner = async () => ({ code: 2, stdout: "", stderr: "bad arguments" });
    await assert.rejects(plugin.runPdf2zh({ input: "missing.pdf", outputDir: "out", mode: "mono" }), /bad arguments/);
});

test("runPdf2zh forwards cancellation to the process runner", async () => {
    const plugin = makePlugin();
    const controller = new AbortController();
    plugin.processRunner = async (executable, args, options) => {
        return new Promise((resolve, reject) => {
            options.signal.addEventListener("abort", () => reject(new Error("cancelled")));
            controller.abort();
        });
    };
    await assert.rejects(plugin.runPdf2zh({ input: "paper.pdf", outputDir: "out", mode: "dual", signal: controller.signal }), /cancelled/);
});

test("translationAttachment decodes file URL paths before invoking pdf2zh", async () => {
    const plugin = makePlugin();
    plugin.zoteroRequest = async () => ({ data: "file:///C:/Paper%20Life/input%20file.pdf" });
    let input;
    plugin.runPdf2zh = async (options) => {
        input = options.input;
        return { outputPath: "out.pdf", mode: "mono" };
    };
    plugin.nodeRequire = (name) => name === "path" ? require("path") : require("fs");
    const item = { key: "PAPER001", attachments: [{ key: "PDF1", data: { contentType: "application/pdf" } }] };
    await assert.rejects(plugin.translationAttachment(item, "mono"), /readFileSync|ENOENT|no such file/);
    assert.equal(input, "C:/Paper Life/input file.pdf");
});

test("uploadZoteroFile follows authorize, upload, and commit phases", async () => {
    const plugin = makePlugin();
    plugin.library.serverID = "server";
    const calls = [];
    plugin.withWriteKey = async (operation) => operation("key");
    plugin.zoteroRequest = async (path, options) => {
        calls.push({ path, options });
        if (calls.length === 1) return { data: { uploadKey: "upload1", url: "/upload/upload1", prefix: "", suffix: "" } };
        return { data: null };
    };
    await plugin.uploadZoteroFile("ATTACH1", new TextEncoder().encode("pdf"), "translated.pdf");
    assert.equal(calls.length, 3);
    assert.equal(calls[0].path, "/users/0/items/ATTACH1/file");
    assert.match(calls[0].options.rawBody, /md5=/);
    assert.match(calls[0].options.rawBody, /filename=translated.pdf/);
    assert.equal(calls[1].path, "/upload/upload1");
    assert.equal(calls[2].path, "/users/0/items/ATTACH1/file");
    assert.equal(calls[2].options.rawBody, "upload=upload1");
});

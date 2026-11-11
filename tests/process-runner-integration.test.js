const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { makePlugin } = require("./helpers/load-plugin.js");

function setupStub(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "zotero-notes-pdf2zh-"));
    const stub = path.join(directory, "stub-cli.js");
    fs.writeFileSync(stub, `
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output");
const outputDir = args[outputIndex + 1];
const input = process.argv[1];
const base = path.basename(input, path.extname(input));
const mode = args.includes("--no-mono") ? "dual" : "mono";
const write = () => {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, base + "-" + mode + ".pdf"), "stub " + mode);
};
if (process.env.STUB_EXIT) {
    process.stderr.write("stub failure");
    process.exit(Number(process.env.STUB_EXIT));
} else if (process.env.STUB_DELAY) {
    setTimeout(write, Number(process.env.STUB_DELAY));
} else {
    write();
}
`);
    const plugin = makePlugin();
    plugin.settings.pdf2zhPath = process.execPath;
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    return { plugin, stub, outputDir: path.join(directory, "output") };
}

test("real spawn creates separate mono and dual stub outputs", async (t) => {
    const { plugin, stub, outputDir } = setupStub(t);
    for (const mode of ["mono", "dual"]) {
        const result = await plugin.runPdf2zh({ input: stub, outputDir, mode, env: { ELECTRON_RUN_AS_NODE: "1" } });
        const entries = fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : [];
        assert.ok(fs.existsSync(result.outputPath), JSON.stringify({ result, entries }));
        assert.equal(fs.readFileSync(result.outputPath, "utf8"), `stub ${mode}`);
    }
});

test("real spawn surfaces a nonzero stub exit", async (t) => {
    const { plugin, stub, outputDir } = setupStub(t);
    await assert.rejects(
        plugin.runPdf2zh({ input: stub, outputDir, mode: "mono", env: { ELECTRON_RUN_AS_NODE: "1", STUB_EXIT: "7" } }),
        /退出码 7.*stub failure/
    );
});

test("real spawn terminates a delayed stub on cancellation", { timeout: 5000 }, async (t) => {
    const { plugin, stub, outputDir } = setupStub(t);
    const controller = new AbortController();
    const running = plugin.runPdf2zh({
        input: stub,
        outputDir,
        mode: "dual",
        signal: controller.signal,
        env: { ELECTRON_RUN_AS_NODE: "1", STUB_DELAY: "10000" }
    });
    setTimeout(() => controller.abort(), 30);
    await assert.rejects(running, /abort|cancel/i);
    assert.equal(fs.existsSync(path.join(outputDir, "stub-cli-dual.pdf")), false);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { PluginClass } = require("./helpers/load-plugin.js");

const analyze = PluginClass.analyzeFormatLosses;

test("no losses for plain markdown content", () => {
    assert.deepEqual(analyze("# Title\n\nPlain **bold** text.", "<h1>Title</h1><p>Plain <strong>bold</strong> text.</p>"), []);
});

test("detects math from html or markdown", () => {
    assert.ok(analyze("", "<p><span class=\"language-math\">x</span></p>").includes("Math"));
    assert.ok(analyze("$$x+y$$", "").includes("Math"));
    assert.ok(analyze("Euler: $e^{i\\pi}$", "").includes("Math"));
    assert.ok(!analyze("price is $5", "").includes("Math"));
});

test("detects task lists from checkbox inputs or markdown", () => {
    assert.ok(analyze("", "<ul><li><input type=\"checkbox\" checked>Done</li></ul>").includes("TaskList"));
    assert.ok(analyze("- [ ] todo", "").includes("TaskList"));
});

test("detects embedded players and collapsible blocks", () => {
    assert.ok(analyze("", "<iframe src=\"https://example.com\"></iframe>").includes("Embed"));
    assert.ok(analyze("", "<video controls></video>").includes("Embed"));
    assert.ok(analyze("", "<details><summary>More</summary>hidden</details>").includes("Details"));
});

test("detects highlight, code highlight, and inline styles", () => {
    assert.ok(analyze("some ==marked== text", "").includes("Highlight"));
    assert.ok(analyze("", "<pre><code class=\"language-js\">x</code></pre>").includes("CodeHighlight"));
    assert.ok(analyze("", "<p><span style=\"color:red\">red</span></p>").includes("InlineStyle"));
});

test("detects image attributes and siyuan links", () => {
    assert.ok(analyze("", "<img src=\"assets/a.png\" width=\"300\">").includes("ImageStyle"));
    assert.ok(analyze("", "<a href=\"siyuan://blocks/1\">ref</a>").includes("BlockRef"));
    assert.ok(analyze("see ((20240101000000-abcdefg))", "").includes("BlockRef"));
    assert.ok(!analyze("", "<img src=\"assets/a.png\">").includes("ImageStyle"));
});

test("multiple losses are reported together in stable order", () => {
    const losses = analyze("- [ ] task\n\n==mark==\n\n$$x$$", "<pre><code>x</code></pre>");
    assert.deepEqual(losses, ["Math", "TaskList", "Highlight", "CodeHighlight"]);
});

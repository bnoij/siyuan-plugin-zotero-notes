const test = require("node:test");
const assert = require("node:assert/strict");
const { PluginClass } = require("./helpers/load-plugin.js");

const prepare = PluginClass.prepareNoteMarkdown;

test("strips the Note heading and empty-block placeholders", () => {
    const input = "# Note\n\n　　‍\n\n　　‍\n";
    assert.equal(prepare(input).trim(), "");
});

test("unwraps SiYuan indent HTML, including inside table cells", () => {
    const input = "|<p class=\"indent--2\">gggg</p>&#10;|||\n| ------| --| --|";
    const result = prepare(input);
    assert.ok(result.includes("|gggg&#10;|||"));
    assert.ok(!result.includes("<p class="));
});

test("keeps real content and removes zero-width placeholder characters", () => {
    const input = "# Note\n\n　　111111\n\n　　‍\n\n　　$ssss$\n";
    const result = prepare(input);
    const lines = result.split("\n");
    assert.ok(lines.includes("　　111111"));
    assert.ok(lines.includes("　　$ssss$"));
    assert.ok(!result.includes("‍"));
    assert.ok(!result.includes("​"));
    assert.ok(!result.includes("﻿"));
});

test("prepareNoteMarkdown is idempotent", () => {
    const input = "# Note\n\n　　‍\n\ntext\n\n|<p class=\"indent--1\">a</p>||\n";
    assert.equal(prepare(prepare(input)), prepare(input));
});

test("analyzeFormatLosses reports indent from the raw markdown", () => {
    assert.ok(PluginClass.analyzeFormatLosses("|<p class=\"indent--2\">gggg</p>||", "").includes("Indent"));
    assert.ok(!PluginClass.analyzeFormatLosses("plain", "<p>plain</p>").includes("Indent"));
});

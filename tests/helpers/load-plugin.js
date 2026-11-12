const Module = require("module");

const originalLoad = Module._load;
const openedDocuments = [];
const dialogInstances = [];
let activeEditor = null;
function dialogElement() {
    return {
        textContent: "",
        children: [],
        classList: { add() {} },
        append(...children) { this.children.push(...children); },
        addEventListener() {},
        querySelector() { return dialogElement(); },
        querySelectorAll() { return []; },
        focus() {}
    };
}
Module._load = function (request, parent, isMain) {
    if (request === "siyuan") {
        return {
            Plugin: class {},
            Dialog: class {
                constructor(options) {
                    this.options = options;
                    this.element = { querySelector: () => dialogElement() };
                    dialogInstances.push(this);
                }
                destroy() { this.options.destroyCallback?.(); }
            },
            Setting: class {},
            showMessage: () => {},
            openTab: async (options) => openedDocuments.push(options),
            getActiveEditor: () => activeEditor
        };
    }
    return originalLoad.call(this, request, parent, isMain);
};
const PluginClass = require("../../index.js");
Module._load = originalLoad;

function makePlugin(overrides = {}) {
    const plugin = new PluginClass();
    plugin.library = { serverID: "server", collections: [], items: [], importedAt: 123 };
    plugin.bindings = {};
    plugin.writeKeys = {};
    plugin.settings = { notebook: "notebook", rootName: "Zotero", autoImport: false };
    plugin.i18n = {};
    plugin.abortController = new AbortController();
    plugin.dataChangeRevision = 0;
    plugin.render = () => {};
    plugin.renderStatus = () => {};
    plugin.startWorkflowQueue = () => {};
    plugin.stopWorkflowQueue = () => {};
    plugin.saveData = async () => {
        throw new Error("Unexpected saveData call");
    };
    Object.assign(plugin, overrides);
    return plugin;
}

function remoteItem(key = "ITEMKEY1") {
    return {
        key,
        version: 1,
        data: {
            key,
            itemType: "journalArticle",
            title: "Paper",
            creators: [],
            tags: [],
            collections: [],
            date: "2024",
            dateModified: "2026-01-01T00:00:00Z"
        }
    };
}

function remoteCollection(key = "COLLECT1") {
    return { key, data: { key, name: "Collection", parentCollection: false } };
}

function stubRemote(plugin, { items = [remoteItem()], collections = [remoteCollection()], serverID = "server" } = {}) {
    plugin.zoteroPage = async () => ({
        serverID,
        response: new Headers({ "Last-Modified-Version": "10" })
    });
    plugin.fetchAll = async (path) => path.includes("collections") ? collections : items;
}

module.exports = { makePlugin, remoteItem, remoteCollection, stubRemote, openedDocuments, dialogInstances, PluginClass, setActiveEditor: (editor) => { activeEditor = editor; } };

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../app.js", import.meta.url), "utf8");

let clickHandler;
let createdBlob;
let createdLink;
let revokedUrl;

const button = {
  addEventListener(eventName, handler) {
    assert.equal(eventName, "click");
    clickHandler = handler;
  },
};

const status = {
  textContent: "",
  classList: {
    values: new Set(),
    add(value) {
      this.values.add(value);
    },
  },
};

class TestBlob {
  constructor(parts, options) {
    this.parts = parts;
    this.type = options.type;
    createdBlob = this;
  }
}

const context = vm.createContext({
  Blob: TestBlob,
  URL: {
    createObjectURL(blob) {
      assert.equal(blob, createdBlob);
      return "blob:vector-editor-test";
    },
    revokeObjectURL(url) {
      revokedUrl = url;
    },
  },
  document: {
    body: {
      append(link) {
        assert.equal(link, createdLink);
      },
    },
    querySelector(selector) {
      if (selector === "#download-svg") return button;
      if (selector === "#download-status") return status;
      throw new Error(`Unexpected selector: ${selector}`);
    },
    createElement(tagName) {
      assert.equal(tagName, "a");
      createdLink = {
        clicked: false,
        removed: false,
        click() {
          this.clicked = true;
        },
        remove() {
          this.removed = true;
        },
      };
      return createdLink;
    },
  },
  window: {
    setTimeout(callback) {
      callback();
    },
  },
});

vm.runInContext(source, context, { filename: "app.js" });
assert.equal(typeof clickHandler, "function");

clickHandler();

const svg = createdBlob.parts.join("");

assert.equal(createdBlob.type, "image/svg+xml;charset=utf-8");
assert.equal(createdLink.download, "tiny-submarine.svg");
assert.equal(createdLink.href, "blob:vector-editor-test");
assert.equal(createdLink.clicked, true);
assert.equal(createdLink.removed, true);
assert.equal(revokedUrl, "blob:vector-editor-test");
assert.match(svg, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(svg, /<title id="title">Tiny yellow submarine<\/title>/);
assert.match(svg, /vector-effect="non-scaling-stroke"/);
assert.equal((svg.match(/<stop /g) ?? []).length, 7);
assert.equal(status.textContent, "Downloaded tiny-submarine.svg — surprise revealed!");
assert.equal(status.classList.values.has("is-complete"), true);

console.log("SVG download test passed");

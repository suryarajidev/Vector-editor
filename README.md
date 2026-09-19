# Vector Editor

A lightweight, locally runnable vector editor inspired by the approachable editing workflow in Scratch and PenguinMod.

## Current prototype: node editing

Open `index.html` directly in a browser. No server, build step, or package installation is required.

The prototype currently supports:

- Selecting and dragging numbered path nodes
- Clicking an edge to insert a node exactly on that segment
- Editing the selected node's X and Y coordinates
- Adding a midpoint node after the current selection from the left toolbar
- Deleting nodes while preserving the three-node minimum for a closed shape
- Nudging nodes with the arrow keys (`Shift` moves 10 pixels)
- Resetting the example shape
- Downloading the edited shape as an SVG with a non-scaling outline

## Test

If Node.js is installed, run:

```sh
node tests/node-editor.test.cjs
```

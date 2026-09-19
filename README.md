# Vector Editor

A lightweight, locally runnable vector editor inspired by the approachable editing workflow in Scratch and PenguinMod.

## Current prototype: node editing

Open `index.html` directly in a browser. No server, build step, or package installation is required.

The prototype currently supports:

- Selecting and dragging numbered path nodes
- Switching between Pointer and Node tools
- Dragging empty canvas space to pan with either tool
- Panning the checkerboard background together with the artwork
- Dragging the filled shape to move the whole object
- Hiding the node inspector while the Pointer tool is active
- Clicking the shape in Node mode to select every node
- Shift-clicking nodes to build or reduce a multiple-node selection
- Clicking the checkerboard or using Deselect to clear the node selection
- Drawing additional rectangles with the Rectangle tool
- Holding `Shift` while drawing to constrain a rectangle to a perfect square
- Selecting created shapes from the Objects rail
- Setting each shape's fill with Scratch-style Color, Saturation, and Brightness sliders or a synchronized hex code
- Giving new objects the most recently chosen color, starting with `#eb8e0b` from this feature's parent commit
- Switching nodes between Corner, Curve, and Uneven modes
- Dragging paired Bézier handles to shape smooth curves
- Using Uneven curve nodes whose aligned handles keep independent lengths
- Clicking a straight or curved edge to insert a node without changing its shape
- Editing the selected node's X and Y coordinates
- Adding a curve-preserving midpoint node from the left toolbar
- Deleting nodes while preserving the three-node minimum for a closed shape
- Nudging nodes with the arrow keys (`Shift` moves 10 pixels)
- Zooming from 50% to 400% with status-bar controls or `Ctrl`/`Command` + mouse wheel
- Keeping node markers and curve-handle dots the same on-screen size at every zoom level
- Resetting the example shape
- Downloading all created shapes and their fill colors as an SVG with non-scaling outlines

## Test

If Node.js is installed, run:

```sh
node tests/node-editor.test.cjs
```

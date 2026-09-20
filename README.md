# Vector Editor

A lightweight, locally runnable vector editor inspired by the approachable editing workflow in Scratch and PenguinMod.

## Current prototype: node editing

Open `index.html` directly in a browser. No server, build step, or package installation is required.

The prototype currently supports:

- Selecting and dragging numbered path nodes
- Switching between Pointer and Node tools
- Dragging empty canvas space to pan with either tool
- Panning in any tool with the mouse wheel or trackpad (`Shift` scrolls horizontally)
- Panning the checkerboard background together with the artwork
- Dragging the filled shape to move the whole object
- Holding `Alt` while beginning a Pointer-tool drag to duplicate and move the copy
- Stretching selected objects with side handles or proportionally resizing them from a corner
- Holding `Alt` while stretching a side handle to resize equally from the object's center
- Holding `Ctrl`/`Command` while dragging a side handle to skew, with `Alt`/`Option` for a centered skew
- Freely rotating selected objects with the Rotate tool, with optional 15-degree snapping
- Rotating by ±45°, ±90°, or a custom angle from the Rotate tool's top controls
- Flipping selected objects horizontally or vertically from the Pointer and Rotate tools
- Compressing objects down to a small 2-unit minimum
- Deleting an entire selected object from Pointer mode with the Delete button or keyboard key
- Nudging a selected object with the arrow keys (`Shift` moves 10 pixels)
- Hiding the node inspector while the Pointer tool is active
- Clicking the shape in Node mode to select every node
- Shift-clicking nodes to build or reduce a multiple-node selection
- Clicking the checkerboard or using Deselect to clear the node selection
- Drawing additional rectangles with the Rectangle tool
- Holding `Shift` while drawing to constrain a rectangle to a perfect square
- Drawing ellipses with the Circle tool and holding `Shift` for a perfect circle
- Drawing open, two-node paths with the Line tool and the current outline settings
- Selecting created shapes from the Objects rail
- Setting each shape's fill with Scratch-style Color, Saturation, and Brightness sliders or a synchronized hex code
- Setting a separate outline color with the same solid and gradient color controls
- Adjusting each object's non-scaling outline thickness, starting at white and 8 pixels
- Giving new objects the most recently chosen fill, starting with solid `#052d5c`
- Creating left-to-right, top-to-bottom, and radial gradients with editable start and end colors
- Switching nodes between Corner, Curve, and Uneven modes
- Dragging paired Bézier handles to shape smooth curves
- Using Uneven curve nodes whose aligned handles keep independent lengths
- Clicking a straight or curved edge to insert a node without changing its shape
- Editing the selected node's X and Y coordinates
- Adding a curve-preserving midpoint node from the left toolbar
- Deleting nodes while preserving the three-node minimum for closed shapes and two-node minimum for open paths
- Nudging nodes with the arrow keys (`Shift` moves 10 pixels)
- Zooming from 50% to 400% with status-bar controls or `Ctrl`/`Command` + mouse wheel
- Keeping node markers and curve-handle dots the same on-screen size at every zoom level
- Undoing artwork changes with `Ctrl+Z` or `Command+Z`
- Resetting the example shape
- Downloading all created shapes with their fills, outline colors, and non-scaling outline thicknesses as SVG

## Test

If Node.js is installed, run:

```sh
node tests/node-editor.test.cjs
```

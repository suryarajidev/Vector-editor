const assert = require("node:assert/strict");
const {
  DEFAULT_LAYER,
  DEFAULT_FILL_COLOR,
  DEFAULT_OUTLINE_COLOR,
  DEFAULT_OUTLINE_WIDTH,
  INITIAL_POINTS,
  LAYER_COUNT,
  MINIMUM_SHAPE_SIZE,
  boundsIntersect,
  calculateShapeBounds,
  calculateWheelPan,
  clonePoints,
  closestPointOnSegment,
  closestTOnCubic,
  constrainTranslation,
  createArtworkSvg,
  createDocumentSvg,
  createEllipsePoints,
  createGradientEndColor,
  createGradientMarkup,
  createLinePoints,
  createPathData,
  createRectanglePoints,
  createSelectionBounds,
  createZoomViewBox,
  cubicPointAt,
  duplicateShape,
  findClosestSegment,
  flipShapePoints,
  hexToHsb,
  hsbToHex,
  midpoint,
  moveShapeToLayer,
  normalizeFill,
  normalizeHexColor,
  normalizeOutlineWidth,
  resizeShapePoints,
  reorderShapesInLayer,
  skewShapePoints,
  rotateShapePoints,
  rotateVector,
  scalePointsToBounds,
  setPointType,
  shapeRenderOrder,
  shapeIndicesInSelection,
  splitSegment,
  updatePointHandle,
} = require("../app.js");

const points = clonePoints(INITIAL_POINTS);

assert.equal(DEFAULT_FILL_COLOR, "#052d5c");
assert.equal(DEFAULT_OUTLINE_COLOR, "#ffffff");
assert.equal(DEFAULT_OUTLINE_WIDTH, 8);
assert.equal(DEFAULT_LAYER, 1);
assert.equal(LAYER_COUNT, 5);
assert.equal(MINIMUM_SHAPE_SIZE, 2);
assert.deepEqual(createSelectionBounds({ x: 90, y: 80 }, { x: 10, y: 20 }), {
  left: 10,
  top: 20,
  right: 90,
  bottom: 80,
  width: 80,
  height: 60,
});
assert.equal(
  boundsIntersect(
    { left: 0, top: 0, right: 20, bottom: 20 },
    { left: 20, top: 10, right: 30, bottom: 30 },
  ),
  true,
);
assert.equal(
  boundsIntersect(
    { left: 0, top: 0, right: 20, bottom: 20 },
    { left: 21, top: 10, right: 30, bottom: 30 },
  ),
  false,
);
assert.equal(normalizeOutlineWidth("12.5"), 12.5);
assert.equal(normalizeOutlineWidth(150), 100);
assert.equal(normalizeOutlineWidth("not-a-number"), 8);

assert.equal(points.length, 7);
assert.notEqual(points, INITIAL_POINTS);
assert.notEqual(points[0], INITIAL_POINTS[0]);
assert.notEqual(points[0].handleIn, INITIAL_POINTS[0].handleIn);

const originalShape = {
  id: 2,
  name: "Rectangle 2",
  kind: "rectangle",
  closed: true,
  fill: { type: "solid", colors: ["#052d5c", "#ffffff"] },
  outline: { type: "solid", colors: ["#ffffff", "#000000"] },
  outlineWidth: 8,
  points: clonePoints(INITIAL_POINTS.slice(0, 4)),
};
const copiedShape = duplicateShape(originalShape, 7);
assert.equal(copiedShape.id, 7);
assert.equal(copiedShape.name, "Rectangle 7");
assert.notEqual(copiedShape, originalShape);
assert.notEqual(copiedShape.fill, originalShape.fill);
assert.notEqual(copiedShape.outline, originalShape.outline);
assert.notEqual(copiedShape.points, originalShape.points);
assert.notEqual(copiedShape.points[0], originalShape.points[0]);
copiedShape.points[0].x = 999;
assert.equal(originalShape.points[0].x, INITIAL_POINTS[0].x);

const layeredShapes = [
  { id: 1, name: "Back in Layer 1", layer: 1 },
  { id: 2, name: "Middle in Layer 1", layer: 1 },
  { id: 3, name: "Only in Layer 5", layer: 5 },
  { id: 4, name: "Front in Layer 1", layer: 1 },
];
assert.deepEqual(
  shapeRenderOrder(layeredShapes).map(({ shape }) => shape.id),
  [3, 1, 2, 4],
);
const reorderedLayer = reorderShapesInLayer(layeredShapes, 1, 4, false);
assert.deepEqual(reorderedLayer.map(({ id }) => id), [2, 4, 3, 1]);
assert.deepEqual(
  shapeRenderOrder(reorderedLayer)
    .filter(({ shape }) => shape.layer === 1)
    .map(({ shape }) => shape.id),
  [2, 4, 1],
);
const movedLayerShape = moveShapeToLayer(layeredShapes, 3, 1);
assert.deepEqual(movedLayerShape.map(({ id }) => id), [1, 2, 4, 3]);
assert.equal(movedLayerShape.at(-1).layer, 1);

const transformSquare = [
  { x: 0, y: 0, type: "corner", handleIn: null, handleOut: { x: 2, y: 0 } },
  { x: 10, y: 0, type: "corner", handleIn: null, handleOut: null },
  { x: 10, y: 10, type: "corner", handleIn: null, handleOut: null },
  { x: 0, y: 10, type: "corner", handleIn: null, handleOut: null },
];
assert.deepEqual(rotateVector({ x: 2, y: 3 }, 90), { x: -3, y: 2 });
const rotatedSquare = rotateShapePoints(transformSquare, 90);
assert.deepEqual(
  rotatedSquare.map(({ x, y }) => ({ x, y })),
  [
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
    { x: 0, y: 0 },
  ],
);
assert.deepEqual(rotatedSquare[0].handleOut, { x: 0, y: 2 });
const horizontallyFlippedSquare = flipShapePoints(transformSquare, "horizontal");
assert.deepEqual(
  horizontallyFlippedSquare.map(({ x, y }) => ({ x, y })),
  [
    { x: 10, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 10 },
    { x: 10, y: 10 },
  ],
);
assert.deepEqual(horizontallyFlippedSquare[0].handleOut, { x: -2, y: 0 });
const verticallyFlippedSquare = flipShapePoints(transformSquare, "vertical");
assert.deepEqual(
  verticallyFlippedSquare.map(({ x, y }) => ({ x, y })),
  [
    { x: 0, y: 10 },
    { x: 10, y: 10 },
    { x: 10, y: 0 },
    { x: 0, y: 0 },
  ],
);

assert.equal(
  createPathData([
    { x: 10, y: 20 },
    { x: 30, y: 40 },
    { x: 50, y: 60 },
  ]),
  "M 10 20 L 30 40 L 50 60 Z",
);
assert.equal(
  createPathData(
    [
      { x: 0, y: 0, type: "smooth", handleIn: null, handleOut: { x: 30, y: 0 } },
      { x: 100, y: 0, type: "smooth", handleIn: { x: -30, y: 0 }, handleOut: null },
      { x: 100, y: 100, type: "corner", handleIn: null, handleOut: null },
    ],
    false,
  ),
  "M 0 0 C 30 0 70 0 100 0 L 100 100",
);
assert.deepEqual(midpoint({ x: 10, y: 20 }, { x: 15, y: 31 }), { x: 13, y: 26 });
assert.deepEqual(
  closestPointOnSegment({ x: 30, y: 10 }, { x: 0, y: 0 }, { x: 100, y: 0 }),
  { x: 30, y: 0, position: 0.3, distanceSquared: 100 },
);
assert.deepEqual(
  findClosestSegment(
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ],
    { x: 96, y: 42 },
  ),
  { x: 100, y: 42, position: 0.42, distanceSquared: 16, segmentIndex: 1 },
);

const halfway = cubicPointAt(
  { x: 0, y: 0 },
  { x: 0, y: 100 },
  { x: 100, y: 100 },
  { x: 100, y: 0 },
  0.5,
);
assert.deepEqual(halfway, { x: 50, y: 75 });
assert.ok(
  Math.abs(
    closestTOnCubic(
      { x: 50, y: 75 },
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
    ) - 0.5,
  ) < 0.01,
);

const convertible = [
  { x: 0, y: 0, type: "corner", handleIn: null, handleOut: null },
  { x: 50, y: 70, type: "corner", handleIn: null, handleOut: null },
  { x: 100, y: 0, type: "corner", handleIn: null, handleOut: null },
];
setPointType(convertible, 1, "smooth");
assert.equal(convertible[1].type, "smooth");
assert.deepEqual(convertible[1].handleIn, {
  x: -convertible[1].handleOut.x,
  y: -convertible[1].handleOut.y,
});
setPointType(convertible, 1, "asymmetric");
const preservedIncomingLength = Math.hypot(
  convertible[1].handleIn.x,
  convertible[1].handleIn.y,
);
updatePointHandle(convertible[1], "handleOut", { x: 0, y: 60 });
assert.deepEqual(convertible[1].handleOut, { x: 0, y: 60 });
assert.equal(convertible[1].handleIn.x, 0);
assert.ok(Math.abs(convertible[1].handleIn.y + preservedIncomingLength) < 0.01);
setPointType(convertible, 1, "smooth");
assert.deepEqual(convertible[1].handleIn, {
  x: -convertible[1].handleOut.x,
  y: -convertible[1].handleOut.y,
});
setPointType(convertible, 1, "corner");
assert.equal(convertible[1].handleIn, null);
assert.equal(convertible[1].handleOut, null);

const splitCurve = [
  { x: 0, y: 0, type: "smooth", handleIn: null, handleOut: { x: 0, y: 100 } },
  { x: 100, y: 0, type: "smooth", handleIn: { x: 0, y: 100 }, handleOut: null },
];
const insertedIndex = splitSegment(splitCurve, 0, 0.5);
assert.equal(insertedIndex, 1);
assert.equal(splitCurve.length, 3);
assert.deepEqual(splitCurve[1], {
  x: 50,
  y: 75,
  type: "asymmetric",
  handleIn: { x: -25, y: 0 },
  handleOut: { x: 25, y: 0 },
});
assert.deepEqual(splitCurve[0].handleOut, { x: 0, y: 50 });
assert.deepEqual(splitCurve[2].handleIn, { x: 0, y: 50 });

const svg = createArtworkSvg(points);

assert.match(svg, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(svg, /<title id="title">Node-edited vector shape<\/title>/);
assert.match(svg, /vector-effect="non-scaling-stroke"/);
assert.match(svg, / C /);
assert.match(svg, new RegExp(`d="${createPathData(points)}"`));
assert.match(svg, /fill="#052d5c"/);
assert.match(svg, /stroke="#ffffff"/);
assert.match(svg, /stroke-width="8"/);
assert.equal((svg.match(/<linearGradient/g) ?? []).length, 0);

assert.equal(normalizeHexColor("a329d6"), "#a329d6");
assert.equal(normalizeHexColor("  #A329D6  "), "#a329d6");
assert.equal(normalizeHexColor("#oops"), null);
assert.equal(hsbToHex(0, 100, 100), "#ff0000");
assert.equal(hsbToHex(50, 100, 100), "#00ffff");
const purpleHsb = hexToHsb("#a329d6");
assert.equal(
  hsbToHex(purpleHsb.color, purpleHsb.saturation, purpleHsb.brightness),
  "#a329d6",
);
assert.deepEqual(normalizeFill(), {
  type: "solid",
  colors: ["#052d5c", createGradientEndColor("#052d5c")],
});
assert.deepEqual(normalizeFill({ type: "vertical", colors: ["#A329D6", "#12B5A6"] }), {
  type: "vertical",
  colors: ["#a329d6", "#12b5a6"],
});
assert.match(
  createGradientMarkup(
    { type: "radial", colors: ["#052d5c", "#12b5a6"] },
    "testGradient",
  ),
  /<radialGradient id="testGradient"/,
);

const rectangle = createRectanglePoints({ x: 100, y: 100 }, { x: 180, y: 140 });
const line = createLinePoints({ x: 10, y: 20 }, { x: 100, y: 70 });
assert.deepEqual(
  line.map(({ x, y }) => ({ x, y })),
  [
    { x: 18, y: 20 },
    { x: 100, y: 70 },
  ],
);
assert.equal(createPathData(line, false), "M 18 20 L 100 70");
const splitLine = clonePoints(line);
assert.equal(splitSegment(splitLine, 0, 0.5, false), 1);
assert.deepEqual(
  splitLine.map(({ x, y }) => ({ x, y })),
  [
    { x: 18, y: 20 },
    { x: 59, y: 45 },
    { x: 100, y: 70 },
  ],
);

const ellipse = createEllipsePoints({ x: 100, y: 100 }, { x: 180, y: 140 });
assert.deepEqual(calculateShapeBounds(ellipse), {
  left: 100,
  top: 100,
  right: 180,
  bottom: 140,
  width: 80,
  height: 40,
});
assert.equal(ellipse.length, 4);
assert.ok(ellipse.every((point) => point.type === "smooth"));
assert.match(createPathData(ellipse), /^M 140 100 C /);
const circle = createEllipsePoints({ x: 100, y: 100 }, { x: 180, y: 140 }, true);
assert.deepEqual(calculateShapeBounds(circle), {
  left: 100,
  top: 100,
  right: 180,
  bottom: 180,
  width: 80,
  height: 80,
});
assert.deepEqual(calculateShapeBounds(rectangle), {
  left: 100,
  top: 100,
  right: 180,
  bottom: 140,
  width: 80,
  height: 40,
});
const marqueeShapes = [
  { id: 1, layer: 1, points: rectangle },
  { id: 2, layer: 1, points: createRectanglePoints({ x: 250, y: 200 }, { x: 320, y: 280 }) },
  { id: 3, layer: 2, points: rectangle },
];
assert.deepEqual(
  shapeIndicesInSelection(
    marqueeShapes,
    createSelectionBounds({ x: 90, y: 90 }, { x: 260, y: 210 }),
    1,
  ),
  [0, 1],
);
assert.deepEqual(
  shapeIndicesInSelection(
    marqueeShapes,
    createSelectionBounds({ x: 90, y: 90 }, { x: 200, y: 160 }),
    2,
  ),
  [2],
);
const stretchedRectangle = resizeShapePoints(rectangle, "e", { x: 260, y: 120 });
assert.deepEqual(calculateShapeBounds(stretchedRectangle), {
  left: 100,
  top: 100,
  right: 260,
  bottom: 140,
  width: 160,
  height: 40,
});
const centeredStretchedRectangle = resizeShapePoints(
  rectangle,
  "e",
  { x: 240, y: 120 },
  undefined,
  undefined,
  true,
);
assert.deepEqual(calculateShapeBounds(centeredStretchedRectangle), {
  left: 40,
  top: 100,
  right: 240,
  bottom: 140,
  width: 200,
  height: 40,
});
assert.equal(
  calculateShapeBounds(resizeShapePoints(rectangle, "e", { x: 100.1, y: 120 })).width,
  2,
);
assert.deepEqual(
  calculateShapeBounds(resizeShapePoints(rectangle, "se", { x: 101, y: 101 })),
  {
    left: 100,
    top: 100,
    right: 104,
    bottom: 102,
    width: 4,
    height: 2,
  },
);
const cornerResizedRectangle = resizeShapePoints(rectangle, "nw", { x: 60, y: 80 });
assert.deepEqual(calculateShapeBounds(cornerResizedRectangle), {
  left: 60,
  top: 80,
  right: 180,
  bottom: 140,
  width: 120,
  height: 60,
});
const offAxisCornerResize = calculateShapeBounds(
  resizeShapePoints(rectangle, "se", { x: 300, y: 150 }),
);
assert.equal(offAxisCornerResize.width / offAxisCornerResize.height, 2);
assert.deepEqual(offAxisCornerResize, {
  left: 100,
  top: 100,
  right: 300,
  bottom: 200,
  width: 200,
  height: 100,
});
assert.equal(
  calculateShapeBounds(resizeShapePoints(rectangle, "e", { x: 900, y: 120 })).right,
  622,
);

const resizedCurve = scalePointsToBounds(
  [
    { x: 100, y: 100, type: "smooth", handleIn: null, handleOut: { x: 20, y: 10 } },
    { x: 200, y: 200, type: "smooth", handleIn: { x: -20, y: -10 }, handleOut: null },
  ],
  { left: 100, top: 100, right: 200, bottom: 200, width: 100, height: 100 },
  { left: 100, top: 100, right: 300, bottom: 150, width: 200, height: 50 },
);
assert.deepEqual(resizedCurve[0].handleOut, { x: 40, y: 5 });
assert.deepEqual(resizedCurve[1].handleIn, { x: -40, y: -5 });
const skewSquare = [
  { x: 0, y: 0, type: "corner", handleIn: null, handleOut: { x: 2, y: 0 } },
  { x: 10, y: 0, type: "corner", handleIn: null, handleOut: null },
  { x: 10, y: 10, type: "corner", handleIn: null, handleOut: null },
  { x: 0, y: 10, type: "corner", handleIn: null, handleOut: null },
];
assert.deepEqual(
  skewShapePoints(skewSquare, "n", { x: 2, y: 0 }).map(({ x, y }) => ({ x, y })),
  [
    { x: 2, y: 0 },
    { x: 12, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
);
assert.deepEqual(
  skewShapePoints(skewSquare, "n", { x: 2, y: 0 }, true).map(({ x, y }) => ({ x, y })),
  [
    { x: 2, y: 0 },
    { x: 12, y: 0 },
    { x: 8, y: 10 },
    { x: -2, y: 10 },
  ],
);
const verticallySkewedSquare = skewShapePoints(skewSquare, "e", { x: 0, y: 3 });
assert.deepEqual(
  verticallySkewedSquare.map(({ x, y }) => ({ x, y })),
  [
    { x: 0, y: 0 },
    { x: 10, y: 3 },
    { x: 10, y: 13 },
    { x: 0, y: 10 },
  ],
);
assert.deepEqual(verticallySkewedSquare[0].handleOut, { x: 2, y: 0.6 });
assert.deepEqual(
  rectangle.map(({ x, y }) => ({ x, y })),
  [
    { x: 100, y: 100 },
    { x: 180, y: 100 },
    { x: 180, y: 140 },
    { x: 100, y: 140 },
  ],
);
const square = createRectanglePoints({ x: 100, y: 100 }, { x: 180, y: 140 }, true);
assert.deepEqual(
  square.map(({ x, y }) => ({ x, y })),
  [
    { x: 100, y: 100 },
    { x: 180, y: 100 },
    { x: 180, y: 180 },
    { x: 100, y: 180 },
  ],
);
const reverseSquare = createRectanglePoints({ x: 300, y: 300 }, { x: 260, y: 210 }, true);
assert.deepEqual(
  reverseSquare.map(({ x, y }) => ({ x, y })),
  [
    { x: 300, y: 300 },
    { x: 210, y: 300 },
    { x: 210, y: 210 },
    { x: 300, y: 210 },
  ],
);
const boundedSquare = createRectanglePoints({ x: 600, y: 380 }, { x: 700, y: 500 }, true);
assert.deepEqual(
  boundedSquare.map(({ x, y }) => ({ x, y })),
  [
    { x: 600, y: 380 },
    { x: 622, y: 380 },
    { x: 622, y: 402 },
    { x: 600, y: 402 },
  ],
);
assert.equal(
  (
    createDocumentSvg([
      { points, color: "#a329d6" },
      { points: rectangle, color: "#12b5a6" },
    ]).match(/<path /g) ?? []
  ).length,
  2,
);
assert.match(
  createDocumentSvg([{ points, color: "#a329d6" }]),
  /fill="#a329d6"/,
);
const layeredSvgPaths = createDocumentSvg([
  { points: rectangle, layer: 1, color: "#ff0000" },
  { points, layer: 5, color: "#0000ff" },
]).match(/  <path[^\n]+/g);
assert.match(layeredSvgPaths[0], /fill="#0000ff"/);
assert.match(layeredSvgPaths[1], /fill="#ff0000"/);
const gradientSvg = createDocumentSvg([
  { points, fill: { type: "horizontal", colors: ["#052d5c", "#12b5a6"] } },
  { points: rectangle, fill: { type: "vertical", colors: ["#a329d6", "#ffcc00"] } },
  { points, fill: { type: "radial", colors: ["#ffffff", "#052d5c"] } },
]);
assert.equal((gradientSvg.match(/<linearGradient/g) ?? []).length, 2);
assert.equal((gradientSvg.match(/<radialGradient/g) ?? []).length, 1);
assert.match(gradientSvg, /x1="0%" y1="0%" x2="100%" y2="0%"/);
assert.match(gradientSvg, /x1="0%" y1="0%" x2="0%" y2="100%"/);
assert.match(gradientSvg, /<radialGradient id="shapeFill2" cx="50%" cy="50%" r="70%">/);
assert.match(gradientSvg, /fill="url\(#shapeFill0\)"/);
assert.match(gradientSvg, /stop-color="#12b5a6"/);

const outlinedSvg = createDocumentSvg([
  {
    points: rectangle,
    fill: { type: "solid", colors: ["#052d5c", "#ffffff"] },
    outline: { type: "horizontal", colors: ["#ffffff", "#a329d6"] },
    outlineWidth: 12.5,
  },
]);
assert.match(outlinedSvg, /<linearGradient id="shapeOutline0"/);
assert.match(outlinedSvg, /stroke="url\(#shapeOutline0\)"/);
assert.match(outlinedSvg, /stroke-width="12.5"/);

const lineSvg = createDocumentSvg([
  {
    points: line,
    closed: false,
    fillEnabled: false,
    outline: { type: "solid", colors: ["#ffffff", "#a329d6"] },
    outlineWidth: 4,
  },
]);
assert.match(lineSvg, /d="M 18 20 L 100 70" fill="none"/);
assert.doesNotMatch(lineSvg, /L 100 70 Z/);

assert.deepEqual(createZoomViewBox(1), { x: 0, y: 0, width: 640, height: 420 });
assert.deepEqual(createZoomViewBox(2), { x: 160, y: 105, width: 320, height: 210 });
assert.deepEqual(createZoomViewBox(0.5), { x: -320, y: -210, width: 1280, height: 840 });
assert.deepEqual(createZoomViewBox(2, 640, 420, 400, 300), {
  x: 240,
  y: 195,
  width: 320,
  height: 210,
});
assert.deepEqual(
  calculateWheelPan(
    0,
    100,
    0,
    createZoomViewBox(2),
    { width: 640, height: 420 },
  ),
  { x: 0, y: 50 },
);
assert.deepEqual(
  calculateWheelPan(
    0,
    25,
    0,
    createZoomViewBox(1),
    { width: 640, height: 420 },
    true,
  ),
  { x: 25, y: 0 },
);
assert.deepEqual(
  calculateWheelPan(
    0,
    1,
    1,
    createZoomViewBox(1),
    { width: 640, height: 420 },
  ),
  { x: 0, y: 16 },
);
assert.deepEqual(
  calculateWheelPan(
    0,
    50,
    1,
    createZoomViewBox(1),
    { width: 640, height: 420 },
  ),
  { x: 0, y: 120 },
);
assert.deepEqual(
  constrainTranslation(
    [
      { x: 20, y: 30 },
      { x: 600, y: 390 },
    ],
    -50,
    40,
  ),
  { x: -2, y: 12 },
);

console.log("Node editor tests passed");

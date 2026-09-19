const assert = require("node:assert/strict");
const {
  INITIAL_POINTS,
  clonePoints,
  closestPointOnSegment,
  closestTOnCubic,
  createArtworkSvg,
  createPathData,
  cubicPointAt,
  findClosestSegment,
  midpoint,
  setPointType,
  splitSegment,
} = require("../app.js");

const points = clonePoints(INITIAL_POINTS);

assert.equal(points.length, 7);
assert.notEqual(points, INITIAL_POINTS);
assert.notEqual(points[0], INITIAL_POINTS[0]);
assert.notEqual(points[0].handleIn, INITIAL_POINTS[0].handleIn);
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
  type: "smooth",
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
assert.equal((svg.match(/<stop /g) ?? []).length, 4);

console.log("Node editor tests passed");

const assert = require("node:assert/strict");
const {
  INITIAL_POINTS,
  clonePoints,
  closestPointOnSegment,
  createArtworkSvg,
  createPathData,
  findClosestSegment,
  midpoint,
} = require("../app.js");

const points = clonePoints(INITIAL_POINTS);

assert.equal(points.length, 7);
assert.notEqual(points, INITIAL_POINTS);
assert.notEqual(points[0], INITIAL_POINTS[0]);
assert.equal(
  createPathData([
    { x: 10, y: 20 },
    { x: 30, y: 40 },
    { x: 50, y: 60 },
  ]),
  "M 10 20 L 30 40 L 50 60 Z",
);
assert.deepEqual(midpoint({ x: 10, y: 20 }, { x: 15, y: 31 }), { x: 13, y: 26 });
assert.deepEqual(
  closestPointOnSegment({ x: 30, y: 10 }, { x: 0, y: 0 }, { x: 100, y: 0 }),
  { x: 30, y: 0, distanceSquared: 100 },
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
  { x: 100, y: 42, distanceSquared: 16, segmentIndex: 1 },
);

const svg = createArtworkSvg(points);

assert.match(svg, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(svg, /<title id="title">Node-edited vector shape<\/title>/);
assert.match(svg, /vector-effect="non-scaling-stroke"/);
assert.match(svg, new RegExp(`d="${createPathData(points)}"`));
assert.equal((svg.match(/<stop /g) ?? []).length, 4);

console.log("Node editor tests passed");

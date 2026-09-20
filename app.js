const INITIAL_POINTS = Object.freeze([
  {
    x: 170,
    y: 310,
    type: "smooth",
    handleIn: { x: 42, y: 38 },
    handleOut: { x: -42, y: -38 },
  },
  { x: 135, y: 205, type: "corner", handleIn: null, handleOut: null },
  { x: 225, y: 120, type: "corner", handleIn: null, handleOut: null },
  { x: 360, y: 105, type: "corner", handleIn: null, handleOut: null },
  { x: 495, y: 195, type: "corner", handleIn: null, handleOut: null },
  { x: 455, y: 325, type: "corner", handleIn: null, handleOut: null },
  { x: 300, y: 355, type: "corner", handleIn: null, handleOut: null },
]);

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 420;
const DEFAULT_FILL_COLOR = "#052d5c";
const FILL_TYPES = Object.freeze(["solid", "horizontal", "vertical", "radial"]);
const ZOOM_LEVELS = Object.freeze([0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3, 4]);

function clonePoints(points) {
  return points.map((point) => ({
    x: point.x,
    y: point.y,
    type: point.type ?? "corner",
    handleIn: point.handleIn ? { ...point.handleIn } : null,
    handleOut: point.handleOut ? { ...point.handleOut } : null,
  }));
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundValue(value) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function normalizeHexColor(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[0-9a-f]{6}$/i.test(withHash) ? withHash.toLowerCase() : null;
}

function hexToHsb(value) {
  const hex = normalizeHexColor(value) ?? DEFAULT_FILL_COLOR;
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;

  if (delta > 0) {
    if (maximum === red) hue = ((green - blue) / delta) % 6;
    else if (maximum === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    color: hue / 3.6,
    saturation: maximum === 0 ? 0 : (delta / maximum) * 100,
    brightness: maximum * 100,
  };
}

function hsbToHex(color, saturation, brightness) {
  const hue = ((clamp(Number(color) || 0, 0, 100) % 100) / 100) * 360;
  const normalizedSaturation = clamp(Number(saturation) || 0, 0, 100) / 100;
  const normalizedBrightness = clamp(Number(brightness) || 0, 0, 100) / 100;
  const chroma = normalizedBrightness * normalizedSaturation;
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = normalizedBrightness - chroma;
  let channels;

  if (hue < 60) channels = [chroma, secondary, 0];
  else if (hue < 120) channels = [secondary, chroma, 0];
  else if (hue < 180) channels = [0, chroma, secondary];
  else if (hue < 240) channels = [0, secondary, chroma];
  else if (hue < 300) channels = [secondary, 0, chroma];
  else channels = [chroma, 0, secondary];

  return `#${channels
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function createGradientEndColor(color) {
  const hsb = hexToHsb(color);
  return hsbToHex(
    hsb.color,
    Math.max(0, hsb.saturation - 12),
    Math.min(100, hsb.brightness + 35),
  );
}

function normalizeFill(fill, legacyColor) {
  const type = FILL_TYPES.includes(fill?.type) ? fill.type : "solid";
  const primary =
    normalizeHexColor(fill?.colors?.[0] ?? fill?.color ?? legacyColor) ?? DEFAULT_FILL_COLOR;
  const secondary =
    normalizeHexColor(fill?.colors?.[1]) ?? createGradientEndColor(primary);
  return { type, colors: [primary, secondary] };
}

function cloneFill(fill) {
  const normalized = normalizeFill(fill);
  return { type: normalized.type, colors: [...normalized.colors] };
}

function fillPaintValue(fill, gradientId) {
  const normalized = normalizeFill(fill);
  return normalized.type === "solid" ? normalized.colors[0] : `url(#${gradientId})`;
}

function fillCssBackground(fill) {
  const normalized = normalizeFill(fill);
  const [start, end] = normalized.colors;
  const backgrounds = {
    solid: start,
    horizontal: `linear-gradient(90deg, ${start}, ${end})`,
    vertical: `linear-gradient(180deg, ${start}, ${end})`,
    radial: `radial-gradient(circle, ${start}, ${end})`,
  };
  return backgrounds[normalized.type];
}

function createGradientMarkup(fill, gradientId, indent = "    ") {
  const normalized = normalizeFill(fill);
  if (normalized.type === "solid") return "";
  const [start, end] = normalized.colors;

  if (normalized.type === "radial") {
    return `${indent}<radialGradient id="${gradientId}" cx="50%" cy="50%" r="70%">
${indent}  <stop offset="0" stop-color="${start}"/>
${indent}  <stop offset="1" stop-color="${end}"/>
${indent}</radialGradient>`;
  }

  const coordinates =
    normalized.type === "vertical"
      ? 'x1="0%" y1="0%" x2="0%" y2="100%"'
      : 'x1="0%" y1="0%" x2="100%" y2="0%"';
  return `${indent}<linearGradient id="${gradientId}" ${coordinates}>
${indent}  <stop offset="0" stop-color="${start}"/>
${indent}  <stop offset="1" stop-color="${end}"/>
${indent}</linearGradient>`;
}

function midpoint(first, second) {
  return {
    x: Math.round((first.x + second.x) / 2),
    y: Math.round((first.y + second.y) / 2),
  };
}

function distance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function lerpPoint(first, second, amount) {
  return {
    x: first.x + (second.x - first.x) * amount,
    y: first.y + (second.y - first.y) * amount,
  };
}

function formatNumber(value) {
  return String(Number(roundValue(value)));
}

function createZoomViewBox(
  zoom,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
  centerX = width / 2,
  centerY = height / 2,
) {
  const safeZoom = Math.max(zoom, Number.EPSILON);
  const viewWidth = width / safeZoom;
  const viewHeight = height / safeZoom;

  return {
    x: centerX - viewWidth / 2,
    y: centerY - viewHeight / 2,
    width: viewWidth,
    height: viewHeight,
  };
}

function constrainTranslation(
  pointPositions,
  requestedX,
  requestedY,
  bounds = { left: 18, top: 18, right: 622, bottom: 402 },
) {
  const minimumX = Math.min(...pointPositions.map((point) => point.x));
  const maximumX = Math.max(...pointPositions.map((point) => point.x));
  const minimumY = Math.min(...pointPositions.map((point) => point.y));
  const maximumY = Math.max(...pointPositions.map((point) => point.y));

  return {
    x: clamp(requestedX, bounds.left - minimumX, bounds.right - maximumX),
    y: clamp(requestedY, bounds.top - minimumY, bounds.bottom - maximumY),
  };
}

function calculateShapeBounds(points) {
  if (!points.length) return null;
  const positions = [];

  points.forEach((point) => {
    positions.push({ x: point.x, y: point.y });
    [point.handleIn, point.handleOut].forEach((handle) => {
      if (handle) positions.push({ x: point.x + handle.x, y: point.y + handle.y });
    });
  });

  const left = Math.min(...positions.map((point) => point.x));
  const right = Math.max(...positions.map((point) => point.x));
  const top = Math.min(...positions.map((point) => point.y));
  const bottom = Math.max(...positions.map((point) => point.y));
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function scalePointsToBounds(points, sourceBounds, targetBounds) {
  const scaleX = sourceBounds.width > 0 ? targetBounds.width / sourceBounds.width : 1;
  const scaleY = sourceBounds.height > 0 ? targetBounds.height / sourceBounds.height : 1;

  return points.map((point) => ({
    ...point,
    x: roundValue(targetBounds.left + (point.x - sourceBounds.left) * scaleX),
    y: roundValue(targetBounds.top + (point.y - sourceBounds.top) * scaleY),
    handleIn: point.handleIn
      ? {
          x: roundValue(point.handleIn.x * scaleX),
          y: roundValue(point.handleIn.y * scaleY),
        }
      : null,
    handleOut: point.handleOut
      ? {
          x: roundValue(point.handleOut.x * scaleX),
          y: roundValue(point.handleOut.y * scaleY),
        }
      : null,
  }));
}

function resizeShapePoints(
  points,
  handle,
  pointer,
  bounds = { left: 18, top: 18, right: 622, bottom: 402 },
  minimumSize = 12,
) {
  const source = calculateShapeBounds(points);
  if (!source) return [];
  const target = { ...source };

  if (handle.includes("w")) {
    target.left = clamp(pointer.x, bounds.left, source.right - minimumSize);
  }
  if (handle.includes("e")) {
    target.right = clamp(pointer.x, source.left + minimumSize, bounds.right);
  }
  if (handle.includes("n")) {
    target.top = clamp(pointer.y, bounds.top, source.bottom - minimumSize);
  }
  if (handle.includes("s")) {
    target.bottom = clamp(pointer.y, source.top + minimumSize, bounds.bottom);
  }

  target.width = target.right - target.left;
  target.height = target.bottom - target.top;
  return scalePointsToBounds(points, source, target);
}

function createRectanglePoints(
  start,
  end,
  perfectSquare = false,
  bounds = { left: 18, top: 18, right: 622, bottom: 402 },
) {
  const startX = clamp(start.x, bounds.left, bounds.right);
  const startY = clamp(start.y, bounds.top, bounds.bottom);
  let endX = clamp(end.x, bounds.left, bounds.right);
  let endY = clamp(end.y, bounds.top, bounds.bottom);

  if (perfectSquare) {
    const directionX = endX < startX ? -1 : 1;
    const directionY = endY < startY ? -1 : 1;
    const requestedSize = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
    const availableWidth = directionX > 0 ? bounds.right - startX : startX - bounds.left;
    const availableHeight = directionY > 0 ? bounds.bottom - startY : startY - bounds.top;
    const size = Math.min(requestedSize, availableWidth, availableHeight);
    endX = startX + directionX * size;
    endY = startY + directionY * size;
  }

  return [
    { x: roundValue(startX), y: roundValue(startY), type: "corner", handleIn: null, handleOut: null },
    { x: roundValue(endX), y: roundValue(startY), type: "corner", handleIn: null, handleOut: null },
    { x: roundValue(endX), y: roundValue(endY), type: "corner", handleIn: null, handleOut: null },
    { x: roundValue(startX), y: roundValue(endY), type: "corner", handleIn: null, handleOut: null },
  ];
}

function absoluteHandle(point, handleName) {
  const handle = point[handleName];
  return handle
    ? { x: point.x + handle.x, y: point.y + handle.y }
    : { x: point.x, y: point.y };
}

function isCurvedSegment(segmentStart, segmentEnd) {
  return Boolean(segmentStart.handleOut || segmentEnd.handleIn);
}

function segmentGeometry(points, segmentIndex) {
  const start = points[segmentIndex];
  const end = points[(segmentIndex + 1) % points.length];

  return {
    start,
    controlStart: absoluteHandle(start, "handleOut"),
    controlEnd: absoluteHandle(end, "handleIn"),
    end,
    curved: isCurvedSegment(start, end),
  };
}

function createSegmentCommand(segmentStart, segmentEnd) {
  if (!isCurvedSegment(segmentStart, segmentEnd)) {
    return `L ${formatNumber(segmentEnd.x)} ${formatNumber(segmentEnd.y)}`;
  }

  const controlStart = absoluteHandle(segmentStart, "handleOut");
  const controlEnd = absoluteHandle(segmentEnd, "handleIn");
  return [
    "C",
    formatNumber(controlStart.x),
    formatNumber(controlStart.y),
    formatNumber(controlEnd.x),
    formatNumber(controlEnd.y),
    formatNumber(segmentEnd.x),
    formatNumber(segmentEnd.y),
  ].join(" ");
}

function createSegmentPathData(points, segmentIndex) {
  const start = points[segmentIndex];
  const end = points[(segmentIndex + 1) % points.length];
  return `M ${formatNumber(start.x)} ${formatNumber(start.y)} ${createSegmentCommand(start, end)}`;
}

function createPathData(points, closed = true) {
  if (points.length === 0) return "";

  const commands = [`M ${formatNumber(points[0].x)} ${formatNumber(points[0].y)}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    commands.push(createSegmentCommand(points[index], points[index + 1]));
  }

  if (closed) {
    const lastPoint = points.at(-1);
    const firstPoint = points[0];
    if (isCurvedSegment(lastPoint, firstPoint)) {
      commands.push(createSegmentCommand(lastPoint, firstPoint));
    }
    commands.push("Z");
  }

  return commands.join(" ");
}

function closestPointOnSegment(point, segmentStart, segmentEnd) {
  const deltaX = segmentEnd.x - segmentStart.x;
  const deltaY = segmentEnd.y - segmentStart.y;
  const lengthSquared = deltaX ** 2 + deltaY ** 2;
  const position = lengthSquared === 0
    ? 0
    : clamp(
        ((point.x - segmentStart.x) * deltaX + (point.y - segmentStart.y) * deltaY) / lengthSquared,
        0,
        1,
      );
  const x = segmentStart.x + position * deltaX;
  const y = segmentStart.y + position * deltaY;

  return {
    x: Math.round(x),
    y: Math.round(y),
    position,
    distanceSquared: (point.x - x) ** 2 + (point.y - y) ** 2,
  };
}

function findClosestSegment(points, point) {
  if (points.length < 2) return null;

  let closest = null;

  points.forEach((segmentStart, segmentIndex) => {
    const segmentEnd = points[(segmentIndex + 1) % points.length];
    const candidate = closestPointOnSegment(point, segmentStart, segmentEnd);

    if (!closest || candidate.distanceSquared < closest.distanceSquared) {
      closest = { ...candidate, segmentIndex };
    }
  });

  return closest;
}

function cubicPointAt(start, controlStart, controlEnd, end, amount) {
  const inverse = 1 - amount;
  return {
    x:
      inverse ** 3 * start.x
      + 3 * inverse ** 2 * amount * controlStart.x
      + 3 * inverse * amount ** 2 * controlEnd.x
      + amount ** 3 * end.x,
    y:
      inverse ** 3 * start.y
      + 3 * inverse ** 2 * amount * controlStart.y
      + 3 * inverse * amount ** 2 * controlEnd.y
      + amount ** 3 * end.y,
  };
}

function closestTOnCubic(point, start, controlStart, controlEnd, end) {
  const samples = 48;
  let bestAmount = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index <= samples; index += 1) {
    const amount = index / samples;
    const candidate = cubicPointAt(start, controlStart, controlEnd, end, amount);
    const candidateDistance = (point.x - candidate.x) ** 2 + (point.y - candidate.y) ** 2;
    if (candidateDistance < bestDistance) {
      bestAmount = amount;
      bestDistance = candidateDistance;
    }
  }

  let lower = Math.max(0, bestAmount - 1 / samples);
  let upper = Math.min(1, bestAmount + 1 / samples);

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const first = lower + (upper - lower) / 3;
    const second = upper - (upper - lower) / 3;
    const firstPoint = cubicPointAt(start, controlStart, controlEnd, end, first);
    const secondPoint = cubicPointAt(start, controlStart, controlEnd, end, second);
    const firstDistance = (point.x - firstPoint.x) ** 2 + (point.y - firstPoint.y) ** 2;
    const secondDistance = (point.x - secondPoint.x) ** 2 + (point.y - secondPoint.y) ** 2;

    if (firstDistance < secondDistance) upper = second;
    else lower = first;
  }

  return (lower + upper) / 2;
}

function splitSegment(points, segmentIndex, amount) {
  const geometry = segmentGeometry(points, segmentIndex);
  const insertAt = segmentIndex + 1;

  if (!geometry.curved) {
    const position = lerpPoint(geometry.start, geometry.end, amount);
    points.splice(insertAt, 0, {
      x: roundValue(position.x),
      y: roundValue(position.y),
      type: "corner",
      handleIn: null,
      handleOut: null,
    });
    return insertAt;
  }

  const firstLevelStart = lerpPoint(geometry.start, geometry.controlStart, amount);
  const firstLevelMiddle = lerpPoint(geometry.controlStart, geometry.controlEnd, amount);
  const firstLevelEnd = lerpPoint(geometry.controlEnd, geometry.end, amount);
  const secondLevelStart = lerpPoint(firstLevelStart, firstLevelMiddle, amount);
  const secondLevelEnd = lerpPoint(firstLevelMiddle, firstLevelEnd, amount);
  const splitPoint = lerpPoint(secondLevelStart, secondLevelEnd, amount);
  const roundedSplit = { x: roundValue(splitPoint.x), y: roundValue(splitPoint.y) };

  if (geometry.start.handleOut) {
    geometry.start.handleOut = {
      x: roundValue(firstLevelStart.x - geometry.start.x),
      y: roundValue(firstLevelStart.y - geometry.start.y),
    };
  }
  if (geometry.end.handleIn) {
    geometry.end.handleIn = {
      x: roundValue(firstLevelEnd.x - geometry.end.x),
      y: roundValue(firstLevelEnd.y - geometry.end.y),
    };
  }

  points.splice(insertAt, 0, {
    ...roundedSplit,
    type: "asymmetric",
    handleIn: {
      x: roundValue(secondLevelStart.x - roundedSplit.x),
      y: roundValue(secondLevelStart.y - roundedSplit.y),
    },
    handleOut: {
      x: roundValue(secondLevelEnd.x - roundedSplit.x),
      y: roundValue(secondLevelEnd.y - roundedSplit.y),
    },
  });

  return insertAt;
}

function setPointType(points, index, type) {
  const point = points[index];

  if (type === "corner") {
    point.type = "corner";
    point.handleIn = null;
    point.handleOut = null;
    return;
  }

  if (!point.handleIn || !point.handleOut) {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const tangentLength = Math.hypot(tangentX, tangentY) || 1;
    const handleLength = Math.max(24, Math.min(distance(previous, point), distance(point, next)) * 0.34);
    const handleX = roundValue((tangentX / tangentLength) * handleLength);
    const handleY = roundValue((tangentY / tangentLength) * handleLength);
    point.handleIn = { x: -handleX, y: -handleY };
    point.handleOut = { x: handleX, y: handleY };
  }

  if (type === "smooth") {
    const incomingLength = Math.hypot(point.handleIn.x, point.handleIn.y);
    const outgoingLength = Math.hypot(point.handleOut.x, point.handleOut.y);
    const handleLength = (incomingLength + outgoingLength) / 2 || 24;
    const source = outgoingLength > 0
      ? point.handleOut
      : { x: -point.handleIn.x, y: -point.handleIn.y };
    const sourceLength = Math.hypot(source.x, source.y) || 1;
    const handleX = roundValue((source.x / sourceLength) * handleLength);
    const handleY = roundValue((source.y / sourceLength) * handleLength);
    point.handleIn = { x: -handleX, y: -handleY };
    point.handleOut = { x: handleX, y: handleY };
  }

  point.type = type;
}

function updatePointHandle(point, handleName, nextHandle) {
  const handle = {
    x: roundValue(nextHandle.x),
    y: roundValue(nextHandle.y),
  };
  const oppositeName = handleName === "handleIn" ? "handleOut" : "handleIn";
  point[handleName] = handle;

  if (point.type === "smooth") {
    point[oppositeName] = { x: -handle.x, y: -handle.y };
    return;
  }

  if (point.type === "asymmetric") {
    const handleLength = Math.hypot(handle.x, handle.y);
    const opposite = point[oppositeName] ?? { x: -handle.x, y: -handle.y };
    const oppositeLength = Math.hypot(opposite.x, opposite.y) || handleLength;

    if (handleLength > 0) {
      point[oppositeName] = {
        x: roundValue((-handle.x / handleLength) * oppositeLength),
        y: roundValue((-handle.y / handleLength) * oppositeLength),
      };
    }
  }
}

function createDocumentSvg(shapes) {
  const normalizedShapes = shapes.map((shape) => ({
    ...shape,
    fill: normalizeFill(shape.fill, shape.color),
  }));
  const definitions = normalizedShapes
    .map((shape, index) => createGradientMarkup(shape.fill, `shapeFill${index}`))
    .filter(Boolean)
    .join("\n");
  const paths = normalizedShapes
    .map(
      (shape, index) =>
        `  <path d="${createPathData(shape.points)}" fill="${fillPaintValue(shape.fill, `shapeFill${index}`)}" stroke="#263651" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`,
    )
    .join("\n");
  const defs = definitions ? `  <defs>\n${definitions}\n  </defs>\n` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420" role="img" aria-labelledby="title description">
  <title id="title">Node-edited vector shape</title>
  <desc id="description">A closed vector path created in Vector Editor.</desc>
${defs}${paths}
</svg>`;
}

function createArtworkSvg(points) {
  return createDocumentSvg([{ points, fill: normalizeFill() }]);
}

function initializeEditor() {
  const editorLayout = document.querySelector(".editor-layout");
  const inspector = document.querySelector(".inspector");
  const svg = document.querySelector("#editor-canvas");
  const shapePaintDefs = document.querySelector("#shape-paint-defs");
  const shapeLayer = document.querySelector("#shape-layer");
  const draftLayer = document.querySelector("#draft-layer");
  const segmentHitLayer = document.querySelector("#segment-hit-layer");
  const handleLayer = document.querySelector("#handle-layer");
  const nodeLayer = document.querySelector("#node-layer");
  const transformLayer = document.querySelector("#transform-layer");
  const nodeList = document.querySelector("#node-list");
  const nodeXInput = document.querySelector("#node-x");
  const nodeYInput = document.querySelector("#node-y");
  const cornerButton = document.querySelector("#node-type-corner");
  const curveButton = document.querySelector("#node-type-curve");
  const unevenButton = document.querySelector("#node-type-uneven");
  const pointerToolButton = document.querySelector("#tool-pointer");
  const nodeToolButton = document.querySelector("#tool-node");
  const rectangleToolButton = document.querySelector("#tool-rectangle");
  const addNodeButton = document.querySelector("#tool-add-node");
  const deselectButton = document.querySelector("#deselect-nodes");
  const deleteButton = document.querySelector("#delete-node");
  const nodeActions = document.querySelector(".node-actions");
  const toolName = document.querySelector("#tool-name");
  const toolDescription = document.querySelector("#tool-description");
  const toolStatus = document.querySelector("#tool-status");
  const selectionPill = document.querySelector("#selection-pill");
  const nodeCount = document.querySelector("#node-count");
  const nodeSummary = document.querySelector("#node-summary");
  const zoomOutButton = document.querySelector("#zoom-out");
  const zoomResetButton = document.querySelector("#zoom-reset");
  const zoomInButton = document.querySelector("#zoom-in");
  const zoomLabel = document.querySelector("#zoom-label");
  const toast = document.querySelector("#toast");
  const canvasHint = document.querySelector("#canvas-hint");
  const canvasHintText = document.querySelector("#canvas-hint-text");
  const objectList = document.querySelector("#object-list");
  const objectCount = document.querySelector("#object-count");
  const colorControl = document.querySelector("#color-control");
  const fillColorButton = document.querySelector("#fill-color-button");
  const fillColorSwatch = document.querySelector("#fill-color-swatch");
  const colorPopover = document.querySelector("#color-popover");
  const colorPreview = document.querySelector("#color-preview");
  const colorSlider = document.querySelector("#color-slider");
  const saturationSlider = document.querySelector("#saturation-slider");
  const brightnessSlider = document.querySelector("#brightness-slider");
  const colorValue = document.querySelector("#color-value");
  const saturationValue = document.querySelector("#saturation-value");
  const brightnessValue = document.querySelector("#brightness-value");
  const hexColorInput = document.querySelector("#hex-color-input");
  const fillTypeButtons = [...document.querySelectorAll("[data-fill-type]")];
  const gradientStops = document.querySelector("#gradient-stops");
  const gradientStopButtons = [...document.querySelectorAll("[data-gradient-stop]")];

  let shapes = [
    {
      id: 1,
      name: "Shape 1",
      kind: "path",
      fill: normalizeFill(),
      points: clonePoints(INITIAL_POINTS),
    },
  ];
  let activeShapeIndex = 0;
  let points = shapes[activeShapeIndex].points;
  let nextShapeId = 2;
  let selectedIndex = 0;
  let selectedIndices = new Set([0]);
  let activeTool = "node";
  let zoom = 1;
  let viewCenter = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
  let dragging = null;
  let draftRectangle = null;
  let currentFill = normalizeFill();
  let activeColorStop = 0;
  let objectSelected = false;
  let toastTimeout;

  function announce(message) {
    window.clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function selectNode(index, { focus = false, additive = false } = {}) {
    const nextIndex = clamp(index, 0, points.length - 1);

    if (additive) {
      if (selectedIndices.has(nextIndex) && selectedIndices.size > 1) {
        selectedIndices.delete(nextIndex);
        if (selectedIndex === nextIndex) selectedIndex = [...selectedIndices].at(-1);
      } else {
        selectedIndices.add(nextIndex);
        selectedIndex = nextIndex;
      }
    } else {
      selectedIndex = nextIndex;
      selectedIndices = new Set([nextIndex]);
    }

    render();

    if (focus) {
      nodeLayer.querySelector(`[data-node-index="${selectedIndex}"]`)?.focus();
    }
  }

  function deselectAllNodes({ announceChange = false } = {}) {
    const hadSelection = selectedIndices.size > 0;
    selectedIndices.clear();
    render();
    if (hadSelection && announceChange) announce("Node selection cleared");
  }

  function selectedIndexList() {
    return [...selectedIndices].sort((first, second) => first - second);
  }

  function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    return element;
  }

  function createGradientElement(fill, id) {
    const normalized = normalizeFill(fill);
    if (normalized.type === "solid") return null;
    const attributes =
      normalized.type === "radial"
        ? { id, cx: "50%", cy: "50%", r: "70%" }
        : normalized.type === "vertical"
          ? { id, x1: "0%", y1: "0%", x2: "0%", y2: "100%" }
          : { id, x1: "0%", y1: "0%", x2: "100%", y2: "0%" };
    const gradient = createSvgElement(
      normalized.type === "radial" ? "radialGradient" : "linearGradient",
      attributes,
    );
    gradient.append(
      createSvgElement("stop", { offset: "0", "stop-color": normalized.colors[0] }),
      createSvgElement("stop", { offset: "1", "stop-color": normalized.colors[1] }),
    );
    return gradient;
  }

  function renderPaintDefinitions() {
    shapePaintDefs.replaceChildren();
    shapes.forEach((shape, index) => {
      const gradient = createGradientElement(shape.fill, `shape-fill-${index}`);
      if (gradient) shapePaintDefs.append(gradient);
    });
    if (draftRectangle) {
      const draftGradient = createGradientElement(currentFill, "draft-fill");
      if (draftGradient) shapePaintDefs.append(draftGradient);
    }
  }

  function selectShape(index, { selectAll = true } = {}) {
    if (!shapes.length) return;
    activeShapeIndex = clamp(index, 0, shapes.length - 1);
    points = shapes[activeShapeIndex].points;
    objectSelected = true;
    selectedIndex = 0;
    selectedIndices = selectAll
      ? new Set(points.map((_, pointIndex) => pointIndex))
      : new Set([0]);
    render();
  }

  function renderShapes() {
    shapeLayer.replaceChildren();

    shapes.forEach((shape, index) => {
      const isActive =
        index === activeShapeIndex && (activeTool !== "pointer" || objectSelected);
      const path = createSvgElement("path", {
        class: `shape-path${isActive ? " is-active" : ""}`,
        d: createPathData(shape.points),
        fill: fillPaintValue(shape.fill, `shape-fill-${index}`),
        "data-shape-index": String(index),
        filter: isActive ? "url(#shape-shadow)" : "none",
        "aria-label": shape.name,
      });
      if (index === activeShapeIndex) path.id = "shape-path";
      shapeLayer.append(path);
    });
  }

  function renderDraftShape() {
    draftLayer.replaceChildren();
    if (!draftRectangle) return;

    draftLayer.append(
      createSvgElement("path", {
        class: "draft-shape",
        d: createPathData(draftRectangle.points),
        fill: fillPaintValue(currentFill, "draft-fill"),
      }),
    );
  }

  function renderObjectList() {
    objectList.replaceChildren();
    objectCount.textContent = String(shapes.length);

    shapes.forEach((shape, index) => {
      const isActive =
        index === activeShapeIndex && (activeTool !== "pointer" || objectSelected);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `object-card${isActive ? " is-active" : ""}`;
      button.setAttribute(
        "aria-label",
        `${shape.name}${isActive ? " selected" : ""}`,
      );

      const preview = document.createElement("span");
      preview.className = "object-preview";
      preview.setAttribute("aria-hidden", "true");
      const previewSvg = createSvgElement("svg", { viewBox: "0 0 640 420" });
      const previewGradientId = `object-preview-fill-${shape.id}`;
      const previewGradient = createGradientElement(shape.fill, previewGradientId);
      if (previewGradient) {
        const previewDefs = createSvgElement("defs");
        previewDefs.append(previewGradient);
        previewSvg.append(previewDefs);
      }
      previewSvg.append(
        createSvgElement("path", {
          d: createPathData(shape.points),
          fill: fillPaintValue(shape.fill, previewGradientId),
        }),
      );
      preview.append(previewSvg);

      const name = document.createElement("span");
      name.className = "object-name";
      name.textContent = shape.name;
      const meta = document.createElement("span");
      meta.className = "object-meta";
      meta.textContent = shape.kind === "rectangle" ? "Rectangle" : "Vector path";
      button.append(preview, name, meta);
      button.addEventListener("click", () => selectShape(index));
      objectList.append(button);
    });
  }

  function updateColorControls() {
    const shape = shapes[activeShapeIndex] ?? null;
    const shouldEditShape = shape && (activeTool !== "pointer" || objectSelected);
    const fill = shouldEditShape
      ? normalizeFill(shape.fill, shape.color)
      : cloneFill(currentFill);
    if (shouldEditShape) shape.fill = fill;
    if (fill.type === "solid") activeColorStop = 0;
    const hex = fill.colors[activeColorStop];
    const hsb = hexToHsb(hex);
    const roundedColor = Math.round(hsb.color);
    const roundedSaturation = Math.round(hsb.saturation);
    const roundedBrightness = Math.round(hsb.brightness);

    colorSlider.value = String(roundedColor);
    saturationSlider.value = String(roundedSaturation);
    brightnessSlider.value = String(roundedBrightness);
    colorValue.textContent = String(roundedColor);
    saturationValue.textContent = String(roundedSaturation);
    brightnessValue.textContent = String(roundedBrightness);
    hexColorInput.value = hex;
    hexColorInput.setAttribute("aria-invalid", "false");
    const background = fillCssBackground(fill);
    fillColorSwatch.style.background = background;
    colorPreview.style.background = background;
    fillColorButton.title = `Change ${fill.type} fill`;
    fillTypeButtons.forEach((button) => {
      const isActive = button.dataset.fillType === fill.type;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    gradientStops.hidden = fill.type === "solid";
    gradientStopButtons.forEach((button, index) => {
      const isActive = index === activeColorStop;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
      button.querySelector(".gradient-stop-swatch").style.backgroundColor = fill.colors[index];
    });
    colorPopover.style.setProperty("--picker-hue-color", hsbToHex(hsb.color, 100, 100));
    colorPopover.style.setProperty(
      "--picker-bright-color",
      hsbToHex(hsb.color, hsb.saturation, 100),
    );
  }

  function setColorPopoverOpen(open) {
    colorPopover.hidden = !open;
    fillColorButton.setAttribute("aria-expanded", String(open));
  }

  function setFillType(type) {
    if (!FILL_TYPES.includes(type)) return;
    const shape = shapes[activeShapeIndex] ?? null;
    const shouldEditShape = shape && (activeTool !== "pointer" || objectSelected);
    const fill = shouldEditShape ? normalizeFill(shape.fill) : cloneFill(currentFill);
    fill.type = type;
    if (shouldEditShape) shape.fill = fill;
    currentFill = cloneFill(fill);
    if (type === "solid") activeColorStop = 0;
    render();
    const messages = {
      solid: "Solid fill selected",
      horizontal: "Left-to-right gradient selected",
      vertical: "Top-to-bottom gradient selected",
      radial: "Radial gradient selected",
    };
    announce(messages[type]);
  }

  function selectGradientStop(index) {
    activeColorStop = clamp(index, 0, 1);
    updateColorControls();
  }

  function applyColorToActiveStop(hex) {
    const shape = shapes[activeShapeIndex] ?? null;
    const shouldEditShape = shape && (activeTool !== "pointer" || objectSelected);
    const fill = shouldEditShape ? normalizeFill(shape.fill) : cloneFill(currentFill);
    fill.colors[activeColorStop] = hex;
    if (shouldEditShape) shape.fill = fill;
    currentFill = cloneFill(fill);
  }

  function applySliderColor() {
    const hex = hsbToHex(
      Number(colorSlider.value),
      Number(saturationSlider.value),
      Number(brightnessSlider.value),
    );
    applyColorToActiveStop(hex);
    render();
  }

  function applyHexColor() {
    const hex = normalizeHexColor(hexColorInput.value);
    hexColorInput.setAttribute("aria-invalid", String(!hex));
    if (!hex) return false;
    applyColorToActiveStop(hex);
    render();
    return true;
  }

  function renderSegmentHitTargets() {
    segmentHitLayer.replaceChildren();

    points.forEach((_, segmentIndex) => {
      const hitPath = createSvgElement("path", {
        class: "segment-hit",
        d: createSegmentPathData(points, segmentIndex),
        "data-segment-index": String(segmentIndex),
        "aria-label": `Add node on segment ${segmentIndex + 1}`,
      });
      segmentHitLayer.append(hitPath);
    });
  }

  function renderHandles() {
    handleLayer.replaceChildren();
    if (activeTool !== "node" || selectedIndices.size !== 1) return;
    const point = points[selectedIndex];
    if (point.type === "corner" || !point.handleIn || !point.handleOut) return;

    const handleIn = absoluteHandle(point, "handleIn");
    const handleOut = absoluteHandle(point, "handleOut");
    const guide = createSvgElement("path", {
      class: "handle-guide",
      d: `M ${formatNumber(handleIn.x)} ${formatNumber(handleIn.y)} L ${formatNumber(point.x)} ${formatNumber(point.y)} L ${formatNumber(handleOut.x)} ${formatNumber(handleOut.y)}`,
    });
    const incoming = createSvgElement("circle", {
      class: "control-handle",
      cx: formatNumber(handleIn.x),
      cy: formatNumber(handleIn.y),
      r: formatNumber(6 / zoom),
      "data-handle": "handleIn",
      "aria-label": "Incoming curve handle",
    });
    const outgoing = createSvgElement("circle", {
      class: "control-handle",
      cx: formatNumber(handleOut.x),
      cy: formatNumber(handleOut.y),
      r: formatNumber(6 / zoom),
      "data-handle": "handleOut",
      "aria-label": "Outgoing curve handle",
    });
    handleLayer.append(guide, incoming, outgoing);
  }

  function renderCanvasNodes() {
    nodeLayer.replaceChildren();

    points.forEach((point, index) => {
      const group = createSvgElement("g", {
        class: `node${selectedIndices.has(index) ? " is-selected" : ""}${selectedIndices.has(index) && index === selectedIndex ? " is-primary" : ""}${point.type !== "corner" ? " is-curve" : ""}`,
        "data-node-index": String(index),
        role: "button",
        tabindex: "0",
        "aria-label": `Node ${index + 1}, ${point.type}, x ${formatNumber(point.x)}, y ${formatNumber(point.y)}`,
        transform: `translate(${formatNumber(point.x)} ${formatNumber(point.y)}) scale(${formatNumber(1 / zoom)})`,
      });
      const circle = createSvgElement("circle", { class: "node-ring", r: "9" });
      const label = createSvgElement("text", { class: "node-number", y: "0.5" });
      label.textContent = String(index + 1);
      group.append(circle, label);
      nodeLayer.append(group);
    });
  }

  function renderTransformBox() {
    transformLayer.replaceChildren();
    if (activeTool !== "pointer" || !objectSelected || !points.length) return;
    const bounds = calculateShapeBounds(points);
    if (!bounds) return;

    transformLayer.append(
      createSvgElement("rect", {
        class: "transform-bounds",
        x: formatNumber(bounds.left),
        y: formatNumber(bounds.top),
        width: formatNumber(bounds.width),
        height: formatNumber(bounds.height),
      }),
    );

    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    const handles = [
      ["nw", bounds.left, bounds.top, "top-left corner"],
      ["n", centerX, bounds.top, "top edge"],
      ["ne", bounds.right, bounds.top, "top-right corner"],
      ["e", bounds.right, centerY, "right edge"],
      ["se", bounds.right, bounds.bottom, "bottom-right corner"],
      ["s", centerX, bounds.bottom, "bottom edge"],
      ["sw", bounds.left, bounds.bottom, "bottom-left corner"],
      ["w", bounds.left, centerY, "left edge"],
    ];

    handles.forEach(([handle, x, y, label]) => {
      const group = createSvgElement("g", {
        class: `transform-handle transform-handle-${handle}`,
        transform: `translate(${formatNumber(x)} ${formatNumber(y)}) scale(${formatNumber(1 / zoom)})`,
        "data-resize-handle": handle,
        "aria-label": `Resize from ${label}`,
      });
      group.append(
        createSvgElement("rect", {
          x: "-5",
          y: "-5",
          width: "10",
          height: "10",
          rx: "1.5",
        }),
      );
      transformLayer.append(group);
    });
  }

  function renderNodeList() {
    nodeList.replaceChildren();

    points.forEach((point, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = selectedIndices.has(index) ? "is-selected" : "";
      button.textContent = String(index + 1);
      button.title = `Node ${index + 1}: ${point.type}, ${formatNumber(point.x)}, ${formatNumber(point.y)}`;
      button.setAttribute("aria-label", `Select ${point.type} node ${index + 1}`);
      button.setAttribute("aria-pressed", String(selectedIndices.has(index)));
      button.addEventListener("click", (event) =>
        selectNode(index, { focus: true, additive: event.shiftKey }),
      );
      nodeList.append(button);
    });
  }

  function render() {
    const selectedPoint = points[selectedIndex];
    const selectedPoints = selectedIndexList().map((index) => points[index]);
    const hasSelection = selectedIndices.size > 0;
    const hasSingleSelection = selectedIndices.size === 1;
    const viewBox = createZoomViewBox(
      zoom,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      viewCenter.x,
      viewCenter.y,
    );
    svg.setAttribute(
      "viewBox",
      `${formatNumber(viewBox.x)} ${formatNumber(viewBox.y)} ${formatNumber(viewBox.width)} ${formatNumber(viewBox.height)}`,
    );
    renderPaintDefinitions();
    renderShapes();
    renderDraftShape();
    renderSegmentHitTargets();
    renderHandles();
    renderCanvasNodes();
    renderTransformBox();
    renderNodeList();
    renderObjectList();
    updateColorControls();
    nodeXInput.disabled = !hasSingleSelection;
    nodeYInput.disabled = !hasSingleSelection;
    nodeXInput.value = hasSingleSelection ? formatNumber(selectedPoint.x) : "";
    nodeYInput.value = hasSingleSelection ? formatNumber(selectedPoint.y) : "";
    nodeXInput.placeholder = hasSingleSelection ? "" : hasSelection ? "Multiple" : "None";
    nodeYInput.placeholder = hasSingleSelection ? "" : hasSelection ? "Multiple" : "None";
    selectionPill.textContent = !hasSelection
      ? "No nodes"
      : hasSingleSelection
        ? `Node ${selectedIndex + 1}`
        : `${selectedIndices.size} nodes`;
    nodeCount.textContent = String(points.length);
    const curvedCount = points.filter((point) => point.type !== "corner").length;
    nodeSummary.textContent = shapes.length
      ? `${points.length} nodes · ${curvedCount} curved · Closed path`
      : "No objects";
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    zoomOutButton.disabled = zoom === ZOOM_LEVELS[0];
    zoomInButton.disabled = zoom === ZOOM_LEVELS.at(-1);

    const isCorner = hasSelection && selectedPoints.every((point) => point.type === "corner");
    const isCurve = hasSelection && selectedPoints.every((point) => point.type === "smooth");
    const isUneven =
      hasSelection && selectedPoints.every((point) => point.type === "asymmetric");
    cornerButton.classList.toggle("is-active", isCorner);
    curveButton.classList.toggle("is-active", isCurve);
    unevenButton.classList.toggle("is-active", isUneven);
    cornerButton.setAttribute("aria-pressed", String(isCorner));
    curveButton.setAttribute("aria-pressed", String(isCurve));
    unevenButton.setAttribute("aria-pressed", String(isUneven));
    cornerButton.disabled = !hasSelection;
    curveButton.disabled = !hasSelection;
    unevenButton.disabled = !hasSelection;
    addNodeButton.disabled = !hasSelection || activeTool !== "node";
    deselectButton.disabled = !hasSelection;

    const isNodeTool = activeTool === "node";
    const isPointerTool = activeTool === "pointer";
    const isRectangleTool = activeTool === "rectangle";
    editorLayout.classList.toggle("pointer-mode", !isNodeTool);
    inspector.setAttribute("aria-hidden", String(!isNodeTool));
    nodeActions.hidden = isRectangleTool;
    nodeActions.setAttribute("aria-label", isPointerTool ? "Object actions" : "Node actions");
    deselectButton.hidden = !isNodeTool;
    deleteButton.disabled = isNodeTool
      ? !hasSelection
      : !isPointerTool || !objectSelected || !shapes.length;
    deleteButton.setAttribute(
      "aria-label",
      isPointerTool ? "Delete selected object" : "Delete selected nodes",
    );
    deleteButton.title = isPointerTool ? "Delete selected object" : "Delete selected nodes";
    svg.classList.toggle("tool-node", isNodeTool);
    svg.classList.toggle("tool-pointer", isPointerTool);
    svg.classList.toggle("tool-rectangle", isRectangleTool);
    svg.classList.toggle("is-dragging-canvas", dragging?.kind === "pan");
    pointerToolButton.classList.toggle("is-active", isPointerTool);
    nodeToolButton.classList.toggle("is-active", isNodeTool);
    rectangleToolButton.classList.toggle("is-active", isRectangleTool);
    pointerToolButton.setAttribute("aria-pressed", String(isPointerTool));
    nodeToolButton.setAttribute("aria-pressed", String(isNodeTool));
    rectangleToolButton.setAttribute("aria-pressed", String(isRectangleTool));
    pointerToolButton.setAttribute(
      "aria-label",
      isPointerTool ? "Pointer tool selected" : "Pointer tool",
    );
    nodeToolButton.setAttribute("aria-label", isNodeTool ? "Node tool selected" : "Node tool");
    rectangleToolButton.setAttribute(
      "aria-label",
      isRectangleTool ? "Rectangle tool selected" : "Rectangle tool",
    );

    if (isNodeTool) {
      toolName.textContent = "Node tool";
      toolDescription.textContent = "Edit one or more points on the shape";
      toolStatus.textContent = "Node editing";
      canvasHintText.textContent = "Drag canvas to pan · Shift-click nodes for multiple selection";
    } else if (isRectangleTool) {
      toolName.textContent = "Rectangle tool";
      toolDescription.textContent = "Drag to create a rectangle";
      toolStatus.textContent = "Shape drawing";
      canvasHintText.textContent = "Drag to draw · hold Shift for a perfect square";
    } else {
      toolName.textContent = "Pointer tool";
      toolDescription.textContent = "Move, stretch, or resize the selected object";
      toolStatus.textContent = "Pointer editing";
      canvasHintText.textContent = objectSelected
        ? "Drag handles to resize · drag the shape to move it · Delete removes it"
        : "Click an object to select it · drag empty canvas to pan";
    }
  }

  function changeZoom(direction) {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
    const nextIndex = clamp(currentIndex + direction, 0, ZOOM_LEVELS.length - 1);
    zoom = ZOOM_LEVELS[nextIndex];
    render();
  }

  function resetZoom() {
    zoom = 1;
    viewCenter = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    render();
  }

  function setActiveTool(tool) {
    activeTool = tool;
    dragging = null;
    draftRectangle = null;
    if (tool === "pointer") {
      objectSelected = shapes.length > 0;
      if (objectSelected) {
        selectedIndices = new Set(points.map((_, index) => index));
        selectedIndex = 0;
      }
    }
    canvasHint.hidden = false;
    render();
    const messages = {
      node: "Node tool selected",
      pointer: "Pointer tool selected",
      rectangle: "Rectangle tool selected — hold Shift for a square",
    };
    announce(messages[tool]);
  }

  function pointFromPointer(event) {
    const screenPoint = svg.createSVGPoint();
    screenPoint.x = event.clientX;
    screenPoint.y = event.clientY;
    const matrix = svg.getScreenCTM();

    if (!matrix) return null;
    return screenPoint.matrixTransform(matrix.inverse());
  }

  function updateDrag(event) {
    if (!dragging) return;

    if (dragging.kind === "pan") {
      const screenDistance = Math.hypot(
        event.clientX - dragging.startClient.x,
        event.clientY - dragging.startClient.y,
      );
      if (!dragging.moved && screenDistance < 3) return;

      dragging.moved = true;
      viewCenter = {
        x:
          dragging.startCenter.x -
          (event.clientX - dragging.startClient.x) * dragging.unitsPerPixel.x,
        y:
          dragging.startCenter.y -
          (event.clientY - dragging.startClient.y) * dragging.unitsPerPixel.y,
      };
      canvasHint.hidden = true;
      render();
      return;
    }

    const pointer = pointFromPointer(event);
    if (!pointer) return;

    if (dragging.kind === "rectangle") {
      dragging.moved =
        dragging.moved ||
        Math.hypot(
          event.clientX - dragging.startClient.x,
          event.clientY - dragging.startClient.y,
        ) >= 3;
      draftRectangle = {
        points: createRectanglePoints(dragging.startPointer, pointer, event.shiftKey),
        perfectSquare: event.shiftKey,
      };
      canvasHint.hidden = true;
      render();
      return;
    }

    if (dragging.kind === "resize") {
      dragging.moved = true;
      const resizedPoints = resizeShapePoints(
        dragging.startPoints,
        dragging.handle,
        pointer,
      );
      shapes[activeShapeIndex].points = resizedPoints;
      points = resizedPoints;
      selectedIndices = new Set(points.map((_, index) => index));
      canvasHint.hidden = true;
      render();
      return;
    }

    if (dragging.kind === "handle") {
      const point = points[dragging.index];
      const handle = {
        x: roundValue(pointer.x - point.x),
        y: roundValue(pointer.y - point.y),
      };
      updatePointHandle(point, dragging.handle, handle);
    } else {
      const screenDistance = Math.hypot(
        event.clientX - dragging.startClient.x,
        event.clientY - dragging.startClient.y,
      );
      if (dragging.kind === "shape" && !dragging.moved && screenDistance < 3) return;

      dragging.moved = true;
      const requestedX = pointer.x - dragging.startPointer.x;
      const requestedY = pointer.y - dragging.startPointer.y;
      const translation = constrainTranslation(
        dragging.startPositions,
        requestedX,
        requestedY,
      );

      dragging.startPositions.forEach((position) => {
        points[position.index].x = roundValue(position.x + translation.x);
        points[position.index].y = roundValue(position.y + translation.y);
      });
    }

    canvasHint.hidden = true;
    render();
  }

  function addNodeAt(segmentIndex, amount, message) {
    const insertedIndex = splitSegment(points, segmentIndex, clamp(amount, 0.02, 0.98));
    canvasHint.hidden = true;
    selectNode(insertedIndex, { focus: true });
    announce(message.replace("{node}", String(insertedIndex + 1)));
  }

  function finishRectangle(dragState, pointer, perfectSquare) {
    const rectanglePoints = createRectanglePoints(
      dragState.startPointer,
      pointer,
      perfectSquare,
    );
    const width = Math.abs(rectanglePoints[1].x - rectanglePoints[0].x);
    const height = Math.abs(rectanglePoints[3].y - rectanglePoints[0].y);
    draftRectangle = null;

    if (!dragState.moved || width < 3 || height < 3) {
      render();
      announce("Drag to create a rectangle");
      return;
    }

    const shapeName = perfectSquare ? `Square ${nextShapeId}` : `Rectangle ${nextShapeId}`;
    shapes.push({
      id: nextShapeId,
      name: shapeName,
      kind: "rectangle",
      fill: cloneFill(currentFill),
      points: rectanglePoints,
    });
    nextShapeId += 1;
    activeShapeIndex = shapes.length - 1;
    points = shapes[activeShapeIndex].points;
    selectedIndex = 0;
    selectedIndices = new Set(points.map((_, index) => index));
    render();
    announce(`Added ${perfectSquare ? "a square" : "a rectangle"}`);
  }

  function addMidpointNode() {
    if (selectedIndices.size === 0) {
      announce("Select a node before adding a midpoint");
      return;
    }
    addNodeAt(selectedIndex, 0.5, "Added midpoint node {node}");
  }

  function deleteSelectedNode() {
    const indices = selectedIndexList();
    if (indices.length === 0) {
      announce("Select one or more nodes to delete");
      return;
    }
    if (points.length - indices.length < 3) {
      announce("A closed shape needs at least 3 nodes");
      return;
    }

    indices
      .slice()
      .reverse()
      .forEach((index) => points.splice(index, 1));
    selectedIndex = Math.min(indices[0], points.length - 1);
    selectedIndices = new Set([selectedIndex]);
    render();
    announce(
      indices.length === 1
        ? `Deleted node ${indices[0] + 1}`
        : `Deleted ${indices.length} nodes`,
    );
  }

  function deleteActiveObject() {
    if (!objectSelected || activeShapeIndex < 0 || !shapes[activeShapeIndex]) {
      announce("Select an object to delete");
      return;
    }

    const [deletedShape] = shapes.splice(activeShapeIndex, 1);
    if (shapes.length) {
      activeShapeIndex = Math.min(activeShapeIndex, shapes.length - 1);
      points = shapes[activeShapeIndex].points;
      selectedIndex = 0;
      selectedIndices = new Set(points.map((_, index) => index));
      objectSelected = true;
    } else {
      activeShapeIndex = -1;
      points = [];
      selectedIndex = 0;
      selectedIndices.clear();
      objectSelected = false;
    }
    render();
    announce(`Deleted ${deletedShape.name}`);
  }

  function deleteCurrentSelection() {
    if (activeTool === "pointer") {
      deleteActiveObject();
    } else if (activeTool === "node") {
      deleteSelectedNode();
    }
  }

  function updateSelectedCoordinate(axis, value) {
    if (selectedIndices.size !== 1) return;
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return;

    const maximum = axis === "x" ? 622 : 402;
    points[selectedIndex][axis] = Math.round(clamp(parsedValue, 18, maximum));
    render();
  }

  function nudgeSelectedNode(horizontalChange, verticalChange) {
    const indices = selectedIndexList();
    if (indices.length === 0) return;
    const positions = indices.map((index) => ({
      index,
      x: points[index].x,
      y: points[index].y,
    }));
    const translation = constrainTranslation(positions, horizontalChange, verticalChange);
    positions.forEach((position) => {
      points[position.index].x = roundValue(position.x + translation.x);
      points[position.index].y = roundValue(position.y + translation.y);
    });
    render();
  }

  function nudgeActiveObject(horizontalChange, verticalChange) {
    if (!objectSelected || !points.length) return;
    const positions = points.map((point, index) => ({
      index,
      x: point.x,
      y: point.y,
    }));
    const translation = constrainTranslation(positions, horizontalChange, verticalChange);
    positions.forEach((position) => {
      points[position.index].x = roundValue(position.x + translation.x);
      points[position.index].y = roundValue(position.y + translation.y);
    });
    render();
  }

  function changeSelectedNodeType(type) {
    if (selectedIndices.size === 0) {
      announce("Select one or more nodes to change their type");
      return;
    }
    selectedIndexList().forEach((index) => setPointType(points, index, type));
    render();
    const messages = {
      corner: "Converted selection to corner nodes",
      smooth: "Equal curve handles enabled for selection",
      asymmetric: "Uneven curve handles enabled for selection",
    };
    announce(messages[type]);
  }

  function downloadCurrentSvg() {
    const blob = new Blob([createDocumentSvg(shapes)], {
      type: "image/svg+xml;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "vector-shape.svg";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    announce("Downloaded vector-shape.svg");
  }

  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    const pointer = pointFromPointer(event);
    if (!pointer) return;

    const handle = activeTool === "node" ? event.target.closest?.("[data-handle]") : null;
    const node = activeTool === "node" ? event.target.closest?.("[data-node-index]") : null;
    const resizeControl =
      activeTool === "pointer"
        ? event.target.closest?.("[data-resize-handle]")
        : null;
    const segment = event.target.closest?.("[data-segment-index]");
    const shapeElement = event.target.closest?.("[data-shape-index]");
    event.preventDefault();

    if (activeTool === "rectangle") {
      dragging = {
        kind: "rectangle",
        moved: false,
        startPointer: pointer,
        startClient: { x: event.clientX, y: event.clientY },
      };
      draftRectangle = {
        points: createRectanglePoints(pointer, pointer, event.shiftKey),
        perfectSquare: event.shiftKey,
      };
      render();
    } else if (resizeControl && objectSelected) {
      dragging = {
        kind: "resize",
        moved: false,
        handle: resizeControl.dataset.resizeHandle,
        startPoints: clonePoints(points),
      };
    } else if (handle) {
      dragging = { kind: "handle", index: selectedIndex, handle: handle.dataset.handle };
    } else if (node) {
      const index = Number(node.dataset.nodeIndex);
      if (event.shiftKey) {
        selectNode(index, { additive: true });
        return;
      }

      if (!selectedIndices.has(index)) selectNode(index);
      const indices = selectedIndexList();
      dragging = {
        kind: "node",
        moved: false,
        startPointer: pointer,
        startClient: { x: event.clientX, y: event.clientY },
        startPositions: indices.map((pointIndex) => ({
          index: pointIndex,
          x: points[pointIndex].x,
          y: points[pointIndex].y,
        })),
      };
    } else if (shapeElement || segment) {
      const shapeIndex = shapeElement
        ? Number(shapeElement.dataset.shapeIndex)
        : activeShapeIndex;
      if (shapeIndex !== activeShapeIndex) {
        activeShapeIndex = shapeIndex;
        points = shapes[activeShapeIndex].points;
      }
      if (activeTool === "pointer") objectSelected = true;
      const indices = points.map((_, index) => index);
      selectedIndices = new Set(indices);
      selectedIndex = 0;
      if (activeTool === "node" || activeTool === "pointer") render();
      dragging = {
        kind: "shape",
        moved: false,
        segmentIndex:
          activeTool === "node" && segment ? Number(segment.dataset.segmentIndex) : null,
        startPointer: pointer,
        startClient: { x: event.clientX, y: event.clientY },
        startPositions: indices.map((index) => ({
          index,
          x: points[index].x,
          y: points[index].y,
        })),
      };
    } else {
      const rect = svg.getBoundingClientRect();
      const viewBox = createZoomViewBox(
        zoom,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        viewCenter.x,
        viewCenter.y,
      );
      dragging = {
        kind: "pan",
        moved: false,
        startClient: { x: event.clientX, y: event.clientY },
        startCenter: { ...viewCenter },
        unitsPerPixel: {
          x: viewBox.width / rect.width,
          y: viewBox.height / rect.height,
        },
      };
      render();
    }

    canvasHint.hidden = true;
    svg.setPointerCapture(event.pointerId);
  });

  svg.addEventListener("pointermove", updateDrag);

  svg.addEventListener("pointerup", (event) => {
    if (!dragging) return;
    const completedDrag = dragging;
    const endPointer = pointFromPointer(event);
    dragging = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);

    if (completedDrag.kind === "rectangle") {
      finishRectangle(
        completedDrag,
        endPointer ?? completedDrag.startPointer,
        event.shiftKey,
      );
      return;
    }

    if (completedDrag.kind === "pan" && !completedDrag.moved) {
      if (activeTool === "pointer") {
        const hadSelection = objectSelected;
        objectSelected = false;
        selectedIndices.clear();
        render();
        if (hadSelection) announce("Object selection cleared");
      } else {
        deselectAllNodes({ announceChange: true });
      }
      return;
    }

    if (
      completedDrag.kind === "shape" &&
      !completedDrag.moved &&
      completedDrag.segmentIndex !== null
    ) {
      const geometry = segmentGeometry(points, completedDrag.segmentIndex);
      const amount = geometry.curved
        ? closestTOnCubic(
            completedDrag.startPointer,
            geometry.start,
            geometry.controlStart,
            geometry.controlEnd,
            geometry.end,
          )
        : closestPointOnSegment(
            completedDrag.startPointer,
            geometry.start,
            geometry.end,
          ).position;
      addNodeAt(completedDrag.segmentIndex, amount, "Added node {node} on the curve");
      return;
    }

    render();
  });

  svg.addEventListener("pointercancel", () => {
    dragging = null;
    draftRectangle = null;
    render();
  });

  svg.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      changeZoom(event.deltaY < 0 ? 1 : -1);
    },
    { passive: false },
  );

  nodeLayer.addEventListener("keydown", (event) => {
    const node = event.target.closest("[data-node-index]");
    if (!node || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    selectNode(Number(node.dataset.nodeIndex), { additive: event.shiftKey });
  });

  nodeXInput.addEventListener("change", (event) => updateSelectedCoordinate("x", event.target.value));
  nodeYInput.addEventListener("change", (event) => updateSelectedCoordinate("y", event.target.value));
  cornerButton.addEventListener("click", () => changeSelectedNodeType("corner"));
  curveButton.addEventListener("click", () => changeSelectedNodeType("smooth"));
  unevenButton.addEventListener("click", () => changeSelectedNodeType("asymmetric"));
  pointerToolButton.addEventListener("click", () => setActiveTool("pointer"));
  nodeToolButton.addEventListener("click", () => setActiveTool("node"));
  rectangleToolButton.addEventListener("click", () => setActiveTool("rectangle"));
  addNodeButton.addEventListener("click", addMidpointNode);
  deselectButton.addEventListener("click", () =>
    deselectAllNodes({ announceChange: true }),
  );
  deleteButton.addEventListener("click", deleteCurrentSelection);
  document.querySelector("#download-svg").addEventListener("click", downloadCurrentSvg);
  zoomOutButton.addEventListener("click", () => changeZoom(-1));
  zoomResetButton.addEventListener("click", resetZoom);
  zoomInButton.addEventListener("click", () => changeZoom(1));
  fillColorButton.addEventListener("click", () => {
    setColorPopoverOpen(colorPopover.hidden);
  });
  fillTypeButtons.forEach((button) => {
    button.addEventListener("click", () => setFillType(button.dataset.fillType));
  });
  gradientStopButtons.forEach((button) => {
    button.addEventListener("click", () =>
      selectGradientStop(Number(button.dataset.gradientStop)),
    );
  });
  [colorSlider, saturationSlider, brightnessSlider].forEach((slider) => {
    slider.addEventListener("input", applySliderColor);
  });
  hexColorInput.addEventListener("input", applyHexColor);
  hexColorInput.addEventListener("blur", () => {
    if (!applyHexColor()) updateColorControls();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!colorPopover.hidden && !colorControl.contains(event.target)) {
      setColorPopoverOpen(false);
    }
  });

  document.querySelector("#reset-shape").addEventListener("click", () => {
    shapes = [
      {
        id: 1,
        name: "Shape 1",
        kind: "path",
        fill: normalizeFill(),
        points: clonePoints(INITIAL_POINTS),
      },
    ];
    activeShapeIndex = 0;
    points = shapes[activeShapeIndex].points;
    nextShapeId = 2;
    selectedIndex = 0;
    selectedIndices = new Set([0]);
    objectSelected = activeTool === "pointer";
    currentFill = normalizeFill();
    activeColorStop = 0;
    draftRectangle = null;
    canvasHint.hidden = false;
    render();
    announce("Shape reset");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !colorPopover.hidden) {
      event.preventDefault();
      setColorPopoverOpen(false);
      fillColorButton.focus();
      return;
    }
    if (event.target.closest("input, textarea, [contenteditable='true']")) return;

    if (["Delete", "Backspace"].includes(event.key)) {
      event.preventDefault();
      deleteCurrentSelection();
      return;
    }

    if (event.target.closest("button, a")) return;

    const movementDistance = event.shiftKey ? 10 : 1;
    const movements = {
      ArrowLeft: [-movementDistance, 0],
      ArrowRight: [movementDistance, 0],
      ArrowUp: [0, -movementDistance],
      ArrowDown: [0, movementDistance],
    };
    const movement = movements[event.key];
    if (!movement) return;

    event.preventDefault();
    if (activeTool === "pointer") nudgeActiveObject(...movement);
    else if (activeTool === "node") nudgeSelectedNode(...movement);
  });

  render();
}

const VectorEditorCore = {
  DEFAULT_FILL_COLOR,
  FILL_TYPES,
  INITIAL_POINTS,
  absoluteHandle,
  calculateShapeBounds,
  clonePoints,
  closestPointOnSegment,
  closestTOnCubic,
  constrainTranslation,
  createGradientEndColor,
  createGradientMarkup,
  createArtworkSvg,
  createDocumentSvg,
  createPathData,
  createRectanglePoints,
  createSegmentPathData,
  createZoomViewBox,
  cubicPointAt,
  findClosestSegment,
  fillCssBackground,
  fillPaintValue,
  hexToHsb,
  hsbToHex,
  midpoint,
  cloneFill,
  normalizeFill,
  normalizeHexColor,
  resizeShapePoints,
  scalePointsToBounds,
  setPointType,
  splitSegment,
  updatePointHandle,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = VectorEditorCore;
}

if (typeof document !== "undefined") {
  initializeEditor();
}

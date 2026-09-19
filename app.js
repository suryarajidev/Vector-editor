const INITIAL_POINTS = Object.freeze([
  { x: 170, y: 310 },
  { x: 135, y: 205 },
  { x: 225, y: 120 },
  { x: 360, y: 105 },
  { x: 495, y: 195 },
  { x: 455, y: 325 },
  { x: 300, y: 355 },
]);

function clonePoints(points) {
  return points.map(({ x, y }) => ({ x, y }));
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function midpoint(first, second) {
  return {
    x: Math.round((first.x + second.x) / 2),
    y: Math.round((first.y + second.y) / 2),
  };
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

function createPathData(points, closed = true) {
  if (points.length === 0) return "";

  const commands = points.map((point, index) => {
    const command = index === 0 ? "M" : "L";
    return `${command} ${point.x} ${point.y}`;
  });

  return `${commands.join(" ")}${closed ? " Z" : ""}`;
}

function createArtworkSvg(points) {
  const pathData = createPathData(points);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420" role="img" aria-labelledby="title description">
  <title id="title">Node-edited vector shape</title>
  <desc id="description">A closed vector path created in Vector Editor.</desc>
  <defs>
    <linearGradient id="shapeGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#9f7aea"/>
      <stop offset="0.38" stop-color="#7657e8"/>
      <stop offset="0.72" stop-color="#2db7df"/>
      <stop offset="1" stop-color="#16d2b4"/>
    </linearGradient>
  </defs>
  <path d="${pathData}" fill="url(#shapeGradient)" stroke="#263651" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
</svg>`;
}

function initializeEditor() {
  const svg = document.querySelector("#editor-canvas");
  const shapePath = document.querySelector("#shape-path");
  const pathHitTarget = document.querySelector("#path-hit-target");
  const nodeLayer = document.querySelector("#node-layer");
  const nodeList = document.querySelector("#node-list");
  const nodeXInput = document.querySelector("#node-x");
  const nodeYInput = document.querySelector("#node-y");
  const selectionPill = document.querySelector("#selection-pill");
  const nodeCount = document.querySelector("#node-count");
  const nodeSummary = document.querySelector("#node-summary");
  const toast = document.querySelector("#toast");
  const canvasHint = document.querySelector("#canvas-hint");

  let points = clonePoints(INITIAL_POINTS);
  let selectedIndex = 0;
  let draggingIndex = null;
  let toastTimeout;

  function announce(message) {
    window.clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function selectNode(index, { focus = false } = {}) {
    selectedIndex = clamp(index, 0, points.length - 1);
    render();

    if (focus) {
      nodeLayer.querySelector(`[data-node-index="${selectedIndex}"]`)?.focus();
    }
  }

  function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    return element;
  }

  function renderCanvasNodes() {
    nodeLayer.replaceChildren();

    points.forEach((point, index) => {
      const group = createSvgElement("g", {
        class: `node${index === selectedIndex ? " is-selected" : ""}`,
        "data-node-index": String(index),
        role: "button",
        tabindex: "0",
        "aria-label": `Node ${index + 1}, x ${point.x}, y ${point.y}`,
        transform: `translate(${point.x} ${point.y})`,
      });
      const circle = createSvgElement("circle", { class: "node-ring", r: "9" });
      const label = createSvgElement("text", { class: "node-number", y: "0.5" });
      label.textContent = String(index + 1);
      group.append(circle, label);
      nodeLayer.append(group);
    });
  }

  function renderNodeList() {
    nodeList.replaceChildren();

    points.forEach((point, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = index === selectedIndex ? "is-selected" : "";
      button.textContent = String(index + 1);
      button.title = `Node ${index + 1}: ${point.x}, ${point.y}`;
      button.setAttribute("aria-label", `Select node ${index + 1}`);
      button.setAttribute("aria-pressed", String(index === selectedIndex));
      button.addEventListener("click", () => selectNode(index, { focus: true }));
      nodeList.append(button);
    });
  }

  function render() {
    const selectedPoint = points[selectedIndex];
    const pathData = createPathData(points);
    shapePath.setAttribute("d", pathData);
    pathHitTarget.setAttribute("d", pathData);
    renderCanvasNodes();
    renderNodeList();
    nodeXInput.value = String(selectedPoint.x);
    nodeYInput.value = String(selectedPoint.y);
    selectionPill.textContent = `Node ${selectedIndex + 1}`;
    nodeCount.textContent = String(points.length);
    nodeSummary.textContent = `${points.length} nodes · Closed path`;
  }

  function pointFromPointer(event) {
    const screenPoint = svg.createSVGPoint();
    screenPoint.x = event.clientX;
    screenPoint.y = event.clientY;
    const matrix = svg.getScreenCTM();

    if (!matrix) return null;
    return screenPoint.matrixTransform(matrix.inverse());
  }

  function updateDraggedNode(event) {
    if (draggingIndex === null) return;
    const pointer = pointFromPointer(event);
    if (!pointer) return;

    points[draggingIndex] = {
      x: Math.round(clamp(pointer.x, 18, 622)),
      y: Math.round(clamp(pointer.y, 18, 402)),
    };
    canvasHint.hidden = true;
    render();
  }

  function addNode() {
    const nextIndex = (selectedIndex + 1) % points.length;
    const insertedIndex = selectedIndex + 1;
    points.splice(insertedIndex, 0, midpoint(points[selectedIndex], points[nextIndex]));
    selectNode(insertedIndex, { focus: true });
    announce(`Added node ${insertedIndex + 1}`);
  }

  function deleteSelectedNode() {
    if (points.length <= 3) {
      announce("A closed shape needs at least 3 nodes");
      return;
    }

    const deletedNumber = selectedIndex + 1;
    points.splice(selectedIndex, 1);
    selectedIndex = Math.min(selectedIndex, points.length - 1);
    render();
    announce(`Deleted node ${deletedNumber}`);
  }

  function updateSelectedCoordinate(axis, value) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return;

    const maximum = axis === "x" ? 622 : 402;
    points[selectedIndex][axis] = Math.round(clamp(parsedValue, 18, maximum));
    render();
  }

  function nudgeSelectedNode(horizontalChange, verticalChange) {
    const point = points[selectedIndex];
    point.x = Math.round(clamp(point.x + horizontalChange, 18, 622));
    point.y = Math.round(clamp(point.y + verticalChange, 18, 402));
    render();
  }

  function downloadCurrentSvg() {
    const blob = new Blob([createArtworkSvg(points)], {
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

  nodeLayer.addEventListener("pointerdown", (event) => {
    const node = event.target.closest("[data-node-index]");
    if (!node) return;

    event.preventDefault();
    selectedIndex = Number(node.dataset.nodeIndex);
    draggingIndex = selectedIndex;
    svg.setPointerCapture(event.pointerId);
    updateDraggedNode(event);
  });

  pathHitTarget.addEventListener("click", (event) => {
    const pointer = pointFromPointer(event);
    const closest = pointer && findClosestSegment(points, pointer);
    if (!closest) return;

    const insertedIndex = closest.segmentIndex + 1;
    points.splice(insertedIndex, 0, { x: closest.x, y: closest.y });
    canvasHint.hidden = true;
    selectNode(insertedIndex, { focus: true });
    announce(`Added node ${insertedIndex + 1} on the path`);
  });

  svg.addEventListener("pointermove", updateDraggedNode);

  svg.addEventListener("pointerup", (event) => {
    if (draggingIndex === null) return;
    draggingIndex = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  });

  svg.addEventListener("pointercancel", () => {
    draggingIndex = null;
  });

  nodeLayer.addEventListener("click", (event) => {
    const node = event.target.closest("[data-node-index]");
    if (node) selectNode(Number(node.dataset.nodeIndex));
  });

  nodeLayer.addEventListener("keydown", (event) => {
    const node = event.target.closest("[data-node-index]");
    if (!node || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    selectNode(Number(node.dataset.nodeIndex));
  });

  nodeXInput.addEventListener("change", (event) => updateSelectedCoordinate("x", event.target.value));
  nodeYInput.addEventListener("change", (event) => updateSelectedCoordinate("y", event.target.value));
  document.querySelector("#tool-add-node").addEventListener("click", addNode);
  document.querySelector("#delete-node").addEventListener("click", deleteSelectedNode);
  document.querySelector("#download-svg").addEventListener("click", downloadCurrentSvg);

  document.querySelector("#reset-shape").addEventListener("click", () => {
    points = clonePoints(INITIAL_POINTS);
    selectedIndex = 0;
    canvasHint.hidden = false;
    render();
    announce("Shape reset");
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.closest("input, button, a")) return;

    if (["Delete", "Backspace"].includes(event.key)) {
      event.preventDefault();
      deleteSelectedNode();
      return;
    }

    const distance = event.shiftKey ? 10 : 1;
    const movements = {
      ArrowLeft: [-distance, 0],
      ArrowRight: [distance, 0],
      ArrowUp: [0, -distance],
      ArrowDown: [0, distance],
    };
    const movement = movements[event.key];
    if (!movement) return;

    event.preventDefault();
    nudgeSelectedNode(...movement);
  });

  render();
}

const VectorEditorCore = {
  INITIAL_POINTS,
  clonePoints,
  closestPointOnSegment,
  createArtworkSvg,
  createPathData,
  findClosestSegment,
  midpoint,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = VectorEditorCore;
}

if (typeof document !== "undefined") {
  initializeEditor();
}

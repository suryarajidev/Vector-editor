const downloadButton = document.querySelector("#download-svg");
const downloadStatus = document.querySelector("#download-status");

function createSubmarineSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420" role="img" aria-labelledby="title description">
  <title id="title">Tiny yellow submarine</title>
  <desc id="description">A cheerful yellow submarine with blue windows, a periscope, a propeller, and bubbles.</desc>
  <defs>
    <linearGradient id="hullGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff08a"/>
      <stop offset="0.38" stop-color="#ffd34d"/>
      <stop offset="0.72" stop-color="#ffad33"/>
      <stop offset="1" stop-color="#f37a35"/>
    </linearGradient>
    <linearGradient id="glassGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#dff9ff"/>
      <stop offset="0.55" stop-color="#66d4f1"/>
      <stop offset="1" stop-color="#3075bf"/>
    </linearGradient>
  </defs>

  <g stroke="#203450" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke">
    <path d="M282 153v-54h70v-35" fill="none"/>
    <path d="M352 64h42" fill="none"/>
    <path d="M231 157c12-35 43-58 80-58 38 0 69 23 81 58" fill="#ffca45"/>
    <path d="M127 230c0-50 41-91 91-91h216c50 0 91 41 91 91s-41 91-91 91H218c-50 0-91-41-91-91Z" fill="url(#hullGradient)"/>
    <path d="m127 230-53 47v-94l53 47Z" fill="#f78d3d"/>
    <path d="M74 230H42" fill="none"/>
    <path d="m42 194 32 36-32 36" fill="none"/>
    <circle cx="253" cy="229" r="38" fill="url(#glassGradient)"/>
    <circle cx="374" cy="229" r="38" fill="url(#glassGradient)"/>
    <path d="M454 270h45" fill="none"/>
  </g>

  <g fill="#99e7f6" stroke="#3075bf" stroke-width="8" vector-effect="non-scaling-stroke">
    <circle cx="535" cy="141" r="16"/>
    <circle cx="576" cy="99" r="11"/>
    <circle cx="557" cy="54" r="7"/>
  </g>
</svg>`;
}

function downloadSvg(svgText, filename) {
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

downloadButton.addEventListener("click", () => {
  downloadSvg(createSubmarineSvg(), "tiny-submarine.svg");
  downloadStatus.textContent = "Downloaded tiny-submarine.svg — surprise revealed!";
  downloadStatus.classList.add("is-complete");
});

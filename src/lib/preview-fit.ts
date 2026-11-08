export const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

export function canvasInset(width: number, height: number) {
  return Math.min(12, Math.max(2, Math.min(width, height) * 0.025));
}

export function fittedContent(width: number, height: number, contentWidth: number, contentHeight: number, inset = 0) {
  const scale = Math.min(1, Math.max(1, width - inset * 2) / Math.max(1, contentWidth), Math.max(1, height - inset * 2) / Math.max(1, contentHeight));
  return { scale, x: (width - contentWidth * scale) / 2, y: (height - contentHeight * scale) / 2 };
}

export function releaseMediaClipping(body: HTMLElement) {
  for (const media of body.querySelectorAll("canvas,img,video,svg")) {
    if (media instanceof HTMLElement && media.style.objectFit !== "contain") {
      media.style.setProperty("object-fit", "contain", "important");
    }
    if (media instanceof HTMLElement && media.style.objectPosition !== "50% 50%") {
      media.style.setProperty("object-position", "50% 50%", "important");
    }
    if (media instanceof SVGSVGElement && media.getAttribute("preserveAspectRatio") !== "xMidYMid meet") {
      media.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }
    const bounds = media.getBoundingClientRect();
    for (let parent = media.parentElement; parent && parent !== body; parent = parent.parentElement) {
      const box = parent.getBoundingClientRect();
      const style = getComputedStyle(parent);
      const clippedX = ["hidden", "clip", "auto", "scroll"].includes(style.overflowX || style.overflow);
      const clippedY = ["hidden", "clip", "auto", "scroll"].includes(style.overflowY || style.overflow);
      if ((clippedX && (bounds.left < box.left || bounds.right > box.right)) ||
          (clippedY && (bounds.top < box.top || bounds.bottom > box.bottom))) {
        parent.style.setProperty("overflow", "visible", "important");
      }
    }
  }
}

function installPreviewFit() {
  const body = document.body;
  if (!body) return;
  const root = document.documentElement;
  root.style.setProperty("overflow", "hidden", "important");
  body.style.setProperty("overflow", "visible", "important");
  body.style.setProperty("margin", "0", "important");
  body.style.setProperty("transform-origin", "0 0", "important");
  let queued = false;
  const fit = () => {
    queued = false;
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (!width || !height) return;
    body.style.setProperty("width", `${width}px`, "important");
    body.style.setProperty("position", "absolute", "important");
    body.style.setProperty("transform", "none", "important");
    body.style.setProperty("left", "0", "important");
    body.style.setProperty("top", "0", "important");
    releaseMediaClipping(body);
    let left = 0;
    let top = 0;
    let right = Math.max(width, body.scrollWidth, body.offsetWidth);
    let bottom = Math.max(height, body.scrollHeight, body.offsetHeight);
    for (const element of body.querySelectorAll("*")) {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) continue;
      const bounds = element.getBoundingClientRect();
      if (!bounds.width && !bounds.height) continue;
      const style = getComputedStyle(element);
      left = Math.min(left, bounds.left - (parseFloat(style.marginLeft) || 0));
      top = Math.min(top, bounds.top - (parseFloat(style.marginTop) || 0));
      right = Math.max(right, bounds.right + (parseFloat(style.marginRight) || 0));
      bottom = Math.max(bottom, bounds.bottom + (parseFloat(style.marginBottom) || 0));
    }
    const result = fittedContent(width, height, right - left, bottom - top, canvasInset(width, height));
    body.style.setProperty("transform", `translate(${result.x - left * result.scale}px, ${result.y - top * result.scale}px) scale(${result.scale})`, "important");
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(fit);
  };
  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule);
  body.addEventListener("load", schedule, true);
  const observer = new ResizeObserver(schedule);
  observer.observe(body);
  const observed = new WeakSet<Element>();
  const observeContent = () => {
    for (const element of body.querySelectorAll("*")) {
      if (!observed.has(element)) { observer.observe(element); observed.add(element); }
    }
  };
  observeContent();
  new MutationObserver((records) => {
    if (!records.some((record) => record.target !== body)) return;
    observeContent();
    schedule();
  }).observe(body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["style", "class", "width", "height", "src", "viewBox"] });
  document.fonts.ready.then(schedule);
  schedule();
}

export const previewFitScript = `const canvasInset = ${canvasInset.toString()}; const fittedContent = ${fittedContent.toString()}; const releaseMediaClipping = ${releaseMediaClipping.toString()}; (${installPreviewFit.toString()})();`;
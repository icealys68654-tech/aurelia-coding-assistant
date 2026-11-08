export const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

export function fittedContent(width: number, height: number, contentWidth: number, contentHeight: number, inset = 0) {
  const scale = Math.min(1, Math.max(1, width - inset * 2) / Math.max(1, contentWidth), Math.max(1, height - inset * 2) / Math.max(1, contentHeight));
  return { scale, x: (width - contentWidth * scale) / 2, y: (height - contentHeight * scale) / 2 };
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
    const result = fittedContent(width, height, right - left, bottom - top, 12);
    body.style.setProperty("transform", `translate(${result.x - left * result.scale}px, ${result.y - top * result.scale}px) scale(${result.scale})`, "important");
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(fit);
  };
  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule);
  new ResizeObserver(schedule).observe(body);
  for (const element of body.children) new ResizeObserver(schedule).observe(element);
  new MutationObserver(schedule).observe(body, { childList: true, subtree: true, characterData: true });
  document.fonts.ready.then(schedule);
  schedule();
}

export const previewFitScript = `const fittedContent = ${fittedContent.toString()}; (${installPreviewFit.toString()})();`;
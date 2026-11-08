export const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

export function fittedContent(width: number, height: number, contentWidth: number, contentHeight: number) {
  const scale = Math.min(1, width / Math.max(1, contentWidth), height / Math.max(1, contentHeight));
  return { scale, x: (width - contentWidth * scale) / 2, y: (height - contentHeight * scale) / 2 };
}

function installPreviewFit() {
  const body = document.body;
  if (!body) return;
  const root = document.documentElement;
  root.style.setProperty("overflow", "hidden", "important");
  body.style.setProperty("overflow", "hidden", "important");
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
    let contentWidth = Math.max(width, body.scrollWidth, body.offsetWidth);
    let contentHeight = Math.max(height, body.scrollHeight, body.offsetHeight);
    for (const element of body.querySelectorAll("canvas,svg,img,video,body > *")) {
      const bounds = element.getBoundingClientRect();
      contentWidth = Math.max(contentWidth, bounds.right);
      contentHeight = Math.max(contentHeight, bounds.bottom);
    }
    const result = fittedContent(width, height, contentWidth, contentHeight);
    body.style.setProperty("transform", `translate(${result.x}px, ${result.y}px) scale(${result.scale})`, "important");
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(fit);
  };
  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule);
  new ResizeObserver(schedule).observe(body);
  new MutationObserver(schedule).observe(body, { childList: true, subtree: true, characterData: true });
  document.fonts.ready.then(schedule);
  schedule();
}

export const previewFitScript = `const fittedContent = ${fittedContent.toString()}; (${installPreviewFit.toString()})();`;
export function observeElementSize(element: Element, onResize: () => void) {
  let frame = 0;
  const requestResize = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(onResize);
  };
  const observer = "ResizeObserver" in window ? new ResizeObserver(requestResize) : null;
  observer?.observe(element);
  if (!observer) window.addEventListener("resize", requestResize, { passive: true });
  window.addEventListener("orientationchange", requestResize, { passive: true });
  window.visualViewport?.addEventListener("resize", requestResize, { passive: true });
  onResize();

  return () => {
    window.cancelAnimationFrame(frame);
    observer?.disconnect();
    if (!observer) window.removeEventListener("resize", requestResize);
    window.removeEventListener("orientationchange", requestResize);
    window.visualViewport?.removeEventListener("resize", requestResize);
  };
}

export function observeElementVisibility(element: Element, onChange: (visible: boolean) => void) {
  if (!("IntersectionObserver" in window)) {
    onChange(true);
    return () => undefined;
  }
  const observer = new IntersectionObserver(([entry]) => {
    onChange(entry.isIntersecting && entry.intersectionRatio > 0);
  }, { threshold: .01 });
  observer.observe(element);
  return () => observer.disconnect();
}

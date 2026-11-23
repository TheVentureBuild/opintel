/**
 * Blocks links that would run script instead of opening a page (`javascript:`, `vbscript:`, `data:` HTML).
 * React 18 still renders such hrefs, and some links here come from scraped or AI-written data
 * (Huntlyst, CXO Scout, OpIntel) or from vault notes, so one capture-phase guard covers every link.
 */
const UNSAFE = /^(javascript|vbscript|data):/i;

export function isUnsafeHref(href: string | null | undefined): boolean {
  // Browsers ignore control characters and spaces before the scheme, so strip them first.
  return UNSAFE.test(String(href ?? "").replace(/[\u0000- \u007f-\u009f]+/g, ""));
}

export function installLinkGuard(doc: Document = document): () => void {
  const block = (e: Event) => {
    const a = (e.target as Element | null)?.closest?.("a[href], area[href]");
    if (a && isUnsafeHref(a.getAttribute("href"))) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };
  doc.addEventListener("click", block, true);
  doc.addEventListener("auxclick", block, true);
  return () => {
    doc.removeEventListener("click", block, true);
    doc.removeEventListener("auxclick", block, true);
  };
}

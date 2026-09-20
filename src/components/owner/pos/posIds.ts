/** Works on HTTP LAN (non-secure) where crypto.randomUUID may be unavailable. */
export function optimisticLineId(): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") {
      return `opt-${c.randomUUID()}`;
    }
  } catch {
    /* secure context / browser */
  }
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function startViewTransitionIfSupported(update: () => void): void {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(() => {
      update();
    });
    return;
  }
  update();
}

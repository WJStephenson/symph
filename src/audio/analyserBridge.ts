let connected = false;

export function attachAnalyserToMediaElement(
  el: HTMLAudioElement,
  onReady: (analyser: AnalyserNode, ctx: AudioContext) => void
): () => void {
  if (connected) {
    return () => undefined;
  }
  let ctx: AudioContext | null = null;
  try {
    ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.82;
    const source = ctx.createMediaElementSource(el);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    connected = true;
    onReady(analyser, ctx);
  } catch {
    connected = false;
  }
  return () => undefined;
}

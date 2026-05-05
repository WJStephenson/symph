let audioElement: HTMLAudioElement | null = null;

export function setRegisteredAudioElement(el: HTMLAudioElement | null): void {
  audioElement = el;
}

export function getRegisteredAudioElement(): HTMLAudioElement | null {
  return audioElement;
}

export const getAudioElement = getRegisteredAudioElement;

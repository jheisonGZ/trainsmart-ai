/**
 * Plays an audio element, falling back to the user's next interaction if the
 * browser blocks autoplay. Listeners are attached unconditionally (not just
 * inside a .catch()) because some browsers block autoplay without the play()
 * promise ever rejecting.
 */
export function playWithInteractionFallback(audio: HTMLAudioElement, context: string) {
  const cleanup = () => {
    document.removeEventListener("click", retry);
    document.removeEventListener("keydown", retry);
    document.removeEventListener("touchstart", retry);
  };

  const retry = () => {
    if (!audio.paused) {
      cleanup();
      return;
    }

    audio.play().catch((error) => {
      console.warn(`${context} playback failed on retry`, error);
    });
  };

  document.addEventListener("click", retry);
  document.addEventListener("keydown", retry);
  document.addEventListener("touchstart", retry);
  audio.addEventListener("playing", cleanup, { once: true });

  audio.play().catch((error) => {
    console.warn(`${context} autoplay blocked, waiting for interaction`, error);
  });
}

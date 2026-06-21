export const VOICE_GREETING_PENDING_KEY = "ts:voice-greeting-pending";

export function markVoiceGreetingPending() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(VOICE_GREETING_PENDING_KEY, "true");
}

export function consumeVoiceGreetingPending() {
  if (typeof window === "undefined") {
    return false;
  }

  const isPending = window.sessionStorage.getItem(VOICE_GREETING_PENDING_KEY) === "true";

  if (isPending) {
    window.sessionStorage.removeItem(VOICE_GREETING_PENDING_KEY);
  }

  return isPending;
}

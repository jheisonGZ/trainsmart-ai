import { api } from "./api";
import { supabase } from "./supabaseClient";
import { getDisplayName } from "./supabaseUserDisplay";

interface GreetingAccess {
  audioUrl: string;
  expiresIn: number;
}

function playWithInteractionFallback(audio: HTMLAudioElement) {
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
      console.warn("Login greeting playback failed on retry", error);
    });
  };

  // Attach the retry listeners unconditionally: some browsers block autoplay
  // without the play() promise ever rejecting, so we can't rely on .catch()
  // alone to know a retry is needed.
  document.addEventListener("click", retry);
  document.addEventListener("keydown", retry);
  document.addEventListener("touchstart", retry);
  audio.addEventListener("playing", cleanup, { once: true });

  audio.play().catch((error) => {
    console.warn("Login greeting autoplay blocked, waiting for interaction", error);
  });
}

export async function playLoginGreeting() {
  try {
    if (!supabase) {
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    const fullName = user
      ? (getDisplayName(user) ?? user.email?.split("@")[0]?.trim() ?? null)
      : null;
    const name = fullName?.split(/\s+/)[0] ?? null;

    const greeting = await api.get<GreetingAccess>("/auth/greeting", {
      ...(name ? { name } : {}),
      hour: new Date().getHours(),
    });

    const audio = new Audio(greeting.audioUrl);
    playWithInteractionFallback(audio);
  } catch (error) {
    console.warn("Login greeting skipped", error);
  }
}

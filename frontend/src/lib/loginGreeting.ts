import { api } from "./api";
import { supabase } from "./supabaseClient";
import { getDisplayName } from "./supabaseUserDisplay";

interface GreetingAccess {
  audioUrl: string;
  expiresIn: number;
}

function playWithInteractionFallback(audio: HTMLAudioElement) {
  audio.play().catch(() => {
    const retry = () => {
      document.removeEventListener("click", retry);
      document.removeEventListener("keydown", retry);
      document.removeEventListener("touchstart", retry);
      void audio.play().catch((error) => {
        console.warn("Login greeting playback failed on retry", error);
      });
    };

    document.addEventListener("click", retry, { once: true });
    document.addEventListener("keydown", retry, { once: true });
    document.addEventListener("touchstart", retry, { once: true });
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

    const greeting = await api.get<GreetingAccess>(
      "/auth/greeting",
      name ? { name } : undefined,
    );

    const audio = new Audio(greeting.audioUrl);
    playWithInteractionFallback(audio);
  } catch (error) {
    console.warn("Login greeting skipped", error);
  }
}

import { api } from "./api";
import { supabase } from "./supabaseClient";
import { getDisplayName } from "./supabaseUserDisplay";

interface GreetingAccess {
  audioUrl: string;
  expiresIn: number;
}

export async function playLoginGreeting() {
  try {
    if (!supabase) {
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    const name = user
      ? (getDisplayName(user) ?? user.email?.split("@")[0]?.trim() ?? null)
      : null;

    const greeting = await api.get<GreetingAccess>(
      "/auth/greeting",
      name ? { name } : undefined,
    );

    const audio = new Audio(greeting.audioUrl);
    await audio.play();
  } catch (error) {
    console.warn("Login greeting skipped", error);
  }
}

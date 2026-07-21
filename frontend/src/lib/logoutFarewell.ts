import { api } from "./api";
import { playWithInteractionFallback } from "./audioPlayback";
import { supabase } from "./supabaseClient";
import { getDisplayName } from "./supabaseUserDisplay";

interface FarewellAccess {
  audioUrl: string;
  expiresIn: number;
}

/**
 * Fetches and plays the logout farewell. Must be called BEFORE
 * supabase.auth.signOut(), since it needs the still-active session to reach
 * the backend. The audio itself (a Supabase Storage signed URL) keeps
 * playing fine after sign-out and navigation.
 */
export async function playLogoutFarewell() {
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

    const farewell = await api.get<FarewellAccess>("/auth/farewell", {
      ...(name ? { name } : {}),
    });

    const audio = new Audio(farewell.audioUrl);
    playWithInteractionFallback(audio, "Logout farewell");
  } catch (error) {
    console.warn("Logout farewell skipped", error);
  }
}

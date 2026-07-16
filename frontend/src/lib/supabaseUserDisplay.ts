import type { User as SupabaseUser } from "@supabase/supabase-js";

export function getDisplayName(user: SupabaseUser | null | undefined): string | null {
  const metadata = user?.user_metadata ?? {};
  const displayName = metadata.display_name ?? metadata.full_name ?? metadata.name;
  return typeof displayName === "string" && displayName.trim() ? displayName.trim() : null;
}

export function getAvatarUrl(user: SupabaseUser | null | undefined): string | null {
  const metadata = user?.user_metadata ?? {};
  const avatarUrl = metadata.avatar_url ?? metadata.picture;
  return typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl : null;
}

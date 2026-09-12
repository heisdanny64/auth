import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface ProfileRecord {
  id: string;
  handle: string | null;
  display_name: string;
  avatar_config: Record<string, unknown> | null;
  handle_changed_at?: string | null;
  created_at?: string;
}

export const RESERVED_HANDLES = new Set([
  "spun",
  "admin",
  "api",
  "support",
  "sso",
  "oauth",
  "auth",
  "dverse",
  "grabbit",
  "account",
  "me",
  "system",
  "root",
  "superuser",
  "moderator",
  "mod",
  "staff",
  "help",
  "contact",
  "security",
  "billing",
  "legal",
  "terms",
  "privacy",
]);

export async function getProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("Could not fetch profile:", error.message);
      return null;
    }
    return (data as unknown as ProfileRecord | null) ?? null;
  } catch (err) {
    console.warn("Exception fetching profile:", err);
    return null;
  }
}

export async function isHandleAvailable(handle: string, userId?: string) {
  const normalized = handle.trim().toLowerCase();
  if (!/^[a-z0-9_]{4,}$/.test(normalized) || RESERVED_HANDLES.has(normalized)) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", normalized)
    .maybeSingle();
  if (error) throw error;
  return !data || data.id === userId;
}

export async function completeProfile(profile: {
  id: string;
  handle: string;
  displayName: string;
  avatarConfig: Record<string, unknown> | null;
}) {
  const { error } = await supabase.from("profiles").upsert({
    id: profile.id,
    handle: profile.handle,
    display_name: profile.displayName,
    avatar_config: profile.avatarConfig as unknown as Json,
  });
  if (error) throw error;
}

export async function updateAvatarConfig(
  userId: string,
  avatarConfig: Record<string, unknown> | null,
) {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_config: avatarConfig as unknown as Json })
    .eq("id", userId);
  if (error) throw error;
}

export async function destinationForUser(userId: string) {
  try {
    const profile = await getProfile(userId);
    return profile?.handle ? "/me" : "/onboarding";
  } catch {
    return "/onboarding";
  }
}

export function slugifyHandle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

export async function updateProfileDetails(params: {
  userId: string;
  displayName: string;
  oldHandle: string | null;
  newHandle: string;
}) {
  const now = new Date().toISOString();
  const normalizedNewHandle = params.newHandle.trim().toLowerCase();
  const handleChanged =
    !params.oldHandle || params.oldHandle.trim().toLowerCase() !== normalizedNewHandle;

  const updateData: {
    display_name: string;
    handle?: string;
    handle_changed_at?: string;
  } = {
    display_name: params.displayName.trim(),
  };

  if (handleChanged) {
    updateData.handle = normalizedNewHandle;
    updateData.handle_changed_at = now;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", params.userId);

  if (profileError) throw profileError;

  if (handleChanged && params.oldHandle) {
    const { error: historyError } = await supabase.from("handle_history").insert({
      user_id: params.userId,
      old_handle: params.oldHandle,
      new_handle: normalizedNewHandle,
      changed_at: now,
    });
    if (historyError) {
      console.error("Failed to insert handle history:", historyError);
    }
  }
}

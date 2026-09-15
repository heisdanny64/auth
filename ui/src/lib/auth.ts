import { supabase } from "@/integrations/supabase/client";

export type OAuthProvider = "google" | "discord" | "github";

export function callbackUrl(next?: string) {
  const base = `${window.location.origin}/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}

export async function signInWithProvider(provider: OAuthProvider, next = "/onboarding") {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl(next) },
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    throw new Error(
      "Please confirm your email before signing in. Check your inbox for a confirmation link.",
    );
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  next = "/onboarding",
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl(next),
      data: { display_name: displayName },
    },
  });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function linkProviderIdentity(provider: OAuthProvider, next = "/me") {
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: { redirectTo: callbackUrl(next) },
  });
  if (error) throw error;
  return data;
}

export async function unlinkProviderIdentity(identity: { id: string; [key: string]: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.auth.unlinkIdentity(identity as any);
  if (error) throw error;
}

import "server-only";
import type { SessionUser } from "./session";

type SupabaseAuthResponse = {
  user?: { id: string; email?: string; user_metadata?: { display_name?: string } };
  access_token?: string;
  error_description?: string;
  msg?: string;
};

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

export function isSupabaseAuthConfigured() {
  return Boolean(config());
}

export async function authenticateWithSupabase(input: {
  email: string;
  password: string;
  displayName: string;
  action: "login" | "signup";
}): Promise<{ user: SessionUser | null; confirmationRequired: boolean }> {
  const settings = config();
  if (!settings) throw new Error("Supabase authentication is not configured.");
  const endpoint = input.action === "signup" ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
  const response = await fetch(`${settings.url}${endpoint}`, {
    method: "POST",
    headers: { apikey: settings.key, Authorization: `Bearer ${settings.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      data: input.action === "signup" ? { display_name: input.displayName } : undefined,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const result = await response.json() as SupabaseAuthResponse;
  if (!response.ok) throw new Error(result.error_description ?? result.msg ?? "Authentication failed.");
  if (!result.user) return { user: null, confirmationRequired: true };
  const email = result.user.email ?? input.email;
  return {
    user: {
      id: result.user.id,
      email,
      displayName: result.user.user_metadata?.display_name ?? input.displayName ?? email.split("@")[0],
      role: "analyst",
    },
    confirmationRequired: !result.access_token,
  };
}

import { getSessionUser } from "@/lib/auth/session";

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { slug } = await context.params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ profile: null });
  const response = await fetch(`${url}/rest/v1/rpc/get_public_analyst_profile`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ requested_slug: slug }),
  });
  if (!response.ok) return Response.json({ error: "Public profile is temporarily unavailable." }, { status: 503 });
  const profile = await response.json();
  if (!profile) return Response.json({ error: "This analyst profile is private or unavailable." }, { status: 404 });
  return Response.json({ profile });
}

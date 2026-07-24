import { getSessionUser } from "@/lib/auth/session";
export async function GET() {
  return Response.json({ user: await getSessionUser() }, { headers: { "Cache-Control": "no-store" } });
}

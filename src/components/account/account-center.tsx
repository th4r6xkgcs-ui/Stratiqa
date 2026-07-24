"use client";

import { FormEvent, useEffect, useState } from "react";
import { LogIn, LogOut, Save, ShieldCheck, UserRound } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import type { SessionUser } from "@/lib/auth/session";
import type { UserPreferences } from "@/repositories/preferences";

const defaults: UserPreferences = { riskProfile: "balanced", leagues: ["MLB"], sportsbooks: ["DraftKings", "FanDuel"], maxUnitSize: 1 };

export function AccountCenter() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [preferences, setPreferences] = useState(defaults);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session").then((response) => response.json()).then(async ({ user: sessionUser }) => {
      setUser(sessionUser);
      if (sessionUser) {
        const response = await fetch("/api/preferences");
        if (response.ok) setPreferences((await response.json()).preferences);
      }
    }).finally(() => setLoading(false));
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), displayName: form.get("displayName") }) });
    const result = await response.json();
    if (!response.ok) return setStatus(result.error);
    setUser(result.user);
    setStatus("Development session created securely.");
  }

  async function save() {
    const response = await fetch("/api/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preferences) });
    const result = await response.json();
    setStatus(response.ok ? "Preferences saved." : result.error);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setStatus("Signed out.");
  }

  if (loading) return <Card className="account-loading">Loading account…</Card>;

  return (
    <div className="account-grid">
      <Card className="account-identity glass-card">
        <header><span><ShieldCheck size={17} /> Identity</span><Badge tone={user ? "success" : "warning"}>{user ? "Authenticated" : "Development mode"}</Badge></header>
        {user ? <div className="account-user"><UserRound /><span><strong>{user.displayName}</strong><small>{user.email}</small><em>Analyst session · HTTP-only cookie</em></span><Button variant="secondary" onClick={logout}><LogOut size={15} /> Sign out</Button></div> : (
          <form onSubmit={login}>
            <p>Create a local development session. Production environments require a configured session secret and external identity adapter.</p>
            <label>Display name<input name="displayName" minLength={2} maxLength={40} required defaultValue="Heriberto" /></label>
            <label>Email<input name="email" type="email" required placeholder="you@example.com" /></label>
            <Button><LogIn size={15} /> Continue securely</Button>
          </form>
        )}
        {status ? <p className="account-status" role="status">{status}</p> : null}
      </Card>

      <Card className="account-preferences">
        <header><span><UserRound size={17} /> Analyst preferences</span></header>
        <div>
          <label>Risk profile<select value={preferences.riskProfile} onChange={(event) => setPreferences({ ...preferences, riskProfile: event.target.value as UserPreferences["riskProfile"] })}><option value="conservative">Conservative</option><option value="balanced">Balanced</option><option value="aggressive">Aggressive</option></select></label>
          <label>Maximum unit size<input type="number" min=".25" max="10" step=".25" value={preferences.maxUnitSize} onChange={(event) => setPreferences({ ...preferences, maxUnitSize: Number(event.target.value) })} /></label>
          <label>Leagues<input value={preferences.leagues.join(", ")} onChange={(event) => setPreferences({ ...preferences, leagues: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
          <label>Sportsbooks<input value={preferences.sportsbooks.join(", ")} onChange={(event) => setPreferences({ ...preferences, sportsbooks: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
          <Button disabled={!user} onClick={save}><Save size={15} /> Save preferences</Button>
          {!user ? <small>Sign in to enable server-side preference storage.</small> : null}
        </div>
      </Card>
    </div>
  );
}

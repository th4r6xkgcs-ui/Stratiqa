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
  const [authAction, setAuthAction] = useState<"login" | "signup">("login");

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
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), displayName: form.get("displayName"), password: form.get("password"), action: authAction }) });
    const result = await response.json();
    if (!response.ok && response.status !== 202) return setStatus(result.error);
    if (!result.user) return setStatus(result.message ?? "Check your email to finish creating your account.");
    setUser(result.user);
    setStatus(authAction === "signup" ? "Account created and signed in." : "Signed in securely.");
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
        <header><span><ShieldCheck size={17} /> Identity</span><Badge tone={user ? "success" : "warning"}>{user ? "Authenticated" : "Sign in required"}</Badge></header>
        {user ? <div className="account-user"><UserRound /><span><strong>{user.displayName}</strong><small>{user.email}</small><em>Analyst session · HTTP-only cookie</em></span><Button variant="secondary" onClick={logout}><LogOut size={15} /> Sign out</Button></div> : (
          <form onSubmit={login}>
            <p>{authAction === "signup" ? "Create your secure STRATIQA analyst account." : "Sign in to sync your preferences across devices."}</p>
            <label>Display name<input name="displayName" minLength={2} maxLength={40} required defaultValue="Heriberto" /></label>
            <label>Email<input name="email" type="email" required placeholder="you@example.com" /></label>
            <label>Password<input name="password" type="password" minLength={8} required placeholder="8 or more characters" autoComplete={authAction === "signup" ? "new-password" : "current-password"} /></label>
            <Button><LogIn size={15} /> {authAction === "signup" ? "Create account" : "Sign in"}</Button>
            <Button type="button" variant="secondary" onClick={() => setAuthAction((value) => value === "login" ? "signup" : "login")}>
              {authAction === "login" ? "Need an account?" : "Already have an account?"}
            </Button>
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

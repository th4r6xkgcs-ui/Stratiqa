"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Eye, EyeOff, LockKeyhole, LogIn, LogOut, Save, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { onboardingStorageKey, type OnboardingProfile } from "@/components/onboarding/onboarding-flow";
import type { SessionUser } from "@/lib/auth/session";
import type { UserPreferences } from "@/repositories/preferences";

const defaults: UserPreferences = { riskProfile: "balanced", leagues: ["MLB"], sportsbooks: ["DraftKings", "FanDuel"], maxUnitSize: 1 };

function savedOnboarding(): OnboardingProfile | null {
  try {
    const value = localStorage.getItem(onboardingStorageKey);
    return value ? JSON.parse(value) as OnboardingProfile : null;
  } catch {
    return null;
  }
}

export function AccountCenter() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [preferences, setPreferences] = useState(defaults);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [authAction, setAuthAction] = useState<"login" | "signup">("login");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordStrength = Math.min(3, Number(password.length >= 8) + Number(/[A-Z]/.test(password) && /[a-z]/.test(password)) + Number(/\d|[^a-z]/i.test(password)));

  useEffect(() => {
    const requestedSignup = new URLSearchParams(window.location.search).get("mode") === "signup";
    fetch("/api/auth/session").then((response) => response.json()).then(async ({ user: sessionUser }) => {
      if (requestedSignup) setAuthAction("signup");
      setUser(sessionUser);
      if (sessionUser) {
        const response = await fetch("/api/preferences");
        if (response.ok) setPreferences((await response.json()).preferences);
      }
    }).finally(() => setLoading(false));
  }, []);

  async function syncOnboarding() {
    const profile = savedOnboarding();
    if (!profile) return;
    const personalized: UserPreferences = {
      riskProfile: profile.risk,
      leagues: profile.leagues.length ? profile.leagues : defaults.leagues,
      sportsbooks: profile.sportsbooks,
      maxUnitSize: 1,
    };
    const response = await fetch("/api/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(personalized) });
    if (response.ok) setPreferences(personalized);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(authAction === "signup" ? "Creating your workspace…" : "Signing you in…");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), displayName: form.get("displayName"), password: form.get("password"), action: authAction }) });
    const result = await response.json();
    if (!response.ok && response.status !== 202) return setStatus(result.error);
    if (!result.user) return setStatus(result.message ?? "Check your email to finish creating your account.");
    setUser(result.user);
    await syncOnboarding();
    setStatus(authAction === "signup" ? "Welcome to STRATIQA. Your workspace is personalized." : "Welcome back.");
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

  if (loading) return <Card className="account-loading">Preparing your workspace…</Card>;

  return (
    <div className="account-experience">
      <aside className="auth-story">
        <span className="landing-kicker"><Sparkles size={13} /> INTELLIGENCE, PERSONALIZED</span>
        <h2>Turn every slate into a decision.</h2>
        <p>Your personalized intelligence workspace finds the signal, explains the edge, and keeps your market preferences synchronized.</p>
        <div className="auth-signal-card"><span><i /> AI COACH · READY</span><strong>Today&apos;s strongest edge is waiting.</strong><small>Personalized analysis begins the moment you sign in.</small></div>
        <ul><li><Check /> Personalized opportunity ranking</li><li><Check /> Saved props and preferences</li><li><Check /> Secure cross-device access</li></ul>
        <div className="auth-trust"><ShieldCheck /><span><strong>Private by design</strong><small>Secure authentication and server-side preference storage.</small></span></div>
      </aside>
      <div className="account-grid">
        <Card className="account-identity glass-card">
          <header><span><LockKeyhole size={17} /> {user ? "Your account" : "Welcome to STRATIQA"}</span><Badge tone={user ? "success" : "accent"}>{user ? "Authenticated" : "Secure access"}</Badge></header>
          {user ? <div className="account-user"><UserRound /><span><strong>{user.displayName}</strong><small>{user.email}</small><em>Analyst workspace · synchronized</em></span><Button variant="secondary" onClick={logout}><LogOut size={15} /> Sign out</Button></div> : (
            <>
              <div className="auth-tabs"><button className={authAction === "login" ? "active" : ""} onClick={() => setAuthAction("login")}>Sign in</button><button className={authAction === "signup" ? "active" : ""} onClick={() => setAuthAction("signup")}>Create account</button></div>
              <form onSubmit={login}>
                <div className="auth-heading"><h3>{authAction === "signup" ? "Create your analyst workspace" : "Welcome back"}</h3><p>{authAction === "signup" ? "Your onboarding choices will be applied automatically." : "Continue where you left off."}</p></div>
                {authAction === "signup" ? <label>Display name<input name="displayName" minLength={2} maxLength={40} required placeholder="How should we address you?" autoComplete="name" /></label> : <input name="displayName" value="" type="hidden" readOnly />}
                <label>Email address<input name="email" type="email" required placeholder="you@example.com" autoComplete="email" /></label>
                <label>Password<span className="password-field"><input name="password" type={showPassword ? "text" : "password"} minLength={8} required placeholder="8 or more characters" autoComplete={authAction === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button></span></label>
                {authAction === "signup" ? <div className="password-strength"><span><i className={passwordStrength > 0 ? "active" : ""} /><i className={passwordStrength > 1 ? "active" : ""} /><i className={passwordStrength > 2 ? "active" : ""} /></span><small>{passwordStrength < 2 ? "Use 8+ characters with mixed letters and a number." : passwordStrength === 2 ? "Good password" : "Strong password"}</small></div> : null}
                <Button className="auth-submit"><LogIn size={15} /> {authAction === "signup" ? "Create my workspace" : "Sign in securely"}</Button>
                <small className="auth-legal">By continuing, you agree to responsible use of analytical decision support.</small>
              </form>
            </>
          )}
          {status ? <p className="account-status" role="status">{status}</p> : null}
        </Card>

        {user ? <Card className="account-preferences">
          <header><span><UserRound size={17} /> Analyst preferences</span></header>
          <div>
            <label>Recommendation style<select value={preferences.riskProfile} onChange={(event) => setPreferences({ ...preferences, riskProfile: event.target.value as UserPreferences["riskProfile"] })}><option value="conservative">More selective</option><option value="balanced">Balanced</option><option value="aggressive">More opportunities</option></select></label>
            <label>Maximum unit size<input type="number" min=".25" max="10" step=".25" value={preferences.maxUnitSize} onChange={(event) => setPreferences({ ...preferences, maxUnitSize: Number(event.target.value) })} /></label>
            <label>Leagues<input value={preferences.leagues.join(", ")} onChange={(event) => setPreferences({ ...preferences, leagues: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
            <label>Sportsbooks<input value={preferences.sportsbooks.join(", ")} onChange={(event) => setPreferences({ ...preferences, sportsbooks: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
            <Button onClick={save}><Save size={15} /> Save preferences</Button>
          </div>
        </Card> : null}
      </div>
    </div>
  );
}

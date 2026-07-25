"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { usePersistentState } from "@/hooks/use-persistent-state";

export type OnboardingProfile = {
  leagues: string[];
  leaguesSkipped: boolean;
  sportsbooks: string[];
  risk: "conservative" | "balanced" | "aggressive";
  goal: string;
  responsible: boolean;
};

export const onboardingStorageKey = "stratiqa.onboarding.v2";
const initial: OnboardingProfile = { leagues: [], leaguesSkipped: false, sportsbooks: [], risk: "balanced", goal: "Find the best value", responsible: false };
const leagues = ["MLB", "NFL", "NBA", "NHL", "WNBA"];
const sportsbooks = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "bet365"];
const goals = [
  ["Find the best value", "Prioritize opportunities where model probability beats the market."],
  ["Research player props", "Surface player trends, projections, and high-value prop markets."],
  ["Compare sportsbook lines", "Lead with the best available price across your preferred books."],
  ["Understand predictions", "Make model reasoning and confidence the center of each analysis."],
  ["Track teams and players", "Personalize the slate around the people and teams you follow."],
];
const styles = [
  ["conservative", "More selective", "Fewer recommendations with stronger agreement across signals."],
  ["balanced", "Balanced", "A practical mix of model confidence and expected value."],
  ["aggressive", "More opportunities", "A broader board that accepts more variance for potential edge."],
] as const;

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = usePersistentState<OnboardingProfile>(onboardingStorageKey, initial);
  const steps = ["Sports", "Goal", "Style", "Sportsbooks", "Ready"];
  const toggle = (key: "leagues" | "sportsbooks", value: string) => setProfile((current) => ({
    ...current,
    leaguesSkipped: key === "leagues" ? false : current.leaguesSkipped,
    [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
  }));
  const canContinue = step !== 0 || profile.leagues.length > 0 || profile.leaguesSkipped;

  return (
    <div className="onboarding">
      <Link href="/" className="onboarding-brand">STRATI<span>Q</span>A</Link>
      <div className="onboarding-progress">{steps.map((label, index) => <span className={index <= step ? "active" : ""} key={label}><i>{index < step ? <Check /> : index + 1}</i><small>{label}</small></span>)}</div>
      <main>
        <div className="onboarding-stage">
          <div className="onboarding-question">
            <div className="question-count"><span style={{ width: `${(step + 1) * 20}%` }} /><small>{step + 1} of 5</small></div>
            {step === 0 ? <section><span className="landing-kicker">BUILD YOUR EDGE</span><h1>Which games pull you in?</h1><p>Pick your leagues and watch your intelligence profile come alive.</p><div className="choice-grid">{leagues.map((item) => <button className={profile.leagues.includes(item) ? "selected" : ""} onClick={() => toggle("leagues", item)} key={item}>{item}<Check /></button>)}</div><button className="onboarding-skip" onClick={() => setProfile({ ...profile, leagues: [], leaguesSkipped: true })}>{profile.leaguesSkipped ? <Check /> : null} Surprise me with the best opportunities</button></section> : null}
            {step === 1 ? <section><span className="landing-kicker">CHOOSE YOUR ADVANTAGE</span><h1>What edge are you chasing?</h1><p>We&apos;ll shape your first dashboard around the outcome you want most.</p><div className="goal-grid">{goals.map(([title, detail]) => <button className={profile.goal === title ? "selected" : ""} onClick={() => setProfile({ ...profile, goal: title })} key={title}><span><strong>{title}</strong><small>{detail}</small></span><Check /></button>)}</div></section> : null}
            {step === 2 ? <section><span className="landing-kicker">TUNE THE SIGNAL</span><h1>How should your edge feel?</h1><p>Set the intensity. STRATIQA will rank every opportunity to match.</p><div className="risk-grid">{styles.map(([value, title, detail]) => <button className={profile.risk === value ? "selected" : ""} onClick={() => setProfile({ ...profile, risk: value })} key={value}><strong>{title}</strong><small>{detail}</small></button>)}</div></section> : null}
            {step === 3 ? <section><span className="landing-kicker">SHOP THE MARKET</span><h1>Where do you want your best price?</h1><p>Choose your books. We&apos;ll still scan every available line for the strongest value.</p><div className="choice-grid">{sportsbooks.map((item) => <button className={profile.sportsbooks.includes(item) ? "selected" : ""} onClick={() => toggle("sportsbooks", item)} key={item}>{item}<Check /></button>)}</div><button className="onboarding-skip" onClick={() => setProfile({ ...profile, sportsbooks: [] })}>Show me the best price anywhere</button></section> : null}
            {step === 4 ? <section className="onboarding-ready"><Sparkles /><span className="landing-kicker">YOUR EDGE IS ONLINE</span><h1>Meet your STRATIQA.</h1><p>{profile.leagues.length ? profile.leagues.join(", ") : "Best available leagues"} · {styles.find(([value]) => value === profile.risk)?.[1]} · {profile.goal}</p><div className="onboarding-preview"><span>AI COACH IS PRIMED FOR</span><strong>{profile.goal}</strong><small>Your first personalized slate is waiting.</small></div><label><input type="checkbox" checked={profile.responsible} onChange={(event) => setProfile({ ...profile, responsible: event.target.checked })} /><span><ShieldCheck /> I understand STRATIQA provides analytical decision support, not guaranteed outcomes.</span></label></section> : null}
          </div>
          {step < 4 ? <aside className="profile-live">
            <div className="profile-live-head"><span><i /> LIVE PROFILE</span><b>{Math.max(20, (step + 1) * 20)}% tuned</b></div>
            <div className="profile-orbit"><Sparkles /><span>YOUR EDGE</span><strong>{profile.risk === "conservative" ? "SELECTIVE" : profile.risk === "aggressive" ? "EXPANSIVE" : "BALANCED"}</strong></div>
            <dl>
              <div><dt>Markets</dt><dd>{profile.leagues.length ? profile.leagues.slice(0, 3).join(" · ") : "Best available"}</dd></div>
              <div><dt>AI Coach focus</dt><dd>{profile.goal}</dd></div>
              <div><dt>Price priority</dt><dd>{profile.sportsbooks.length ? profile.sportsbooks[0] : "Best line"}</dd></div>
            </dl>
            <p><Sparkles /> Your dashboard is adapting with every answer.</p>
          </aside> : null}
        </div>
        <footer><button disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ArrowLeft /> Back</button>{step < 4 ? <button disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>Continue <ArrowRight /></button> : <Link aria-disabled={!profile.responsible} className={!profile.responsible ? "disabled" : ""} href={profile.responsible ? "/account?mode=signup" : "#"}>Create my account <ArrowRight /></Link>}</footer>
      </main>
    </div>
  );
}

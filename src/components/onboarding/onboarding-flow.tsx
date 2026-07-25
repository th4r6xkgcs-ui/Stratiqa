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
        {step === 0 ? <section><span className="landing-kicker">MAKE IT YOURS</span><h1>What do you follow?</h1><p>Choose as many as you like. Your slate and AI Coach will focus here first.</p><div className="choice-grid">{leagues.map((item) => <button className={profile.leagues.includes(item) ? "selected" : ""} onClick={() => toggle("leagues", item)} key={item}>{item}<Check /></button>)}</div><button className="onboarding-skip" onClick={() => setProfile({ ...profile, leagues: [], leaguesSkipped: true })}>{profile.leaguesSkipped ? <Check /> : null} I&apos;ll choose later</button></section> : null}
        {step === 1 ? <section><span className="landing-kicker">YOUR PRIORITY</span><h1>What can STRATIQA help with first?</h1><p>This sets the opening focus for your dashboard and AI Coach.</p><div className="goal-grid">{goals.map(([title, detail]) => <button className={profile.goal === title ? "selected" : ""} onClick={() => setProfile({ ...profile, goal: title })} key={title}><span><strong>{title}</strong><small>{detail}</small></span><Check /></button>)}</div></section> : null}
        {step === 2 ? <section><span className="landing-kicker">RECOMMENDATION STYLE</span><h1>How selective should we be?</h1><p>You can change this anytime. It only affects how opportunities are ranked.</p><div className="risk-grid">{styles.map(([value, title, detail]) => <button className={profile.risk === value ? "selected" : ""} onClick={() => setProfile({ ...profile, risk: value })} key={value}><strong>{title}</strong><small>{detail}</small></button>)}</div></section> : null}
        {step === 3 ? <section><span className="landing-kicker">OPTIONAL</span><h1>Which sportsbooks do you use?</h1><p>We&apos;ll show your books first while still identifying the best available line.</p><div className="choice-grid">{sportsbooks.map((item) => <button className={profile.sportsbooks.includes(item) ? "selected" : ""} onClick={() => toggle("sportsbooks", item)} key={item}>{item}<Check /></button>)}</div><button className="onboarding-skip" onClick={() => setProfile({ ...profile, sportsbooks: [] })}>I don&apos;t use one yet</button></section> : null}
        {step === 4 ? <section className="onboarding-ready"><Sparkles /><span className="landing-kicker">PERSONALIZATION READY</span><h1>Your intelligence workspace is ready.</h1><p>{profile.leagues.length ? profile.leagues.join(", ") : "All leagues"} · {styles.find(([value]) => value === profile.risk)?.[1]} · {profile.goal}</p><div className="onboarding-preview"><span>AI COACH FOCUS</span><strong>{profile.goal}</strong><small>Recommendations will adapt as you use STRATIQA.</small></div><label><input type="checkbox" checked={profile.responsible} onChange={(event) => setProfile({ ...profile, responsible: event.target.checked })} /><span><ShieldCheck /> I understand STRATIQA provides analytical decision support, not guaranteed outcomes.</span></label></section> : null}
        <footer><button disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ArrowLeft /> Back</button>{step < 4 ? <button disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>Continue <ArrowRight /></button> : <Link aria-disabled={!profile.responsible} className={!profile.responsible ? "disabled" : ""} href={profile.responsible ? "/account?mode=signup" : "#"}>Create my account <ArrowRight /></Link>}</footer>
      </main>
    </div>
  );
}

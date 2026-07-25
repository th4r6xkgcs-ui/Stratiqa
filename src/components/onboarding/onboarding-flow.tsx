"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { usePersistentState } from "@/hooks/use-persistent-state";

type Profile = { leagues: string[]; sportsbooks: string[]; risk: string; goal: string; responsible: boolean };
const initial: Profile = { leagues: ["MLB"], sportsbooks: ["DraftKings"], risk: "balanced", goal: "Find value", responsible: false };
const options = {
  leagues: ["MLB", "NFL", "NBA", "NHL", "WNBA"],
  sportsbooks: ["DraftKings", "FanDuel", "BetMGM", "Caesars", "bet365"],
  risk: ["conservative", "balanced", "aggressive"],
  goal: ["Find value", "Research props", "Track markets", "Build better cards"],
};

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = usePersistentState<Profile>("stratiqa.onboarding.v1", initial);
  const steps = ["Leagues", "Sportsbooks", "Risk", "Goal", "Ready"];
  const toggle = (key: "leagues" | "sportsbooks", value: string) => setProfile((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }));
  const canContinue = step < 2 ? (step === 0 ? profile.leagues.length : profile.sportsbooks.length) > 0 : step === 4 ? profile.responsible : true;

  return (
    <div className="onboarding">
      <Link href="/" className="onboarding-brand">STRATI<span>Q</span>A</Link>
      <div className="onboarding-progress">{steps.map((label, index) => <span className={index <= step ? "active" : ""} key={label}><i>{index < step ? <Check /> : index + 1}</i><small>{label}</small></span>)}</div>
      <main>
        {step === 0 ? <section><span className="landing-kicker">STEP 1 OF 5</span><h1>Which leagues matter to you?</h1><p>Your dashboard and Coach will prioritize these markets.</p><div className="choice-grid">{options.leagues.map((item) => <button className={profile.leagues.includes(item) ? "selected" : ""} onClick={() => toggle("leagues", item)} key={item}>{item}<Check /></button>)}</div></section> : null}
        {step === 1 ? <section><span className="landing-kicker">STEP 2 OF 5</span><h1>Where do you compare prices?</h1><p>We&apos;ll surface your preferred books first while still finding the best available line.</p><div className="choice-grid">{options.sportsbooks.map((item) => <button className={profile.sportsbooks.includes(item) ? "selected" : ""} onClick={() => toggle("sportsbooks", item)} key={item}>{item}<Check /></button>)}</div></section> : null}
        {step === 2 ? <section><span className="landing-kicker">STEP 3 OF 5</span><h1>Set your risk profile.</h1><p>This changes how STRATIQA ranks confidence, volatility, and recommendations.</p><div className="risk-grid">{options.risk.map((item) => <button className={profile.risk === item ? "selected" : ""} onClick={() => setProfile({ ...profile, risk: item })} key={item}><strong>{item}</strong><small>{item === "conservative" ? "Prioritize stability and high-confidence markets." : item === "balanced" ? "Balance expected value with signal confidence." : "Accept more variance for larger modeled edges."}</small></button>)}</div></section> : null}
        {step === 3 ? <section><span className="landing-kicker">STEP 4 OF 5</span><h1>What should STRATIQA optimize first?</h1><p>This becomes the starting context for your AI Coach.</p><div className="choice-grid">{options.goal.map((item) => <button className={profile.goal === item ? "selected" : ""} onClick={() => setProfile({ ...profile, goal: item })} key={item}>{item}<Check /></button>)}</div></section> : null}
        {step === 4 ? <section className="onboarding-ready"><Sparkles /><span className="landing-kicker">YOUR PROFILE IS READY</span><h1>Intelligence, tuned to you.</h1><p>{profile.leagues.join(", ")} · {profile.risk} risk · focused on {profile.goal.toLowerCase()}</p><label><input type="checkbox" checked={profile.responsible} onChange={(event) => setProfile({ ...profile, responsible: event.target.checked })} /><span><ShieldCheck /> I understand STRATIQA provides analytical decision support, not guaranteed outcomes.</span></label></section> : null}
        <footer><button disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ArrowLeft /> Back</button>{step < 4 ? <button disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>Continue <ArrowRight /></button> : <Link aria-disabled={!canContinue} className={!canContinue ? "disabled" : ""} href={canContinue ? "/account" : "#"}>Create my account <ArrowRight /></Link>}</footer>
      </main>
    </div>
  );
}

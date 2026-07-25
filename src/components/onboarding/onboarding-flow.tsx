"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { ArchetypeCard } from "@/components/profile/archetype-card";

export type OnboardingProfile = {
  leagues: string[];
  leaguesSkipped: boolean;
  sportsbooks: string[];
  risk: "conservative" | "balanced" | "aggressive";
  style: string;
  styles: string[];
  traits: string[];
  goal: string;
  goals: string[];
  responsible: boolean;
};

export const onboardingStorageKey = "stratiqa.onboarding.v2";
const initial: OnboardingProfile = { leagues: [], leaguesSkipped: false, sportsbooks: [], risk: "balanced", style: "Data-first", styles: ["Data-first"], traits: ["Model confidence"], goal: "Find the best value", goals: ["Find the best value"], responsible: false };
const leagues = ["MLB", "NFL", "NBA", "NHL", "WNBA"];
const sportsbooks = [
  "DraftKings",
  "FanDuel",
  "BetMGM",
  "Caesars",
  "Fanatics",
  "BetRivers",
  "BetOnline",
  "Bovada",
  "MyBookie",
  "BetUS",
  "Other sportsbook",
];
const goals = [
  ["Find the best value", "Prioritize opportunities where model probability beats the market."],
  ["Research player props", "Surface player trends, projections, and high-value prop markets."],
  ["Compare sportsbook lines", "Lead with the best available price across your preferred books."],
  ["Understand predictions", "Make model reasoning and confidence the center of each analysis."],
  ["Track teams and players", "Personalize the slate around the people and teams you follow."],
  ["Find upset opportunities", "Look for underdogs whose modeled chance beats public expectation."],
  ["Build smarter parlays", "Find compatible legs without hiding correlation or added variance."],
  ["Manage risk and discipline", "Prioritize calibration, selectivity, and sustainable decision quality."],
];
const styles = [
  ["conservative", "Patient & precise", "I would rather wait for exceptional signal agreement."],
  ["conservative", "Data-first", "Let projections and evidence lead every decision."],
  ["balanced", "Value-driven", "Show me where probability and price disagree most."],
  ["aggressive", "Contrarian", "I am comfortable challenging crowded public positions."],
  ["balanced", "Momentum-aware", "Recent form and changing markets matter to me."],
  ["aggressive", "High-upside explorer", "I want to see asymmetric opportunities others may skip."],
] as const;
const trustSignals = ["Model confidence", "Best available price", "Market movement", "Player trends", "Recent form", "Contrarian signals"];

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
  const traits = profile.traits ?? [];
  const selectedGoals = profile.goals?.length ? profile.goals : [profile.goal ?? "Find the best value"];
  const selectedStyles = profile.styles?.length ? profile.styles : [profile.style ?? "Data-first"];
  const style = selectedStyles[0];
  const toggleTrait = (trait: string) => setProfile({ ...profile, traits: traits.includes(trait) ? traits.filter((item) => item !== trait) : traits.length < 3 ? [...traits, trait] : traits });
  const toggleGoal = (goal: string) => {
    const goals = selectedGoals.includes(goal) ? selectedGoals.length > 1 ? selectedGoals.filter((item) => item !== goal) : selectedGoals : selectedGoals.length < 3 ? [...selectedGoals, goal] : selectedGoals;
    setProfile({ ...profile, goals, goal: goals[0] ?? "Find the best value" });
  };
  const toggleStyle = (nextStyle: string, fallbackRisk: OnboardingProfile["risk"]) => {
    const nextStyles = selectedStyles.includes(nextStyle) ? selectedStyles.length > 1 ? selectedStyles.filter((item) => item !== nextStyle) : selectedStyles : selectedStyles.length < 2 ? [...selectedStyles, nextStyle] : selectedStyles;
    const aggressive = nextStyles.some((item) => item === "Contrarian" || item === "High-upside explorer");
    const conservative = nextStyles.every((item) => item === "Patient & precise" || item === "Data-first");
    setProfile({ ...profile, styles: nextStyles, style: nextStyles[0] ?? nextStyle, risk: nextStyles.length ? aggressive && conservative ? "balanced" : aggressive ? "aggressive" : conservative ? "conservative" : "balanced" : fallbackRisk });
  };

  return (
    <div className="onboarding">
      <Link href="/" className="onboarding-brand">STRATI<span>Q</span>A</Link>
      <div className="onboarding-progress">{steps.map((label, index) => <span className={index <= step ? "active" : ""} key={label}><i>{index < step ? <Check /> : index + 1}</i><small>{label}</small></span>)}</div>
      <main>
        <div className="onboarding-stage">
          <div className="onboarding-question">
            <div className="question-count"><span style={{ width: `${(step + 1) * 20}%` }} /><small>{step + 1} of 5</small></div>
            {step === 0 ? <section><span className="landing-kicker">BUILD YOUR EDGE</span><h1>Which games pull you in?</h1><p>Pick your leagues and watch your intelligence profile come alive.</p><div className="choice-grid">{leagues.map((item) => <button className={profile.leagues.includes(item) ? "selected" : ""} onClick={() => toggle("leagues", item)} key={item}>{item}<Check /></button>)}</div><button className="onboarding-skip" onClick={() => setProfile({ ...profile, leagues: [], leaguesSkipped: true })}>{profile.leaguesSkipped ? <Check /> : null} Surprise me with the best opportunities</button></section> : null}
            {step === 1 ? <section><span className="landing-kicker">CHOOSE YOUR ADVANTAGE</span><h1>What edges are you chasing?</h1><p>Choose up to three. Your mix creates a wider, more personal intelligence profile.</p><div className="selection-meter"><span>OBJECTIVES SELECTED</span><b>{selectedGoals.length}/3</b></div><div className="goal-grid">{goals.map(([title, detail]) => <button className={selectedGoals.includes(title) ? "selected" : ""} disabled={!selectedGoals.includes(title) && selectedGoals.length >= 3} onClick={() => toggleGoal(title)} key={title}><span><strong>{title}</strong><small>{detail}</small></span><Check /></button>)}</div></section> : null}
            {step === 2 ? <section><span className="landing-kicker">BUILD YOUR DECISION DNA</span><h1>How should your edge feel?</h1><p>Blend up to two playstyles, then choose three signals that earn your trust.</p><div className="selection-meter"><span>PLAYSTYLES BLENDED</span><b>{selectedStyles.length}/2</b></div><div className="style-grid">{styles.map(([risk, title, detail]) => <button className={selectedStyles.includes(title) ? "selected" : ""} disabled={!selectedStyles.includes(title) && selectedStyles.length >= 2} onClick={() => toggleStyle(title, risk)} key={title}><strong>{title}</strong><small>{detail}</small><Check /></button>)}</div><div className="trust-signals"><span>WHAT EARNS YOUR TRUST? <b>{traits.length}/3</b></span><div>{trustSignals.map((trait) => <button className={traits.includes(trait) ? "selected" : ""} disabled={!traits.includes(trait) && traits.length >= 3} onClick={() => toggleTrait(trait)} key={trait}>{trait}</button>)}</div></div></section> : null}
            {step === 3 ? <section><span className="landing-kicker">SHOP THE MARKET</span><h1>Where do you want your best price?</h1><p>Choose your books. We&apos;ll still scan every available line for the strongest value.</p><div className="choice-grid">{sportsbooks.map((item) => <button className={profile.sportsbooks.includes(item) ? "selected" : ""} onClick={() => toggle("sportsbooks", item)} key={item}>{item}<Check /></button>)}</div><button className="onboarding-skip" onClick={() => setProfile({ ...profile, sportsbooks: [] })}>Show me the best price anywhere</button></section> : null}
            {step === 4 ? <section className="onboarding-ready"><Sparkles /><span className="landing-kicker">YOUR EDGE IS ONLINE</span><h1>Meet your STRATIQA.</h1><p>{profile.leagues.length ? profile.leagues.join(", ") : "Best available leagues"} · {selectedStyles.join(" + ")}</p><div className="onboarding-preview"><span>YOUR DECISION DNA</span><strong>{selectedGoals.join(" · ")}</strong><small>{traits.join(" · ")}</small></div><label><input type="checkbox" checked={profile.responsible} onChange={(event) => setProfile({ ...profile, responsible: event.target.checked })} /><span><ShieldCheck /> I understand STRATIQA provides analytical decision support, not guaranteed outcomes.</span></label></section> : null}
          </div>
          {step < 4 ? <aside className="profile-live">
            <ArchetypeCard input={{ goal: profile.goal, goals: selectedGoals, risk: profile.risk, style, styles: selectedStyles, traits, leagueCount: profile.leagues.length, sportsbookCount: profile.sportsbooks.length }} label={`${Math.max(20, (step + 1) * 20)}% TUNED`} />
            <dl>
              <div><dt>Markets</dt><dd>{profile.leagues.length ? profile.leagues.slice(0, 3).join(" · ") : "Best available"}</dd></div>
              <div><dt>AI Coach focus</dt><dd>{selectedGoals.slice(0, 2).join(" · ")}</dd></div>
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

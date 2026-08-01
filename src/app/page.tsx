import Link from "next/link";
import { ArrowRight, Bot, Check, Sparkles, Target, TrendingUp, Zap } from "lucide-react";

const capabilities = [
  { icon: Bot, title: "AI Coach", body: "Ask the slate real questions and get grounded reasoning, confidence, risk, and alternatives." },
  { icon: TrendingUp, title: "Market intelligence", body: "Track price movement, sharp action, sportsbook differences, and model edge in one view." },
  { icon: Target, title: "Props Lab", body: "Rank player props by expected value, hit rate, confidence, trends, and correlation." },
];

export default function Home() {
  return (
    <div className="landing">
      <nav className="landing-nav"><Link href="/" className="landing-brand">STRATI<span>Q</span>A</Link><div><a href="#platform">Platform</a><a href="#membership">Membership</a><Link href="/account">Sign in</Link><Link className="landing-cta" href="/onboarding">Start free <ArrowRight size={14} /></Link></div></nav>
      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <span className="landing-kicker"><Sparkles size={14} /> BUILD AN EDGE YOU CAN PROVE</span>
            <h1>Build your edge.<br /><em>Earn your rank.</em></h1>
            <p>STRATIQA turns models, markets, injuries, weather, and player data into one clear decision system—built for analysts who demand more than picks.</p>
            <div className="landing-actions"><Link href="/onboarding">Build my intelligence profile <ArrowRight size={17} /></Link><Link href="/dashboard">Explore the platform</Link></div>
            <div className="landing-trust"><span><Check /> Transparent reasoning</span><span><Check /> Automatic results</span><span><Check /> Rating you earn</span></div>
          </div>
          <div className="landing-visual">
            <div className="signal-glow" />
            <article className="landing-play">
              <header><span><Zap /> TOP MODEL EDGE</span><b>LIVE-READY</b></header>
              <div><small>SEATTLE MARINERS ML</small><strong>+16.5% <em>EV</em></strong><p>Pitching, bullpen, and market confirmation align.</p></div>
              <footer><span>WIN PROBABILITY<b>63%</b></span><span>CONFIDENCE<b>91%</b></span><span>VALUE GRADE<b>A+</b></span></footer>
            </article>
            <article className="landing-coach"><Bot /><span><small>STRATIQA COACH</small><p>Seattle remains the strongest risk-adjusted position while the price is -122 or better.</p></span></article>
          </div>
        </section>
        <section className="landing-proof"><span><strong>PRE-GAME</strong> decisions stay locked</span><span><strong>OFFICIAL</strong> results settle your record</span><span><strong>PERSONAL</strong> models build reputation</span><span><strong>ONE</strong> competitive rating system</span></section>
        <section className="landing-platform" id="platform"><span className="landing-kicker">THE PLATFORM</span><h2>Every signal. One conviction layer.</h2><p>Move from discovery to explanation to action without stitching together five different tools.</p><div>{capabilities.map(({ icon: Icon, title, body }, index) => <article key={title}><b>0{index + 1}</b><Icon /><h3>{title}</h3><p>{body}</p><Link href={index === 0 ? "/coach" : index === 1 ? "/matchups" : "/props"}>Explore <ArrowRight size={14} /></Link></article>)}</div></section>
        <section className="landing-membership" id="membership">
          <div><span className="landing-kicker">FOUNDING MEMBERSHIP</span><h2>Your sharper workflow starts now.</h2><p>Personalized intelligence, saved analysis, and transparent model reasoning in one premium workspace.</p></div>
          <article><span>STRATIQA ELITE</span><strong>$0<small> for 30 days</small></strong><ul><li><Check /> Full AI Coach access</li><li><Check /> Advanced matchup reports</li><li><Check /> Props Lab and saved boards</li><li><Check /> Personalized risk controls</li></ul><Link href="/onboarding">Start founding access <ArrowRight size={15} /></Link><small>No payment required during preview.</small></article>
        </section>
      </main>
      <footer className="landing-footer"><strong>STRATI<span>Q</span>A</strong><p>Smarter models. Better decisions.</p><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></div></footer>
    </div>
  );
}

import { Badge, Card } from "@/components/ui/primitives";

const legalConfigs: Record<string, { title: string; description: string; sections: Array<[string, string]> }> = {
  privacy: {
    title: "Privacy",
    description: "How STRATIQA protects model activity, analyst profiles, and connected account data.",
    sections: [
      ["Data we use", "We process account details, product interactions, verified picks, and connected feed preferences to provide analytics and competitive features."],
      ["Your controls", "Profile visibility, public pick history, model visibility, confirmed-money statistics, and account controls are available from your account and leaderboard profile."],
      ["Security", "Account information is encrypted in transit and access is restricted according to operational need."],
    ],
  },
  terms: {
    title: "Terms",
    description: "The operating terms for STRATIQA analytics, competitive features, and model insights.",
    sections: [
      ["Analytics only", "STRATIQA provides analytical information and does not guarantee outcomes. Users remain responsible for their own decisions."],
      ["Verified competition", "Ratings use locked picks and automatic official results. Attempts to manipulate records or evidence may result in removal from public rankings."],
      ["Account access", "Keep account credentials secure and notify support promptly when unauthorized access is suspected."],
    ],
  },
  support: {
    title: "Support",
    description: "Help for accounts, verified picks, model attribution, and data questions.",
    sections: [
      ["Pick results", "Official results may remain pending while providers finalize or correct statistics. STRATIQA preserves a settlement audit trail."],
      ["Sportsbook evidence", "Ticket screenshots and IDs are evidence only. Confirmed-money statistics unlock after a ticket is independently matched."],
      ["Account help", "Include the affected pick, model, or page when contacting support. Never send a password or sportsbook login."],
    ],
  },
};

export function SectionExperience({ section }: { section: string }) {
  const legal = legalConfigs[section];
  if (!legal) return null;
  return <div className="product-page legal-page">
    <header className="product-hero">
      <div><Badge tone="accent">STRATIQA</Badge><h1>{legal.title}</h1><p>{legal.description}</p></div>
      <Badge tone="success">Updated July 26, 2026</Badge>
    </header>
    <section className="legal-grid">
      {legal.sections.map(([title, body], index) => <Card key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{body}</p></Card>)}
    </section>
    {section === "support" ? <Card className="support-bar"><div><strong>Need direct help?</strong><span>Include the page and error message so support can investigate quickly.</span></div><a className="button button--primary" href="mailto:support@stratiqa.com">Start support request</a></Card> : null}
  </div>;
}

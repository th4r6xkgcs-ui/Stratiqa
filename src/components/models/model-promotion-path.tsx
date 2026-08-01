"use client";

import { Check, Circle, Rocket, ShieldCheck } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { promotionReadiness } from "@/lib/models/validation.js";
import type { ManagedModel } from "@/components/models/model-command-center";

export function ModelPromotionPath({ models }: { models: ManagedModel[] }) {
  const testing = models.filter((model) => model.status === "testing");
  if (!testing.length) return null;
  return <section className="model-promotion-path">
    <header><div><span className="landing-kicker">MODEL PROMOTION PATH</span><h2>Let evidence earn the upgrade.</h2><p>A testing model becomes live only after its recommendations have enough immutable, official outcomes.</p></div><Badge tone="accent">{testing.length} TESTING</Badge></header>
    <div>{testing.map((model) => {
      const readiness = promotionReadiness(model.performance);
      return <Card key={model.id}><header><span><Rocket /> {model.name}</span><Badge tone={readiness.ready ? "success" : "warning"}>{readiness.ready ? "READY" : `${model.performance.verified}/10`}</Badge></header><div className="promotion-path-steps">{readiness.checks.map((check, index) => <article className={check.complete ? "complete" : ""} key={check.id}><i>{check.complete ? <Check /> : <Circle />}</i><span><strong>{check.label}</strong><small>{check.complete ? "Verified" : `${check.remaining} more result${check.remaining === 1 ? "" : "s"} needed`}</small></span>{index < readiness.checks.length - 1 ? <em /> : null}</article>)}</div><footer><ShieldCheck /> {readiness.ready ? "This model can join your active lineup." : "Testing results remain attached to this exact version."}</footer></Card>;
    })}</div>
  </section>;
}

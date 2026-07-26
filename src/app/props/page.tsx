import { Sparkles, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { PropsLab } from "@/components/props/props-lab";
import { getPropsBoard } from "@/services";

export const dynamic = "force-dynamic";

export default async function PropsPage() {
  const result = await getPropsBoard();
  return (
    <div className="product-page props-page">
      <section className="product-hero">
        <div><Badge tone="accent"><Sparkles size={11} /> V15 PROPS INTELLIGENCE</Badge><h1>Props Lab</h1><p>Discover, compare, save, and combine player props using model projection, hit rate, expected value, confidence, and correlation signals.</p></div>
        <div className="props-hero-stats"><span><Target /><strong>{result.data.length}</strong><small>Qualified props</small></span><span><TrendingUp /><strong>+{Math.max(...result.data.map((prop) => prop.expectedValue))}%</strong><small>Top EV</small></span></div>
      </section>
      <PropsLab props={result.data} provider={result.provider} updatedAt={result.updatedAt} />
    </div>
  );
}

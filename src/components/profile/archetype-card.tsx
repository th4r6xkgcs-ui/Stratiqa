import type { CSSProperties } from "react";
import { Sparkles } from "lucide-react";
import { buildPlaystyleArchetype, type PlaystyleInput } from "@/lib/profile/archetype";

type ChartStyle = CSSProperties & {
  "--value-end": string;
  "--confidence-end": string;
  "--props-end": string;
};

export function ArchetypeCard({ input, label = "LIVE ARCHETYPE", compact = false }: { input: PlaystyleInput; label?: string; compact?: boolean }) {
  const archetype = buildPlaystyleArchetype(input);
  const valueEnd = archetype.dimensions.Value;
  const confidenceEnd = valueEnd + archetype.dimensions.Confidence;
  const propsEnd = confidenceEnd + archetype.dimensions.Props;
  const style: ChartStyle = { "--value-end": `${valueEnd}%`, "--confidence-end": `${confidenceEnd}%`, "--props-end": `${propsEnd}%` };

  return (
    <div className={`archetype-card${compact ? " archetype-card--compact" : ""}`}>
      <div className="archetype-label"><span><i /> {label}</span><b>{archetype.signature}</b></div>
      <div className="archetype-core">
        <div className="archetype-chart" style={style}><div><Sparkles /><small>YOU ARE</small></div></div>
        <div className="archetype-copy"><span>YOUR STRATIQA ARCHETYPE</span><strong>{archetype.name}</strong><p>{archetype.description}</p></div>
      </div>
      <div className="archetype-legend">
        {(Object.entries(archetype.dimensions) as Array<[string, number]>).map(([name, value]) => <span data-dimension={name.toLowerCase()} key={name}><i />{name}<b>{value}%</b></span>)}
      </div>
      <div className="category-ratings">
        <header><span>SKILL RATINGS</span><small>Playstyle calibration</small></header>
        {Object.entries(archetype.categoryRatings).map(([name, value]) => <div key={name}><span><small>{name}</small><b>{value}</b></span><i><em style={{ width: `${value}%` }} /></i></div>)}
      </div>
      <p className="ranking-lock">Verified local and global ranks unlock after 25 graded picks.</p>
    </div>
  );
}

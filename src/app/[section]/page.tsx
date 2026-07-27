import { notFound } from "next/navigation";
import { SectionExperience } from "@/components/sections/section-experience";
import { StrategyLab } from "@/components/lab/strategy-lab";

const sectionSlugs = [
  "teams", "players", "community", "friends", "leaderboard",
  "groups", "alerts", "lab", "settings", "privacy", "terms", "support",
];

export function generateStaticParams() {
  return sectionSlugs.map((section) => ({ section }));
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sectionSlugs.includes(section)) notFound();
  if (section === "lab") return <StrategyLab />;
  return <SectionExperience section={section} />;
}

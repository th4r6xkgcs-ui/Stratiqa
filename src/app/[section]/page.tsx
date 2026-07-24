import { notFound } from "next/navigation";
import { SectionExperience } from "@/components/sections/section-experience";

const sectionSlugs = [
  "teams", "players", "props", "community", "friends", "leaderboard",
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
  return <SectionExperience section={section} />;
}

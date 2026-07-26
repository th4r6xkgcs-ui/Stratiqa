import { notFound, redirect } from "next/navigation";
import { SectionExperience } from "@/components/sections/section-experience";

const sectionSlugs = [
  "teams", "players", "community", "friends", "leaderboard",
  "groups", "alerts", "lab", "settings", "privacy", "terms", "support",
];
const redirects: Record<string, string> = {
  teams: "/matchups",
  players: "/props",
  community: "/leaderboard",
  friends: "/leaderboard",
  groups: "/leaderboard",
  alerts: "/dashboard#updates",
  settings: "/account",
  leaderboard: "/leaderboard",
  lab: "/lab",
};

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
  if (redirects[section]) redirect(redirects[section]);
  return <SectionExperience section={section} />;
}

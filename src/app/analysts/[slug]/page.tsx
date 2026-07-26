import { PublicAnalystProfile } from "@/components/rankings/public-analyst-profile";

export default async function AnalystProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicAnalystProfile slug={slug} />;
}

import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { Card } from "@/components/ui/primitives";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  return (
    <div className="page">
      <Link className="back-link" href="/dashboard"><ArrowLeft size={16} /> Dashboard</Link>
      <Card className="detail-card">
        <Construction size={28} />
        <span className="eyebrow">STRATIQA MODULE</span>
        <h1>{title}</h1>
        <p>This route remains available and is ready for its connected data module. The premium application shell and navigation are active across the experience.</p>
      </Card>
    </div>
  );
}

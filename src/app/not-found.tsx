import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
export default function NotFound() {
  return <div className="route-error"><Search /><h1>That intelligence report moved</h1><p>The requested route is unavailable or no longer part of the active slate.</p><Link href="/dashboard"><ArrowLeft /> Return to dashboard</Link></div>;
}

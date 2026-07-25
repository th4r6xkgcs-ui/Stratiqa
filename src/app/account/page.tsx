import { ShieldCheck } from "lucide-react";
import { AccountCenter } from "@/components/account/account-center";

export default function AccountPage() {
  return (
    <div className="product-page account-page">
      <section className="product-hero"><div><span className="eyebrow"><ShieldCheck size={13} /> SECURE ANALYST WORKSPACE</span><h1>One account. Every edge.</h1><p>Your personalized models, preferred markets, and AI Coach context—securely synchronized wherever you use STRATIQA.</p></div></section>
      <AccountCenter />
    </div>
  );
}

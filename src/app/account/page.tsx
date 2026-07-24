import { ShieldCheck } from "lucide-react";
import { AccountCenter } from "@/components/account/account-center";

export default function AccountPage() {
  return (
    <div className="product-page account-page">
      <section className="product-hero"><div><span className="eyebrow"><ShieldCheck size={13} /> V15.3 IDENTITY FOUNDATION</span><h1>Account and risk controls</h1><p>Secure session management and analyst-specific model preferences, designed for a production identity provider and persistent database.</p></div></section>
      <AccountCenter />
    </div>
  );
}

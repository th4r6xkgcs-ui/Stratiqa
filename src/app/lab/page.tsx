import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { ModelWorkshop } from "@/components/models/model-workshop";

export default function LabPage() {
  return <div className="product-page">
    <header className="product-hero"><div><Badge tone="accent"><FlaskConical size={11} /> MODEL WORKSHOP</Badge><h1>Build your model team</h1><p>No coding or complicated math required. Build category specialists in plain language, then prove each one with automatically verified picks.</p></div></header>
    <ModelWorkshop />
  </div>;
}

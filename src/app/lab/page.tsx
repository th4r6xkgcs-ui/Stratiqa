import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { ModelWorkshop } from "@/components/models/model-workshop";

export default function LabPage() {
  return <div className="product-page">
    <header className="product-hero"><div><Badge tone="accent"><FlaskConical size={11} /> MODEL LAB</Badge><h1>Build your edge</h1><p>Create specialized models, choose what they value, and build a verified track record one locked prediction at a time.</p></div></header>
    <ModelWorkshop />
  </div>;
}

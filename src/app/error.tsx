"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="page-error"><AlertTriangle /><h1>This page missed the line.</h1><p>Your account and saved work are safe. Retry the page to reconnect to STRATIQA&apos;s data services.</p><button onClick={reset}><RotateCcw /> Try again</button></div>;
}

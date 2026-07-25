"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("STRATIQA route error", { message: error.message, digest: error.digest }); }, [error]);
  return <div className="route-error"><AlertTriangle /><h1>Intelligence temporarily unavailable</h1><p>Your saved work is safe. Retry the request, or return after the next provider refresh.</p><button onClick={reset}><RotateCcw /> Try again</button>{error.digest ? <small>Reference: {error.digest}</small> : null}</div>;
}

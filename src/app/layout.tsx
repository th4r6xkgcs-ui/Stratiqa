import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "STRATIQA | See the edge. Understand why.", template: "%s | STRATIQA" },
  description: "Enterprise-grade sports intelligence with transparent AI reasoning, matchup analytics, live-ready market data, and a premium Props Lab.",
  openGraph: { title: "STRATIQA | Sports Intelligence, Rebuilt", description: "See the edge. Understand why.", type: "website", siteName: "STRATIQA", images: [{ url: "/og.png", width: 1536, height: 1024, alt: "STRATIQA sports intelligence platform" }] },
  twitter: { card: "summary_large_image", title: "STRATIQA | Sports Intelligence, Rebuilt", description: "See the edge. Understand why.", images: ["/og.png"] },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

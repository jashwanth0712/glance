import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage-grotesque",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Glance — AI Product Compass for Dev Teams",
    template: "%s | Glance",
  },
  description:
    "Glance helps dev teams decide what to build next — and what not to. AI-powered product prioritization for teams shipping with AI coding tools.",
  openGraph: {
    type: "website",
    title: "Glance — AI Product Compass",
    description:
      "Stop building the wrong things. AI made it fast — Glance makes it focused.",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@jashwanth0712",
    title: "Glance — AI Product Compass",
    description:
      "Stop building the wrong things. AI made it fast — Glance makes it focused.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#000000" }],
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" className="dark" dir="ltr">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${bricolageGrotesque.variable} antialiased`}
        >
          <Analytics />
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}

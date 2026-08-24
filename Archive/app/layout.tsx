import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://admin.tennisgrowth.com"),
  title: "Tennis Growth Admin",
  description: "A clear, professional operating system for tennis coaches and businesses.",
  openGraph: {
    title: "Tennis Growth Admin",
    description: "A clear, professional operating system for tennis coaches and businesses.",
    images: [{ url: "/tennis-growth-social.png", width: 1200, height: 630, alt: "Tennis Growth Admin" }],
  },
  twitter: { card: "summary_large_image", images: ["/tennis-growth-social.png"] },
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

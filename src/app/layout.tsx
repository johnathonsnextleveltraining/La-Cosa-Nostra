import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Cosa Nostra",
  description: "The family’s private sports command center.",
  applicationName: "La Cosa Nostra",
  appleWebApp: { capable: true, title: "La Cosa Nostra", statusBarStyle: "black-translucent" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: [{ url: "/apple-touch-icon-family.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

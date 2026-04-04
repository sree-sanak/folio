import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DynamicProvider } from "@/lib/dynamic-provider";

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: "Folio — Prime Broker in Your Pocket",
  description: "Spend against your portfolio at 0% interest. No selling, no margin calls.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-full" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <DynamicProvider>
          {children}
        </DynamicProvider>
      </body>
    </html>
  );
}

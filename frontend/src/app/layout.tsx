import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "LeadPulse AI - Australian Lead Scraper & Apollo Enrichment",
  description: "Enterprise SaaS for scraping Google Maps local businesses across Australia and enriching decision makers with Apollo.io",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-background text-gray-100 min-h-screen flex flex-col antialiased selection:bg-blue-600 selection:text-white`}>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-border bg-surface/50 py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
            <p>© 2026 LeadPulse AI. Fast Multi-Threaded Australian B2B Scraper & Enricher.</p>
            <div className="flex items-center gap-4">
              <span>FastAPI Backend</span>
              <span>•</span>
              <span>Playwright Headless</span>
              <span>•</span>
              <span>Apollo Enrichment</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

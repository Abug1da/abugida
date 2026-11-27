import type { Metadata } from "next";
import { Hanken_Grotesk, Noto_Sans_Ethiopic, Noto_Serif_Ethiopic } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Font files. Which font plays which role is decided in globals.css (the --font-* lines).
const latin = Hanken_Grotesk({ variable: "--font-latin", subsets: ["latin"] });
const fidelSans = Noto_Sans_Ethiopic({ variable: "--font-noto-sans-ethiopic", subsets: ["ethiopic"] });
const fidelSerif = Noto_Serif_Ethiopic({ variable: "--font-noto-serif-ethiopic", subsets: ["ethiopic"] });

export const metadata: Metadata = {
  title: { default: "Abugida", template: "%s · Abugida" },
  description: "Learn to read and speak Amharic, free.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${latin.variable} ${fidelSans.variable} ${fidelSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

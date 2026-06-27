import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { copy } from "@/lib/copy/es";
import { SiteHeader } from "@/components/landing/site-header";
import { UserMenu } from "@/components/header/user-menu";
import { WebVitalsReporter } from "@/components/observability/web-vitals-reporter";
import { DevErrorOverlay } from "@/components/observability/dev-error-overlay";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${copy.appName} — Tu CV, medido con honestidad`,
  description: copy.home.subtitle,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-CO"
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only rounded bg-accent px-4 py-2 font-medium text-accent-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Saltar al contenido
        </a>
        <SiteHeader extras={<UserMenu />} />
        {children}
        <WebVitalsReporter />
        <DevErrorOverlay />
      </body>
    </html>
  );
}

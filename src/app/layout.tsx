import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pampa-erp.com"),
  title: "PAMPA — Gestión comercial para tu negocio",
  description:
    "PAMPA centraliza ventas, stock, clientes y pagos en un solo sistema. El sistema desde el que manejás tu negocio.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: "PAMPA",
    title: "PAMPA — Gestión comercial para tu negocio",
    description:
      "Ventas, stock, clientes y pagos en un solo sistema. Escaneá, controlá tu inventario y vendé más rápido con PAMPA.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PAMPA — Gestión comercial para tu negocio",
    description:
      "Ventas, stock, clientes y pagos en un solo sistema. Escaneá, controlá tu inventario y vendé más rápido con PAMPA.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`h-full antialiased ${inter.variable} ${interTight.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

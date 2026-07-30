import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pampa-erp.com"),
  title: "PAMPA — ERP inteligente para empresas argentinas",
  description:
    "PAMPA es una plataforma de gestión en desarrollo para PyMEs argentinas. Empresas, sucursales, clientes, stock, ventas y automatización inteligente en un solo lugar.",
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
    title: "PAMPA — ERP inteligente para empresas argentinas",
    description:
      "Una nueva plataforma de gestión para PyMEs argentinas. Beta privada: 28 de agosto de 2026.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PAMPA — ERP inteligente para empresas argentinas",
    description:
      "Una nueva plataforma de gestión para PyMEs argentinas. Beta privada: 28 de agosto de 2026.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}

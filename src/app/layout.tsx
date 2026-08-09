import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pampa-erp.com"),
  title: "PAMPA — ERP inteligente para empresas argentinas",
  description:
    "PAMPA es un ERP para comercios argentinos, ya en Beta. Empresas, sucursales, clientes, productos, stock, ventas, pagos y reportes en un solo lugar.",
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
      "ERP para comercios argentinos, ya en Beta con acceso limitado. Ventas, stock, clientes, pagos y reportes en un solo lugar.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PAMPA — ERP inteligente para empresas argentinas",
    description:
      "ERP para comercios argentinos, ya en Beta con acceso limitado. Ventas, stock, clientes, pagos y reportes en un solo lugar.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}

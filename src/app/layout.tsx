import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://youfit-salada.vercel.app"),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "YouFit",
    title: "YouFit — saladas frescas na sua porta",
    description:
      "Saladas completas a partir de R$ 20,99, bebida opcional. Escolha os dias da semana e receba em casa.",
    images: [{ url: "/images/og.jpg", width: 1200, height: 630, alt: "Salada YouFit" }],
  },
  twitter: { card: "summary_large_image" },
  title: {
    default: "YouFit — saladas frescas na sua porta",
    template: "%s | YouFit",
  },
  description:
    "Monte seu pedido de saladas frescas e escolha os melhores dias para receber em casa.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#173f32",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html className={`${sans.variable} ${display.variable}`} lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

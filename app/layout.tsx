import type { Metadata, Viewport } from "next";
import { Archivo, Noto_Sans_Myanmar } from "next/font/google";
import "./globals.css";

// Archivo carries the UI; Noto Sans Myanmar renders Burmese under it and under
// any clinic's brand font.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });
const myanmar = Noto_Sans_Myanmar({ variable: "--font-myanmar", subsets: ["myanmar"] });

export const metadata: Metadata = {
  title: { default: "Booking Widget", template: "%s · Booking Widget" },
  description: "Online booking for clinics that looks like your own website, in Burmese and English.",
};

export const viewport: Viewport = {
  themeColor: "#e6e6e3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${myanmar.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

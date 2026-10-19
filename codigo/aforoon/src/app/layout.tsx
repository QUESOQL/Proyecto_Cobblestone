import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AforoON",
  description: "Control de aforo, reservas y check-in con carnet para el hub de coworking de Providencia.",
};

export const viewport: Viewport = {
  themeColor: "#eeece8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CL">
      <body className={`${dmSans.variable} antialiased`}>{children}</body>
    </html>
  );
}

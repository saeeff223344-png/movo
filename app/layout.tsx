import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { NoFlashScript } from "@/components/providers/NoFlashScript";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MOVO | موفو — حوّل فكرتك إلى فيديو",
  description:
    "منصة عربية وعالمية لإنشاء فيديوهات موشن جرافيك وإعلانات فيديو احترافية بدقائق، بدون خبرة تصميم.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`dark ${cairo.variable}`} suppressHydrationWarning>
      <head>
        <NoFlashScript />
      </head>
      <body className="min-h-screen bg-base font-sans text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

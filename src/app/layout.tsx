import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ToastProvider from "@/components/ui/ToastProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Wallpaper API — Live Video Wallpaper Content API",
    template: "%s | Wallpaper API",
  },
  description:
    "Premium live wallpaper content API for modern applications. Upload, manage, and deliver MP4/WebM wallpapers through a secure REST API.",
  keywords: ["wallpaper api", "live wallpaper", "video wallpaper", "rest api", "developer api"],
  openGraph: {
    title: "Wallpaper API",
    description: "Premium live wallpaper content API for modern applications.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}

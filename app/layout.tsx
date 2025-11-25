import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TranscriberProvider } from "@/contexts/TranscriberContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Browser FFmpeg POC - Video & Audio Processing",
  description: "High-performance browser-based media processing using FFmpeg WebAssembly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TranscriberProvider>
          {children}
        </TranscriberProvider>
      </body>
    </html>
  );
}


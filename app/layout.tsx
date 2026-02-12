import type { Metadata } from "next";
import { Inter, Audiowide, Special_Elite, Barrio } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { TranscriberProvider } from "@/contexts/TranscriberContext";
import { FontProvider } from "@/contexts/FontContext";
import { EnhancerProvider } from "@/contexts/EnhancerContext";

const inter = Inter({ subsets: ["latin"] });

// Neural Groove Fonts
const audiowide = Audiowide({ 
  weight: '400',
  subsets: ["latin"],
  variable: '--font-audiowide'
});

const specialElite = Special_Elite({ 
  weight: '400',
  subsets: ["latin"],
  variable: '--font-special-elite'
});

const barrio = Barrio({ 
  weight: '400',
  subsets: ["latin"],
  variable: '--font-barrio'
});

// Science Gothic (not available in next/font/google, so we'll use a fallback or load it differently)
// For now, we'll use a similar tech font as fallback

export const metadata: Metadata = {
  title: "Neural Groove Spectrum Divergent - AI Media Processing",
  description: "High-performance browser-based media processing using FFmpeg WebAssembly and AI",
  icons: {
    icon: "/branding/NeuralGrooveIcon.png",
    apple: "/branding/NeuralGrooveIcon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Favicon */}
        <link rel="icon" href="/branding/NeuralGrooveIcon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/branding/NeuralGrooveIcon.png" />
        {/* Preload Science Gothic from Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.className} ${audiowide.variable} ${specialElite.variable} ${barrio.variable}`}>
        <FontProvider>
          <TranscriberProvider>
            <EnhancerProvider>
              {children}
            </EnhancerProvider>
          </TranscriberProvider>
        </FontProvider>
      </body>
    </html>
  );
}


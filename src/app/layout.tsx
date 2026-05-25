import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Stampomad — Stamp the World",
  description: "Track every country, map every trip, journal your adventures, and earn badges as you explore the globe.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✈️</text></svg>",
  },
  openGraph: {
    title: "Stampomad — Stamp the World",
    description: "Track every country, map every trip, journal your adventures, and earn badges as you explore the globe.",
    siteName: "Stampomad",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stampomad — Stamp the World",
    description: "Track every country, map every trip, journal your adventures.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('stampomad-theme');if(t&&['dark','light','colorful'].includes(t))document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
        <script src="https://cdn.jsdelivr.net/npm/topojson-client@3" defer />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

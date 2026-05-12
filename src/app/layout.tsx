import type { Metadata } from "next";
import Script from "next/script";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { SITE_URL, BUSINESS } from "@/lib/seo/site";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

const DEFAULT_TITLE =
  "Romolo's Cannoli | Authentic Sicilian Cannoli in San Mateo Since 1968";
const DEFAULT_DESCRIPTION =
  "Handcrafted Sicilian cannoli, dolci, and gelato in San Mateo. Fresh ricotta, crispy shells, and traditional family recipes — three generations since 1968.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | Romolo's Cannoli",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: BUSINESS.legalName,
  keywords: [
    "cannoli San Mateo",
    "Italian bakery San Mateo",
    "Sicilian cannoli Bay Area",
    "gelato San Mateo",
    "Italian desserts Peninsula",
    "ricotta cannoli",
    "Romolo's Cannoli",
  ],
  authors: [{ name: BUSINESS.legalName }],
  creator: BUSINESS.legalName,
  publisher: BUSINESS.legalName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: BUSINESS.legalName,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

const SQUARE_SDK_URL =
  process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        {children}
        <Script src={SQUARE_SDK_URL} strategy="afterInteractive" />
      </body>
    </html>
  );
}

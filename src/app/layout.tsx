import type { Metadata, Viewport } from "next";
import { Open_Sans, Fraunces } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/toast";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Gabriela Nails",
  description: "Agendamiento de turnos para manicura",
  metadataBase: new URL("https://www.gabriela.com.ar"),
  openGraph: {
    title: "Gabriela Nails",
    description: "Reservá tu turno online",
    url: "https://www.gabriela.com.ar/",
    siteName: "Gabriela Nails",
    locale: "es_AR",
    type: "website",
    images: [
      {
        url: "https://www.gabriela.com.ar/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Gabriela Nails",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Gabriela Nails",
    description: "Reservá tu turno online",
    images: ["https://www.gabriela.com.ar/icons/icon-512.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#C65860",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${openSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Toaster>{children}</Toaster>
        <script
          dangerouslySetInnerHTML={{
            __html: `if ("serviceWorker" in navigator) { navigator.serviceWorker.register("/sw.js").catch(() => {}); }`,
          }}
        />
      </body>
    </html>
  );
}

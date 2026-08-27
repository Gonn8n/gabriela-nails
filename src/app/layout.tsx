import type { Metadata } from "next";
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
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${openSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}

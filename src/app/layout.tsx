import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "./hooks/useCart";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import Header from "./components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://blank-eg.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Blank EG — Premium Egyptian Streetwear",
    template: "%s | Blank EG",
  },
  description:
    "Premium Egyptian streetwear brand focused on oversized essentials and timeless fashion. Shop the latest collection of premium tees and streetwear.",
  keywords: [
    "blank eg", "egyptian streetwear", "oversized tees", "premium essentials",
    "egypt fashion", "streetwear cairo", "blank clothing",
  ],
  authors: [{ name: "Blank EG" }],
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Blank EG",
    title: "Blank EG — Premium Egyptian Streetwear",
    description: "Premium Egyptian streetwear brand focused on oversized essentials and timeless fashion.",
    images: [{ url: "/logo.png", width: 260, height: 72 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blank EG — Premium Egyptian Streetwear",
    description: "Premium Egyptian streetwear brand focused on oversized essentials.",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
  },
  robots: {
    index: true,
    follow: true,
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
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <Header />
              <div className="flex-1 pt-8">{children}</div>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

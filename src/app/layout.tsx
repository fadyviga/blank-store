import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "./hooks/useCart";
import { ToastProvider } from "./components/Toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Blank EG",
  description:
    "Premium Egyptian streetwear brand focused on oversized essentials and timeless fashion.",

  icons: {
    icon: "/logo.png",
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
        <CartProvider>
          <ToastProvider>{children}</ToastProvider>
        </CartProvider>
      </body>
    </html>
  );
}

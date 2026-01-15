import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/navbar";
import MiniCartDrawer from "@/components/mini-cart-drawer";
import { CartUIProvider } from "@/lib/cart-ui";
import { AuthProvider } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LOOPAWE",
  description: "AI powered creator marketplace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-zinc-900`}>
        <AuthProvider>
          <CartUIProvider>
            <Navbar />
            {children}
            <MiniCartDrawer />
          </CartUIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
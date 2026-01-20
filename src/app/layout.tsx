import type { Metadata } from "next";
import "./globals.css";

import Navbar from "@/components/navbar";
import MiniCartDrawer from "@/components/mini-cart-drawer";
import { ToastProvider } from "@/components/toast-provider";

import { AuthProvider } from "@/lib/auth";
import { CartUIProvider } from "@/lib/cart-ui";

export const metadata: Metadata = {
  title: "LOOPA",
  description: "AI-powered custom clothing platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className="antialiased bg-white text-zinc-900">
        <AuthProvider>
          <CartUIProvider>
            <ToastProvider>
              {/* Global UI */}
              <Navbar />
              <MiniCartDrawer />

              {/* Page content */}
              <main>{children}</main>
            </ToastProvider>
          </CartUIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
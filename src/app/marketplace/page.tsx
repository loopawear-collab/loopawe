// src/app/marketplace/page.tsx
import MarketplaceClient from "@/components/marketplace/MarketplaceClient";

export const metadata = {
  title: "Marketplace • LOOPA",
  description: "Discover trending designs and new drops on LOOPA Marketplace.",
};

export default function MarketplacePage() {
  return <MarketplaceClient />;
}
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const links = [
    { href: "/designer", label: "Designer" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/cart", label: "Cart" },
  ];

  function isActive(href: string) {
    return pathname === href;
  }

  function handleLogout() {
    logout();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-xl font-semibold tracking-[0.32em] text-zinc-900"
          aria-label="Loopa home"
        >
          LOOPA
        </Link>

        <nav className="flex items-center gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                "rounded-full px-4 py-2 text-sm font-medium transition " +
                (isActive(l.href)
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900")
              }
            >
              {l.label}
            </Link>
          ))}

          {/* Auth area */}
          {user ? (
            <>
              <Link
                href="/account"
                className={
                  "ml-2 rounded-full px-4 py-2 text-sm font-semibold transition " +
                  (isActive("/account")
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                }
              >
                Account
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={
                  "ml-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 " +
                  (isActive("/login") ? "ring-2 ring-zinc-900/10" : "")
                }
              >
                Login
              </Link>

              <Link
                href="/register"
                className={
                  "rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 " +
                  (isActive("/register") ? "ring-2 ring-zinc-900/10" : "")
                }
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
import Link from "next/link";

export default function HomePage() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(24,24,27,0.06),transparent_55%)]" />
      <div className="mx-auto max-w-6xl px-6 py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-900 sm:text-6xl">
            Design your perfect T-shirt with AI
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-zinc-600">
            Create custom apparel in minutes. Upload your designs or use AI to bring your ideas to life.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/designer"
              className="w-full rounded-full bg-zinc-900 px-8 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-zinc-800 sm:w-auto"
            >
              Design Your T-shirt
            </Link>

            <Link
              href="/marketplace"
              className="w-full rounded-full border border-zinc-200 bg-white px-8 py-4 text-base font-semibold text-zinc-900 transition hover:bg-zinc-50 sm:w-auto"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
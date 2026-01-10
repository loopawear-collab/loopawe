export default function HomePage() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(24,24,27,0.06),transparent_55%)]" />
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-xs font-medium tracking-[0.35em] text-zinc-500">
            LOOPA
          </p>

          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            AI-powered custom clothing platform
          </h1>

          <p className="mt-4 text-base leading-relaxed text-zinc-600">
            Design, upload, and sell premium apparel—built for creators and
            brands.
          </p>

          <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-medium text-zinc-900">Coming Soon</h2>

            <ul className="mt-6 space-y-3 text-sm text-zinc-700">
              {[
                "AI T-shirt & hoodie designer",
                "Upload & enhance your own images",
                "Creator shops & earnings",
                "Marketplace with trending designs",
                "Worldwide shipping",
              ].map((t) => (
                <li key={t} className="flex items-center justify-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>

            <p className="mt-8 text-xs text-zinc-500">
              Follow us — something big is coming.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
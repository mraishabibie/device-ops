import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-50 font-sans p-6">
      <div className="w-full max-w-2xl text-center space-y-8">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold tracking-wider uppercase mb-2">
            Foundation Ready
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            DeviceOps <span className="text-blue-500">SaaS</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-lg mx-auto">
            Lightweight, cloud-based platform for operational visibility of company-owned Android devices.
          </p>
        </header>

        <main className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
              <h3 className="font-semibold text-zinc-200">Next.js App Router</h3>
              <p className="text-xs text-zinc-500">TypeScript strict mode enabled</p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
              <h3 className="font-semibold text-zinc-200">Tailwind CSS v4</h3>
              <p className="text-xs text-zinc-500">Styled with modern design system</p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
              <h3 className="font-semibold text-zinc-200">shadcn/ui Initialized</h3>
              <p className="text-xs text-zinc-500">Reusable primitives ready for dashboard design</p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
              <h3 className="font-semibold text-zinc-200">Feature Architecture</h3>
              <p className="text-xs text-zinc-500">Modular structure in src/features/</p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg shadow-lg shadow-blue-500/20 transition-all text-center cursor-pointer"
            >
              Go to Authentication (Locked)
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Learn more &rarr;
            </a>
          </div>
        </main>

        <footer className="text-xs text-zinc-600">
          DeviceOps SaaS Framework &bull; Stage 2 Foundation Complete
        </footer>
      </div>
    </div>
  );
}

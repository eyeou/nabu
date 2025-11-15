import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white/70 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-semibold text-indigo-600">
          LevelPath
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link href="/dashboard" className="hover:text-indigo-600">
            Dashboard
          </Link>
          <Link href="/programs" className="hover:text-indigo-600">
            Programs
          </Link>
          <Link href="/classes" className="hover:text-indigo-600">
            Classes
          </Link>
          <Link href="/auth" className="rounded-md border border-indigo-500 px-3 py-1 text-indigo-500 transition hover:bg-indigo-500 hover:text-white">
            Sign In
          </Link>
        </div>
      </nav>
    </header>
  );
}

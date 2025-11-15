import Link from "next/link";

export default function AuthPage() {
  return (
    <div className="mx-auto max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
        <p className="text-sm text-slate-500">
          Sign in to manage your differentiated learning programs.
        </p>
      </div>

      <div className="space-y-6">
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@school.edu"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Sign In
          </button>
        </form>

        <div className="text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
            Create a teacher account
          </Link>
        </div>
      </div>
    </div>
  );
}

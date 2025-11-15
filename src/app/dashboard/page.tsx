import { DashboardCard } from "@/components/DashboardCard";
import Link from "next/link";

export default async function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your programs and classes to personalize learning for every student.
          </p>
        </div>
        <Link
          href="/programs/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          New Program
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DashboardCard
          title="Programs"
          description="Design learning pathways and connect lessons across topics."
          href="/programs"
          actionLabel="View Programs"
        />
        <DashboardCard
          title="Classes"
          description="Track student mastery and adapt assignments to their needs."
          href="/classes"
          actionLabel="View Classes"
        />
      </div>
    </div>
  );
}

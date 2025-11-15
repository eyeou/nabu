import Link from "next/link";
import React from "react";

interface DashboardCardProps {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}

export function DashboardCard({ title, description, href, actionLabel }: DashboardCardProps) {
  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
      <div className="mt-6">
        <Link
          href={href}
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}

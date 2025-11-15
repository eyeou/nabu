import Link from "next/link";
import React from "react";
import clsx from "clsx";

type CircleNodeProps = {
  label: string;
  onClick?: () => void;
  className?: string;
  statusColor?: string;
  subtitle?: string;
  href?: string;
};

export function CircleNode({ label, onClick, className, statusColor, subtitle, href }: CircleNodeProps) {
  const baseClasses = clsx(
    "flex h-20 w-20 flex-col items-center justify-center rounded-full border border-slate-300 bg-white text-center text-sm font-medium shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500",
    className
  );

  const content = (
    <>
      <span className="px-2 text-xs font-semibold text-slate-700">{label}</span>
      {subtitle && <span className="mt-1 text-[10px] text-slate-500">{subtitle}</span>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={baseClasses}
        style={statusColor ? { borderColor: statusColor } : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseClasses}
      style={statusColor ? { borderColor: statusColor } : undefined}
    >
      {content}
    </button>
  );
}

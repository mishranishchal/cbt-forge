"use client";

import Link from "next/link";

export function AppNav() {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm">
      {[
        ["Home", "/"],
        ["Create CBT", "/upload"],
        ["My Tests", "/tests"],
        ["History", "/history"],
        ["Settings", "/settings"]
      ].map(([label, href]) => (
        <Link key={href} className="rounded-md border border-line bg-white px-3 py-2 font-medium text-ink hover:border-forge dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" href={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

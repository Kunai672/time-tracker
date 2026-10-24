"use client";

import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/entries", label: "Entries" },
  { href: "/categories", label: "Categories" },
  { href: "/reports", label: "Reports" },
  { href: "/data", label: "Data" },
];

export function Nav() {
  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-4xl flex-wrap gap-4 p-4">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="font-medium hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

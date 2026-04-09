"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTodo, Calendar, Grid3X3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Schedule", href: "/schedule", icon: Calendar },
  { label: "Roles", href: "/roles", icon: Grid3X3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-background md:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors",
              active
                ? "text-blue-600 font-medium"
                : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

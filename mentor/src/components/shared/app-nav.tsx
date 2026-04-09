"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const tabs = [
  { label: "Tasks", href: "/tasks" },
  { label: "Schedule", href: "/schedule" },
  { label: "Roles", href: "/roles" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b px-4 h-12">
      <Link
        href="/tasks"
        className="font-semibold text-lg mr-4 text-foreground"
      >
        Mentor
      </Link>

      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              pathname.startsWith(tab.href)
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/settings"
          className={cn(
            "px-3 py-1.5 text-sm rounded-md transition-colors",
            pathname.startsWith("/settings")
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          Settings
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign out
        </Button>
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Mail,
  FileSearch,
  AtSign,
  Link2,
  Shield,
  History,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/email-analysis", label: "Email Analyzer", icon: Mail },
  { href: "/file-analysis", label: "File Analyzer", icon: FileSearch },
  { href: "/email-verify", label: "Email Verifier", icon: AtSign },
  { href: "/url-analysis", label: "URL Analyzer", icon: Link2 },
  { href: "/threat-intel", label: "Threat Intel", icon: Shield },
  { href: "/history", label: "History", icon: History },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">CENTINELA TIC</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Cybersecurity Platform</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground text-center">v1.0.0 — Local</p>
      </div>
    </aside>
  );
}

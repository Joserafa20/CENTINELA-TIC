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
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV_ITEMS = [
  { href: "/",               label: "Dashboard",     icon: LayoutDashboard },
  { href: "/email-analysis", label: "Email Analyzer", icon: Mail },
  { href: "/file-analysis",  label: "File Analyzer",  icon: FileSearch },
  { href: "/email-verify",   label: "Email Verifier", icon: AtSign },
  { href: "/url-analysis",   label: "URL Analyzer",   icon: Link2 },
  { href: "/threat-intel",   label: "Threat Intel",   icon: ShieldAlert },
  { href: "/history",        label: "History",        icon: History },
  { href: "/reports",        label: "Reports",        icon: FileText },
  { href: "/settings",       label: "Settings",       icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 shrink-0 flex flex-col h-full"
      style={{
        background: "var(--sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
            style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
              boxShadow: "0 0 16px rgba(14,165,233,0.35)",
            }}
          >
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <span
              className="font-bold text-sm tracking-widest uppercase"
              style={{ color: "var(--sidebar-foreground)" }}
            >
              Centinela
            </span>
            <p
              className="text-xs font-medium tracking-wide"
              style={{ color: "rgba(148,163,184,0.7)" }}
            >
              TIC Security Platform
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p
          className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest"
          style={{ color: "rgba(148,163,184,0.45)" }}
        >
          Analysis
        </p>
        {NAV_ITEMS.slice(0, 6).map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
              )}
              style={
                active
                  ? {
                      background: "var(--sidebar-accent)",
                      color: "var(--primary)",
                      boxShadow: "inset 2px 0 0 var(--primary)",
                    }
                  : {
                      color: "var(--sidebar-foreground)",
                      opacity: 0.75,
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--sidebar-accent)";
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "";
                  (e.currentTarget as HTMLElement).style.opacity = "0.75";
                }
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}

        <div className="pt-3">
          <p
            className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "rgba(148,163,184,0.45)" }}
          >
            Reports & Config
          </p>
          {NAV_ITEMS.slice(6).map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150"
                style={
                  active
                    ? {
                        background: "var(--sidebar-accent)",
                        color: "var(--primary)",
                        boxShadow: "inset 2px 0 0 var(--primary)",
                      }
                    : {
                        color: "var(--sidebar-foreground)",
                        opacity: 0.75,
                      }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--sidebar-accent)";
                    (e.currentTarget as HTMLElement).style.opacity = "1";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "";
                    (e.currentTarget as HTMLElement).style.opacity = "0.75";
                  }
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }}
          />
          <p
            className="text-xs"
            style={{ color: "rgba(148,163,184,0.5)" }}
          >
            v1.0 · Local
          </p>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}

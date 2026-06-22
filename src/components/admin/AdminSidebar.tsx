"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Video } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { APP, SIDEBAR_NAV, THEME } from "@/config/app";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  storageUsed?: number;
}

export default function AdminSidebar({ isOpen, onClose, storageUsed = 0 }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === href;
    if (href === "/admin/wallpapers" || href === "/admin/animations") {
      return (
        pathname === href ||
        (pathname.startsWith(href + "/") &&
          !pathname.includes("/add") &&
          !pathname.includes("/upload") &&
          !pathname.includes("/zip-upload") &&
          !pathname.includes("/edit") &&
          !pathname.includes("/dashboard"))
      );
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-[17.5rem] bg-white border-r border-slate-200/70 flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto shadow-premium-lg lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-5 border-b border-slate-200/70">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group" onClick={onClose}>
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shadow-violet-600/20 transition-transform group-hover:scale-105",
                THEME.brandIcon
              )}
            >
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base block leading-tight">{APP.name}</span>
              <span className="text-[11px] text-slate-400 font-medium">Admin Dashboard</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {SIDEBAR_NAV.map((item, index) => {
            if ("type" in item && item.type === "header") {
              return (
                <div
                  key={`header-${index}`}
                  className="px-3.5 pt-4 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                >
                  {item.label}
                </div>
              );
            }
            const navItem = item as { href: string; label: string; icon: React.ComponentType<any> };
            const Icon = navItem.icon;
            return (
              <Link
                key={navItem.href}
                href={navItem.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive(navItem.href)
                    ? cn(THEME.activeNav, "shadow-sm")
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {navItem.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200/70">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Logout
          </button>
        </div>

        <div className="p-4 m-3 bg-gradient-to-br from-violet-50/80 to-indigo-50/50 rounded-2xl border border-violet-100/60">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Storage Used</p>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-bold text-slate-900">{formatFileSize(storageUsed)}</span>
            <span className="text-xs text-violet-600 font-medium bg-violet-100/80 px-2 py-0.5 rounded-full">
              Unlimited
            </span>
          </div>
          <div className="w-full bg-slate-200/60 rounded-full h-1.5">
            <div
              className={cn("h-1.5 rounded-full transition-all duration-500", THEME.storageBar)}
              style={{ width: `${Math.min(100, Math.max(8, (storageUsed / (500 * 1024 * 1024)) * 100))}%` }}
            />
          </div>
        </div>
      </aside>
    </>
  );
}

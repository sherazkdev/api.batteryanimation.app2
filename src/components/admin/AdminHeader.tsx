"use client";

import { Bell, Menu, Search, ChevronDown } from "lucide-react";
import { APP, THEME } from "@/config/app";

interface AdminHeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export default function AdminHeader({ onMenuClick, title }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 px-4 lg:px-6 h-16 flex items-center gap-4">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2.5 rounded-xl hover:bg-violet-50 text-slate-600 hover:text-violet-700 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {title && (
        <h1 className="text-lg font-semibold text-slate-900 lg:hidden truncate">{title}</h1>
      )}

      <div className="flex-1 max-w-xl mx-auto hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search wallpapers..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white ${THEME.focusRing}`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span className="hidden md:inline-flex text-xs font-semibold text-violet-700 bg-violet-50 px-3 py-1.5 rounded-full border border-violet-100/80">
          {APP.name}
        </span>
        <button
          className="relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200/70">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-violet-500/25">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-900 leading-tight">Admin</p>
            <p className="text-xs text-slate-500">{APP.name}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
        </div>
      </div>
    </header>
  );
}

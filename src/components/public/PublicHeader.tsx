import Link from "next/link";
import { Video, Shield } from "lucide-react";
import Button from "@/components/ui/Button";
import { APP, PUBLIC_NAV } from "@/config/app";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg">{APP.name}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {PUBLIC_NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/admin/login">
          <Button size="sm" className="gap-2">
            <Shield className="w-4 h-4" /> Admin Panel
          </Button>
        </Link>
      </div>
    </header>
  );
}

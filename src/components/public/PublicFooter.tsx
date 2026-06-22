import Link from "next/link";
import { Video } from "lucide-react";
import { APP } from "@/config/app";

export default function PublicFooter() {
  return (
    <footer className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Video className="w-6 h-6" />
              <span className="font-bold text-lg">{APP.name}</span>
            </div>
            <p className="text-violet-100 text-sm max-w-sm">{APP.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link href="/docs" className="text-violet-100 hover:text-white transition-colors">
              Documentation
            </Link>
            <Link href="/explorer" className="text-violet-100 hover:text-white transition-colors">
              API Explorer
            </Link>
            <Link href="/contact" className="text-violet-100 hover:text-white transition-colors">
              Contact
            </Link>
            <Link href="/privacy" className="text-violet-100 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-violet-100 hover:text-white transition-colors">
              Terms
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-violet-100">
          <p>&copy; {new Date().getFullYear()} {APP.name}. All rights reserved.</p>
          <p>
            Questions?{" "}
            <a href={`mailto:${APP.supportEmail}`} className="underline hover:text-white">
              {APP.supportEmail}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Video,
  Clapperboard,
  FolderOpen,
  HardDrive,
  Activity,
  BarChart3,
  CloudUpload,
  FolderArchive,
  ArrowRight,
} from "lucide-react";
import StatsCard from "@/components/admin/StatsCard";
import PageHeader from "@/components/admin/PageHeader";
import Button from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { formatFileSize, safeJson } from "@/lib/utils";

interface ConsolidatedStats {
  totalWallpapers: number;
  publishedWallpapers: number;
  draftWallpapers: number;
  totalAnimations: number;
  publishedAnimations: number;
  draftAnimations: number;
  totalCategories: number;
  storageUsed: number;
  wallpaperStorageUsed: number;
  animationStorageUsed: number;
  apiStatus: "Active" | "Inactive";
  totalApiRequests: number;
}

export default function UnifiedDashboardPage() {
  const [stats, setStats] = useState<ConsolidatedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => safeJson<ConsolidatedStats>(r))
      .then((res) => {
        if (res?.success && res.data) {
          setStats(res.data);
        } else {
          setError("Unable to load stats. Check database connection.");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to connect to the server.");
        setLoading(false);
      });
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden shadow-premium-lg">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <h2 className="text-2xl lg:text-3xl font-bold">Media Content API Hub</h2>
          <p className="text-violet-100 mt-2 text-sm lg:text-base max-w-xl">
            Control center for your Live Video Wallpapers and Animations. Monitor API status, manage items, and optimize storage.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          {error}
        </div>
      )}

      <PageHeader title="API Hub Overview" subtitle="System metrics across all media content categories." />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatsCard
          title="Total API Requests"
          value={stats?.totalApiRequests || 0}
          icon={BarChart3}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          subtitle="Lifetime request count"
        />
        <StatsCard
          title="API Service Status"
          value={stats?.apiStatus || "Active"}
          icon={Activity}
          iconColor="text-green-600"
          iconBg="bg-green-50"
          subtitle="Gateway is live and healthy"
        />
        <StatsCard
          title="Total Storage Used"
          value={formatFileSize(stats?.storageUsed || 0)}
          icon={HardDrive}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          subtitle={`Wallpapers: ${formatFileSize(stats?.wallpaperStorageUsed || 0)} | Animations: ${formatFileSize(stats?.animationStorageUsed || 0)}`}
        />
      </div>

      {/* Module Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wallpapers Card */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-premium overflow-hidden p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shadow-sm">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Live Video Wallpapers</h3>
                <p className="text-xs text-slate-500">Deliver rich backgrounds and video loops</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl text-center">
              <div>
                <span className="block text-xl font-bold text-slate-900">{stats?.totalWallpapers || 0}</span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Total</span>
              </div>
              <div>
                <span className="block text-xl font-bold text-green-600">{stats?.publishedWallpapers || 0}</span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Published</span>
              </div>
              <div>
                <span className="block text-xl font-bold text-amber-500">{stats?.draftWallpapers || 0}</span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Drafts</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <Link href="/admin/wallpapers/dashboard" className="flex-1 min-w-[120px]">
              <Button className="w-full justify-center gap-1.5" size="sm">
                Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/admin/wallpapers" className="flex-1 min-w-[120px]">
              <Button variant="outline" className="w-full justify-center" size="sm">
                Listings
              </Button>
            </Link>
            <Link href="/admin/wallpapers/add" className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center">
              <CloudUpload className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Animations Card */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-premium overflow-hidden p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                <Clapperboard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Battery Animations</h3>
                <p className="text-xs text-slate-500">Provide fluid battery charge animations</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 bg-slate-50 p-4 rounded-xl text-center">
              <div>
                <span className="block text-xl font-bold text-slate-900">{stats?.totalAnimations || 0}</span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Total</span>
              </div>
              <div>
                <span className="block text-xl font-bold text-green-600">{stats?.publishedAnimations || 0}</span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Published</span>
              </div>
              <div>
                <span className="block text-xl font-bold text-amber-500">{stats?.draftAnimations || 0}</span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Drafts</span>
              </div>
              <div>
                <span className="block text-xl font-bold text-indigo-600">{stats?.totalCategories || 0}</span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Categories</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <Link href="/admin/animations/dashboard" className="flex-1 min-w-[120px]">
              <Button className="w-full justify-center gap-1.5" size="sm">
                Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/admin/animations" className="flex-1 min-w-[120px]">
              <Button variant="outline" className="w-full justify-center" size="sm">
                Listings
              </Button>
            </Link>
            <Link href="/admin/animations/add" className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center">
              <CloudUpload className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

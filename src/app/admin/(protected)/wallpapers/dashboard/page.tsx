"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Video,
  CheckCircle,
  FileText,
  HardDrive,
  Activity,
  BarChart3,
  Pencil,
  Trash2,
} from "lucide-react";
import StatsCard from "@/components/admin/StatsCard";
import PageHeader from "@/components/admin/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import WallpaperThumbnail from "@/components/admin/WallpaperThumbnail";
import { formatFileSize, formatDate, safeJson } from "@/lib/utils";
import { DashboardStats, Wallpaper } from "@/types/wallpaper";
import { ConfirmModal } from "@/components/ui/Modal";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => safeJson(r)),
      fetch("/api/admin/wallpapers?limit=5").then((r) => safeJson(r)),
    ])
      .then(([statsRes, wallpapersRes]) => {
        if (statsRes?.success) setStats(statsRes.data as DashboardStats);
        else if (!statsRes) setError("Unable to load dashboard stats. Check your database connection.");
        if (wallpapersRes?.success) {
          const data = wallpapersRes.data as { wallpapers: Wallpaper[] };
          setWallpapers(data.wallpapers);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to connect to the server.");
        setLoading(false);
      });
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/wallpapers/${deleteId}`, { method: "DELETE" });
      const data = await safeJson(res);
      if (data?.success) {
        setWallpapers((prev) => prev.filter((w) => w.id !== deleteId));
        toast.success("Wallpaper deleted");
      } else {
        toast.error(data?.message || "Delete failed");
      }
    } catch {
      toast.error("Failed to delete wallpaper");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 lg:p-8 mb-6 text-white relative overflow-hidden shadow-premium-lg">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <h2 className="text-2xl font-bold">Welcome back, Admin!</h2>
          <p className="text-violet-100 mt-1 text-sm">Manage your wallpaper API content and monitor system activity.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          {error}
        </div>
      )}

      <PageHeader title="Dashboard" subtitle="Overview of your wallpaper API system." />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatsCard title="Total Live Wallpapers" value={stats?.totalWallpapers || 0} icon={Video} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatsCard title="Published Wallpapers" value={stats?.publishedWallpapers || 0} icon={CheckCircle} iconColor="text-green-600" iconBg="bg-green-50" />
        <StatsCard title="Draft Wallpapers" value={stats?.draftWallpapers || 0} icon={FileText} iconColor="text-orange-600" iconBg="bg-orange-50" />
        <StatsCard title="Total API Requests" value={stats?.totalApiRequests || 0} icon={BarChart3} iconColor="text-purple-600" iconBg="bg-purple-50" subtitle="This month" />
        <StatsCard title="Storage Used" value={formatFileSize(stats?.storageUsed || 0)} icon={HardDrive} iconColor="text-red-600" iconBg="bg-red-50" subtitle="Unlimited storage" />
        <StatsCard title="API Status" value={stats?.apiStatus || "Active"} icon={Activity} iconColor="text-green-600" iconBg="bg-green-50" subtitle="System is running smoothly" />
      </div>

      {/* Recent Wallpapers */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-premium overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Recent Wallpapers</h3>
          <Link href="/admin/wallpapers">
            <Button variant="outline" size="sm">View All Wallpapers</Button>
          </Link>
        </div>
        {wallpapers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No wallpapers yet. Upload your first wallpaper!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Order</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Thumbnail</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Created Date</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {wallpapers.map((wp) => (
                  <tr key={wp.id} className="border-b border-slate-50 table-row-hover hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                        {wp.order}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="w-12 h-8 rounded overflow-hidden bg-slate-100">
                        <WallpaperThumbnail url={wp.url} thumbnailUrl={wp.thumbnailUrl} fileName={wp.fileName} name={wp.name} />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">{wp.name}</td>
                    <td className="px-5 py-3">
                      <Badge variant={wp.status === "Published" ? "success" : "warning"}>{wp.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">{formatDate(wp.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/wallpapers/edit/${wp.id}`}>
                          <button className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteId(wp.id)}
                          className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 text-center border-t border-slate-100">
          <Link href="/admin/wallpapers" className="text-sm text-violet-600 hover:text-violet-800 font-medium">
            View All Wallpapers →
          </Link>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Wallpaper"
        message="Are you sure you want to delete this wallpaper? This action cannot be undone."
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}

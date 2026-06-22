"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clapperboard,
  CheckCircle,
  FileText,
  HardDrive,
  Activity,
  FolderOpen,
  Pencil,
  Trash2,
  GripVertical,
  Plus,
} from "lucide-react";
import StatsCard from "@/components/admin/StatsCard";
import PageHeader from "@/components/admin/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { PageLoader, EmptyState } from "@/components/ui/LoadingSpinner";
import AnimationThumbnail from "@/components/admin/AnimationThumbnail";
import { formatFileSize, formatDate, cn } from "@/lib/utils";
import { DashboardStats, Animation } from "@/types/animation";
import { ConfirmModal } from "@/components/ui/Modal";
import { APP, THEME } from "@/config/app";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/animations?limit=8").then((r) => r.json()),
    ]).then(([statsRes, animationsRes]) => {
      if (statsRes.success) setStats(statsRes.data);
      if (animationsRes.success) setAnimations(animationsRes.data.animations);
      setLoading(false);
    });
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/animations/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setAnimations((prev) => prev.filter((a) => a.id !== deleteId));
        toast.success("Animation deleted");
      } else toast.error(data.message);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <div
        className={cn(
          "rounded-2xl p-6 lg:p-8 mb-6 lg:mb-8 text-white relative overflow-hidden shadow-premium-lg",
          "bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-700"
        )}
      >
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl" />
        <div className="relative">
          <p className="text-violet-200 text-sm font-semibold mb-1.5 tracking-wide">{APP.name}</p>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Welcome back, Admin</h2>
          <p className="text-violet-100/90 mt-2.5 text-sm max-w-xl leading-relaxed">
            Manage animations, control publish order, and monitor your Animation API from one
            premium dashboard.
          </p>
        </div>
      </div>

      <PageHeader title="Dashboard" subtitle="Overview of your Animation API content and activity." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatsCard
          title="Total Animations"
          value={stats?.totalAnimations || 0}
          icon={Clapperboard}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatsCard
          title="Published"
          value={stats?.publishedAnimations || 0}
          icon={CheckCircle}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatsCard
          title="Drafts"
          value={stats?.draftAnimations || 0}
          icon={FileText}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatsCard
          title="Categories"
          value={stats?.totalCategories || 0}
          icon={FolderOpen}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatsCard
          title="Storage Used"
          value={formatFileSize(stats?.storageUsed || 0)}
          icon={HardDrive}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <StatsCard
          title="API Status"
          value={stats?.apiStatus || "Active"}
          icon={Activity}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          subtitle="Running smoothly"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-premium overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-200/70">
          <div>
            <h3 className="font-semibold text-slate-900">Recent Animations</h3>
            <p className="text-xs text-slate-500 mt-0.5">Sorted by display order</p>
          </div>
          <Link href={"/admin/animations"}>
            <Button variant="outline" size="sm">View All Animations</Button>
          </Link>
        </div>
        {animations.length === 0 ? (
          <EmptyState
            title="No animations yet"
            description="Upload your first animation to start building your Animation API library."
            icon={<Clapperboard className="w-8 h-8 text-violet-400" />}
            action={
              <Link href={`${"/admin/animations"}/add`}>
                <Button className="mt-2 gap-1.5">
                  <Plus className="w-4 h-4" /> Add Animation
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-5 py-3 w-16">
                    Order
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-5 py-3">
                    Preview
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-5 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-5 py-3 hidden sm:table-cell">
                    Category
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-5 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-5 py-3 hidden md:table-cell">
                    Created
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {animations.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-50 table-row-hover hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg">
                        <GripVertical className="w-3 h-3 opacity-50" /> {item.order}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-100 ring-1 ring-slate-200/60 shadow-sm">
                        <AnimationThumbnail
                          url={item.url}
                          thumbnailUrl={item.thumbnailUrl}
                          fileName={item.fileName}
                          name={item.name}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">{item.name}</td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      {item.category?.name ? (
                        <Badge variant="info">{item.category.name}</Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={item.status === "Published" ? "success" : "warning"}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500 hidden md:table-cell">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-0.5">
                        <Link href={`${"/admin/animations"}/edit/${item.id}`}>
                          <button
                            className={`p-2 rounded-lg ${THEME.link} hover:bg-violet-50 transition-colors`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
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
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Animation"
        message="Are you sure you want to delete this animation?"
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}


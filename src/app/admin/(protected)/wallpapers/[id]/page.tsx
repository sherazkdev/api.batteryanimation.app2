"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Upload,
  Trash2,
  Expand,
  Eye,
  Download,
  BarChart3,
  Globe,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import CopyButton from "@/components/ui/CopyButton";
import Card from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ConfirmModal } from "@/components/ui/Modal";
import VideoPreview from "@/components/admin/VideoPreview";
import { resolveMediaUrl } from "@/lib/media-url";
import StatsCard from "@/components/admin/StatsCard";
import { formatFileSize, formatDate, parseTags, formatDuration } from "@/lib/utils";
import { Wallpaper } from "@/types/wallpaper";
import toast from "react-hot-toast";

export default function WallpaperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [wallpaper, setWallpaper] = useState<Wallpaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("downloads");

  useEffect(() => {
    fetch(`/api/admin/wallpapers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setWallpaper(data.data);
        else { toast.error("Not found"); router.push("/admin/wallpapers"); }
        setLoading(false);
      });
  }, [id, router]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/wallpapers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Deleted");
        router.push("/admin/wallpapers");
      } else toast.error(data.message);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!wallpaper) return null;

  const tags = parseTags(wallpaper.tags);
  const shortcode = `[wallpaper id="${wallpaper.id}"]`;
  const mediaUrl = resolveMediaUrl(wallpaper.url) || wallpaper.url;

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/wallpapers" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
          <ArrowLeft className="w-4 h-4" /> Back to Wallpapers
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{wallpaper.name}</h1>
            <Badge variant={wallpaper.status === "Published" ? "success" : "warning"}>{wallpaper.status}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">{wallpaper.fileName}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/admin/wallpapers/edit/${id}`}>
            <Button variant="outline" size="sm" className="gap-1.5"><Pencil className="w-4 h-4" /> Edit</Button>
          </Link>
          <Link href={`/admin/wallpapers/edit/${id}`}>
            <Button variant="outline" size="sm" className="gap-1.5"><Upload className="w-4 h-4" /> Replace Video</Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)} className="gap-1.5">
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Preview */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding={false} className="overflow-hidden">
            <div className="relative aspect-video bg-slate-100">
              <VideoPreview src={wallpaper.url} poster={wallpaper.thumbnailUrl || undefined} controls className="w-full h-full object-cover" />
              <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="absolute top-3 right-3">
                <Button variant="outline" size="sm" className="gap-1.5 bg-white/90 backdrop-blur-sm">
                  <Expand className="w-4 h-4" /> View Full Size
                </Button>
              </a>
            </div>
            <div className="grid grid-cols-4 divide-x divide-slate-200 border-t border-slate-200">
              {[
                { label: "Format", value: wallpaper.format },
                { label: "Resolution", value: `${wallpaper.width} x ${wallpaper.height}` },
                { label: "File Size", value: formatFileSize(wallpaper.fileSize) },
                { label: "Duration", value: formatDuration(wallpaper.duration) },
              ].map(({ label, value }) => (
                <div key={label} className="p-4 text-center">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Views" value="—" icon={Eye} iconColor="text-blue-600" iconBg="bg-blue-50" />
            <StatsCard title="Total Downloads" value="—" icon={Download} iconColor="text-green-600" iconBg="bg-green-50" />
            <StatsCard title="API Requests" value="—" icon={BarChart3} iconColor="text-purple-600" iconBg="bg-purple-50" />
            <StatsCard title="Bandwidth Used" value="—" icon={Globe} iconColor="text-orange-600" iconBg="bg-orange-50" />
          </div>
        </div>

        {/* Details Card */}
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4">Wallpaper Details</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Order</p>
              <p className="text-sm font-semibold text-slate-800">#{wallpaper.order}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">ID</p>
              <p className="text-sm font-mono text-slate-800">{wallpaper.id}</p>
            </div>
            {tags.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="info">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <div className="flex items-center gap-2">
                <Badge variant={wallpaper.status === "Published" ? "success" : "warning"}>{wallpaper.status}</Badge>
                <span className="text-xs text-slate-500">{wallpaper.status === "Published" ? "Visible in API" : "Not visible in API"}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Created At</p>
              <p className="text-sm text-slate-800">{formatDate(wallpaper.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Updated At</p>
              <p className="text-sm text-slate-800">{formatDate(wallpaper.updatedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">File Name</p>
              <p className="text-sm text-slate-800">{wallpaper.fileName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">File URL</p>
              <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-600 truncate flex-1">{mediaUrl}</p>
                <CopyButton text={mediaUrl} label="URL" />
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Shortcode</p>
              <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-xs font-mono text-slate-700 truncate flex-1">{shortcode}</p>
                <CopyButton text={shortcode} label="Shortcode" />
              </div>
            </div>
            {wallpaper.description && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Description</p>
                <p className="text-sm text-slate-700">{wallpaper.description}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <ConfirmModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Wallpaper"
        message="Are you sure you want to delete this wallpaper?"
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}

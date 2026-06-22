"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Expand } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import CopyButton from "@/components/ui/CopyButton";
import Card from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ConfirmModal } from "@/components/ui/Modal";
import VideoPreview from "@/components/admin/VideoPreview";
import { getPublicMediaUrl, resolveMediaUrl } from "@/lib/media-url";
import { formatFileSize, formatDate, parseTags, formatDuration } from "@/lib/utils";
import { Animation } from "@/types/animation";
import { APP, THEME } from "@/config/app";
import toast from "react-hot-toast";

export default function AnimationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<Animation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/animations/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setItem(data.data);
        else { toast.error("Animation not found"); router.push("/admin/animations"); }
        setLoading(false);
      });
  }, [id, router]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/animations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("Animation deleted"); router.push("/admin/animations"); }
      else toast.error(data.message);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!item) return null;

  const tags = parseTags(item.tags);
  const shortcode = `[animation id="${item.id}"]`;
  const previewUrl = resolveMediaUrl(item.url, { fileName: item.fileName, kind: "video" }) || item.url;
  const publicMediaUrl = getPublicMediaUrl(item.url, { fileName: item.fileName, kind: "video" }) || previewUrl;

  return (
    <div>
      <div className="mb-5">
        <Link href={"/admin/animations"} className={`inline-flex items-center gap-1.5 text-sm font-medium ${THEME.link} ${THEME.linkHover}`}>
          <ArrowLeft className="w-4 h-4" /> Back to Animations
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">{item.name}</h1>
            <Badge variant={item.status === "Published" ? "success" : "warning"}>{item.status}</Badge>
            <Badge variant="info">Order #{item.order}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1.5">{item.fileName}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`${"/admin/animations"}/edit/${id}`}><Button variant="outline" size="sm" className="gap-1.5"><Pencil className="w-4 h-4" /> Edit</Button></Link>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)} className="gap-1.5"><Trash2 className="w-4 h-4" /> Delete</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card padding={false} className="overflow-hidden">
            <div className="relative aspect-video bg-slate-100">
              <VideoPreview src={item.url} poster={item.thumbnailUrl || undefined} controls className="w-full h-full object-cover" />
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="absolute top-3 right-3">
                <Button variant="outline" size="sm" className="gap-1.5 bg-white/95 backdrop-blur-sm"><Expand className="w-4 h-4" /> View Full Size</Button>
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200/80 border-t border-slate-200/80">
              {[
                { label: "Format", value: item.format },
                { label: "Resolution", value: `${item.width} x ${item.height}` },
                { label: "File Size", value: formatFileSize(item.fileSize) },
                { label: "Duration", value: formatDuration(item.duration) },
              ].map(({ label, value }) => (
                <div key={label} className="p-4 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <h3 className="font-semibold text-slate-900 mb-4">Animation Details</h3>
          <div className="space-y-4">
            <div><p className="text-xs font-medium text-slate-500 mb-1">ID</p><p className="text-sm font-mono text-slate-800 break-all">{item.id}</p></div>
            {tags.length > 0 && (
              <div><p className="text-xs font-medium text-slate-500 mb-2">Tags</p><div className="flex flex-wrap gap-1.5">{tags.map((tag) => <Badge key={tag} variant="info">{tag}</Badge>)}</div></div>
            )}
            <div><p className="text-xs font-medium text-slate-500 mb-1">Created At</p><p className="text-sm text-slate-800">{formatDate(item.createdAt)}</p></div>
            <div><p className="text-xs font-medium text-slate-500 mb-1">Updated At</p><p className="text-sm text-slate-800">{formatDate(item.updatedAt)}</p></div>
            <div><p className="text-xs font-medium text-slate-500 mb-1">File URL</p><div className="flex items-center gap-1 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200/60"><p className={`text-xs ${THEME.link} truncate flex-1`}>{publicMediaUrl}</p><CopyButton text={publicMediaUrl} label="URL" /></div></div>
            <div><p className="text-xs font-medium text-slate-500 mb-1">Shortcode</p><div className="flex items-center gap-1 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200/60"><p className="text-xs font-mono text-slate-700 truncate flex-1">{shortcode}</p><CopyButton text={shortcode} label="Shortcode" /></div></div>
            {item.description && <div><p className="text-xs font-medium text-slate-500 mb-1">Description</p><p className="text-sm text-slate-700 leading-relaxed">{item.description}</p></div>}
          </div>
        </Card>
      </div>

      <ConfirmModal isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Animation" message="Are you sure you want to delete this animation?" confirmText="Delete" loading={deleting} />
    </div>
  );
}

